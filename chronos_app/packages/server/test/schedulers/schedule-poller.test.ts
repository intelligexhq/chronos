import { SchedulePoller } from '../../src/schedulers/SchedulePoller'
import { Schedule } from '../../src/database/entities/Schedule'
import * as buildAgentflow from '../../src/utils/buildAgentflow'

function mockSchedule(overrides: Partial<Schedule> = {}): Schedule {
    return {
        id: 'sched-1',
        name: 'Test Schedule',
        cronExpression: '*/5 * * * *',
        timezone: 'UTC',
        agentflowId: 'flow-1',
        inputPayload: undefined,
        enabled: true,
        lastRunDate: undefined,
        nextRunDate: new Date('2026-01-01T00:00:00Z'),
        lastRunStatus: undefined,
        userId: undefined,
        createdDate: new Date(),
        updatedDate: new Date(),
        agentflow: {} as any,
        ...overrides
    } as Schedule
}

/**
 * Test suite for SchedulePoller (DB polling scheduler)
 * Tests claim logic, poll cycle, and double-fire prevention.
 *
 * Uses the real logger (already loaded by server) and mocks only
 * executeFlow and SSEStreamer via jest.mock at the top level.
 */

export function schedulePollerTest() {
    describe('SchedulePoller', () => {
        let mockDataSource: any
        let executeFlowSpy: jest.SpyInstance
        let mockScheduleRepo: any
        let mockAgentflowRepo: any
        let mockExecutionRepo: any
        let mockQueryBuilder: any

        afterEach(() => {
            executeFlowSpy?.mockRestore()
        })

        beforeEach(() => {
            jest.clearAllMocks()
            executeFlowSpy = jest.spyOn(buildAgentflow, 'executeFlow').mockResolvedValue({ text: 'result' } as any)

            mockQueryBuilder = {
                update: jest.fn().mockReturnThis(),
                set: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                execute: jest.fn().mockResolvedValue({ affected: 1 })
            }

            mockScheduleRepo = {
                find: jest.fn().mockResolvedValue([]),
                findOneBy: jest.fn(),
                update: jest.fn().mockResolvedValue({ affected: 1 }),
                createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder)
            }

            mockAgentflowRepo = {
                findOneBy: jest.fn()
            }

            mockExecutionRepo = {
                update: jest.fn().mockResolvedValue({ affected: 1 })
            }

            mockDataSource = {
                getRepository: jest.fn((entity: any) => {
                    const name = entity.name || entity
                    if (name === 'Schedule') return mockScheduleRepo
                    if (name === 'AgentFlow') return mockAgentflowRepo
                    if (name === 'Execution') return mockExecutionRepo
                    return mockScheduleRepo
                })
            }
        })

        const createPoller = () => {
            return new SchedulePoller({
                appDataSource: mockDataSource,
                componentNodes: {},
                telemetry: { sendTelemetry: jest.fn() } as any,
                cachePool: {} as any,
                usageCacheManager: {} as any
            })
        }

        describe('start/stop', () => {
            it('should start and stop without errors', () => {
                const poller = createPoller()
                poller.start()
                expect(poller['intervalId']).not.toBeNull()
                poller.stop()
                expect(poller['intervalId']).toBeNull()
            })

            it('should not start twice', () => {
                const poller = createPoller()
                poller.start()
                const firstInterval = poller['intervalId']
                poller.start()
                expect(poller['intervalId']).toBe(firstInterval)
                poller.stop()
            })
        })

        describe('poll', () => {
            it('should query for due schedules', async () => {
                const poller = createPoller()
                await poller['poll']()

                expect(mockDataSource.getRepository).toHaveBeenCalled()
                expect(mockScheduleRepo.find).toHaveBeenCalledWith(
                    expect.objectContaining({
                        where: expect.objectContaining({
                            enabled: true
                        })
                    })
                )
            })

            it('should not overlap polls', async () => {
                const poller = createPoller()
                poller['running'] = true
                await poller['poll']()

                expect(mockScheduleRepo.find).not.toHaveBeenCalled()
            })

            it('should reset running flag after poll completes', async () => {
                const poller = createPoller()
                await poller['poll']()
                expect(poller['running']).toBe(false)
            })

            it('should reset running flag even on error', async () => {
                mockScheduleRepo.find.mockRejectedValue(new Error('DB error'))
                const poller = createPoller()
                await poller['poll']()
                expect(poller['running']).toBe(false)
            })
        })

        describe('tryClaimSchedule (optimistic locking)', () => {
            it('should claim schedule when UPDATE affects 1 row', async () => {
                mockQueryBuilder.execute.mockResolvedValue({ affected: 1 })
                const poller = createPoller()

                const schedule = mockSchedule()

                const result = await poller['tryClaimSchedule'](schedule)
                expect(result).toBeInstanceOf(Date)
                expect(result!.getTime()).toBeGreaterThan(schedule.nextRunDate!.getTime())
            })

            it('should return null when another instance already claimed', async () => {
                mockQueryBuilder.execute.mockResolvedValue({ affected: 0 })
                const poller = createPoller()

                const schedule = mockSchedule()

                const result = await poller['tryClaimSchedule'](schedule)
                expect(result).toBeNull()
            })

            it('should disable schedule with invalid cron and return null', async () => {
                const poller = createPoller()

                const schedule = mockSchedule({ id: 'sched-bad', cronExpression: 'not-valid-cron' })

                const result = await poller['tryClaimSchedule'](schedule)
                expect(result).toBeNull()
                expect(mockScheduleRepo.update).toHaveBeenCalledWith('sched-bad', { enabled: false })
            })
        })

        describe('executeSchedule', () => {
            it('should skip execution when claim fails', async () => {
                mockQueryBuilder.execute.mockResolvedValue({ affected: 0 })
                const poller = createPoller()
                await poller['executeSchedule'](mockSchedule())

                expect(executeFlowSpy).not.toHaveBeenCalled()
            })

            it('should update lastRunStatus to ERROR when agentflow not found', async () => {
                mockQueryBuilder.execute.mockResolvedValue({ affected: 1 })
                mockAgentflowRepo.findOneBy.mockResolvedValue(null)
                const poller = createPoller()

                await poller['executeSchedule'](mockSchedule({ agentflowId: 'missing-flow' }))

                expect(mockScheduleRepo.update).toHaveBeenCalledWith(
                    'sched-1',
                    expect.objectContaining({
                        lastRunStatus: 'ERROR'
                    })
                )
            })

            it('should execute flow and update schedule on success', async () => {
                mockQueryBuilder.execute.mockResolvedValue({ affected: 1 })
                mockAgentflowRepo.findOneBy.mockResolvedValue({ id: 'flow-1', name: 'Test Flow', flowData: '{}' })
                const poller = createPoller()

                await poller['executeSchedule'](mockSchedule({ inputPayload: undefined }))

                expect(executeFlowSpy).toHaveBeenCalled()
                expect(mockScheduleRepo.update).toHaveBeenCalledWith(
                    'sched-1',
                    expect.objectContaining({
                        lastRunStatus: 'FINISHED'
                    })
                )
            })

            it('should mark ERROR when executeFlow throws', async () => {
                mockQueryBuilder.execute.mockResolvedValue({ affected: 1 })
                mockAgentflowRepo.findOneBy.mockResolvedValue({ id: 'flow-1', name: 'Test Flow', flowData: '{}' })
                executeFlowSpy.mockRejectedValueOnce(new Error('Flow failed'))
                const poller = createPoller()

                await poller['executeSchedule'](mockSchedule({ name: 'Failing Schedule' }))

                expect(mockScheduleRepo.update).toHaveBeenCalledWith(
                    'sched-1',
                    expect.objectContaining({
                        lastRunStatus: 'ERROR'
                    })
                )
            })

            it('should parse inputPayload JSON', async () => {
                mockQueryBuilder.execute.mockResolvedValue({ affected: 1 })
                mockAgentflowRepo.findOneBy.mockResolvedValue({ id: 'flow-1', name: 'Test Flow', flowData: '{}' })
                const poller = createPoller()

                await poller['executeSchedule'](mockSchedule({ inputPayload: '{"question": "daily report"}' }))

                expect(executeFlowSpy).toHaveBeenCalledWith(
                    expect.objectContaining({
                        incomingInput: expect.objectContaining({
                            question: 'daily report'
                        })
                    })
                )
            })
        })
    })
}
