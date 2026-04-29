import { StatusCodes } from 'http-status-codes'
import { createMockRepository, createMockQueryBuilder } from '../mocks/appServer.mock'

/**
 * Test suite for the agentflow-versions service.
 *
 * Covers publish, rollback, list, and get with the validation rules and
 * ownership checks documented in the v1.5.0 plan.
 */
export function agentflowVersionsServiceTest() {
    describe('Agentflow Versions Service', () => {
        let agentflowVersionsService: any
        let agentflowRepo: ReturnType<typeof createMockRepository>
        let versionRepo: ReturnType<typeof createMockRepository>
        let mockAppServer: any

        const ADMIN = { userId: 'admin-1', role: 'admin' as const, userEmail: 'a@b.c' }
        const OWNER = { userId: 'user-1', role: 'user' as const, userEmail: 'o@b.c' }
        const STRANGER = { userId: 'user-2', role: 'user' as const, userEmail: 's@b.c' }

        const buildAgentflow = (overrides: any = {}) => ({
            id: 'flow-1',
            name: 'flow',
            flowData: JSON.stringify({ nodes: [], edges: [] }),
            chatbotConfig: '{"a":1}',
            apiConfig: null,
            analytic: null,
            speechToText: null,
            textToSpeech: null,
            followUpPrompts: null,
            userId: OWNER.userId,
            currentVersion: null,
            publishedVersionId: null,
            ...overrides
        })

        beforeAll(() => {
            jest.resetModules()

            agentflowRepo = createMockRepository()
            versionRepo = createMockRepository()
            const queryBuilder = createMockQueryBuilder()
            versionRepo.createQueryBuilder.mockReturnValue(queryBuilder)

            const repoFor = (entity: any) => {
                const name = typeof entity === 'function' ? entity.name : entity
                if (name === 'AgentFlow') return agentflowRepo
                if (name === 'AgentflowVersion') return versionRepo
                return createMockRepository()
            }

            mockAppServer = {
                AppDataSource: {
                    getRepository: jest.fn(repoFor),
                    transaction: jest.fn(async (cb: any) =>
                        cb({
                            getRepository: jest.fn(repoFor)
                        })
                    )
                },
                telemetry: { sendTelemetry: jest.fn().mockResolvedValue(undefined) }
            }

            jest.doMock('../../src/utils/getRunningExpressApp', () => ({
                getRunningExpressApp: jest.fn(() => mockAppServer)
            }))

            agentflowVersionsService = require('../../src/services/agentflow-versions').default
        })

        afterAll(() => {
            jest.resetModules()
        })

        beforeEach(() => {
            jest.clearAllMocks()
        })

        // ─── publishAgentflow ───────────────────────────────────────────

        describe('publishAgentflow', () => {
            it('creates v1 when no prior versions exist', async () => {
                const flow = buildAgentflow()
                agentflowRepo.findOneBy.mockResolvedValue(flow)
                versionRepo.save.mockImplementation(async (row: any) => ({ id: 'ver-1', ...row }))
                agentflowRepo.update.mockResolvedValue({ affected: 1 })

                const result = await agentflowVersionsService.publishAgentflow(flow.id, { notes: 'hello' }, OWNER)

                expect(result.version).toBe(1)
                expect(versionRepo.create).toHaveBeenCalledWith(
                    expect.objectContaining({
                        agentflowId: flow.id,
                        version: 1,
                        flowData: flow.flowData,
                        chatbotConfig: flow.chatbotConfig,
                        notes: 'hello',
                        publishedBy: OWNER.userId
                    })
                )
                expect(agentflowRepo.update).toHaveBeenCalledWith(
                    { id: flow.id },
                    expect.objectContaining({
                        publishedFlowData: flow.flowData,
                        publishedVersionId: 'ver-1',
                        currentVersion: 1
                    })
                )
            })

            it('increments version monotonically', async () => {
                const flow = buildAgentflow({ currentVersion: 4 })
                agentflowRepo.findOneBy.mockResolvedValue(flow)
                versionRepo.save.mockImplementation(async (row: any) => ({ id: 'ver-5', ...row }))
                agentflowRepo.update.mockResolvedValue({ affected: 1 })

                const result = await agentflowVersionsService.publishAgentflow(flow.id, {}, OWNER)
                expect(result.version).toBe(5)
            })

            it('rejects unparseable flowData', async () => {
                agentflowRepo.findOneBy.mockResolvedValue(buildAgentflow({ flowData: 'not-json' }))
                await expect(agentflowVersionsService.publishAgentflow('flow-1', {}, OWNER)).rejects.toMatchObject({
                    statusCode: StatusCodes.BAD_REQUEST
                })
            })

            it('rejects empty flowData', async () => {
                agentflowRepo.findOneBy.mockResolvedValue(buildAgentflow({ flowData: '' }))
                await expect(agentflowVersionsService.publishAgentflow('flow-1', {}, OWNER)).rejects.toMatchObject({
                    statusCode: StatusCodes.BAD_REQUEST
                })
            })

            it('rejects notes exceeding 1000 chars', async () => {
                agentflowRepo.findOneBy.mockResolvedValue(buildAgentflow())
                await expect(agentflowVersionsService.publishAgentflow('flow-1', { notes: 'a'.repeat(1001) }, OWNER)).rejects.toMatchObject(
                    { statusCode: StatusCodes.BAD_REQUEST }
                )
            })

            it('forbids non-owner non-admin', async () => {
                agentflowRepo.findOneBy.mockResolvedValue(buildAgentflow())
                await expect(agentflowVersionsService.publishAgentflow('flow-1', {}, STRANGER)).rejects.toMatchObject({
                    statusCode: StatusCodes.FORBIDDEN
                })
            })

            it('allows admin on any agentflow', async () => {
                agentflowRepo.findOneBy.mockResolvedValue(buildAgentflow())
                versionRepo.save.mockImplementation(async (row: any) => ({ id: 'ver-1', ...row }))
                await expect(agentflowVersionsService.publishAgentflow('flow-1', {}, ADMIN)).resolves.toBeDefined()
            })

            it('returns 404 if agentflow does not exist', async () => {
                agentflowRepo.findOneBy.mockResolvedValue(null)
                await expect(agentflowVersionsService.publishAgentflow('missing', {}, OWNER)).rejects.toMatchObject({
                    statusCode: StatusCodes.NOT_FOUND
                })
            })
        })

        // ─── rollbackAgentflow ──────────────────────────────────────────

        describe('rollbackAgentflow', () => {
            it('repoints publishedFlowData and publishedVersionId without changing currentVersion', async () => {
                const flow = buildAgentflow({ currentVersion: 5, publishedVersionId: 'ver-5' })
                const target = { id: 'ver-2', agentflowId: flow.id, version: 2, flowData: '{"old":true}' }
                agentflowRepo.findOneBy.mockResolvedValueOnce(flow).mockResolvedValueOnce({ ...flow, publishedVersionId: 'ver-2' })
                versionRepo.findOneBy.mockResolvedValue(target)
                agentflowRepo.update.mockResolvedValue({ affected: 1 })

                await agentflowVersionsService.rollbackAgentflow(flow.id, 2, OWNER)

                expect(agentflowRepo.update).toHaveBeenCalledWith(
                    { id: flow.id },
                    expect.objectContaining({
                        publishedFlowData: target.flowData,
                        publishedVersionId: target.id
                    })
                )
                const updateArgs = agentflowRepo.update.mock.calls[0][1]
                expect(updateArgs).not.toHaveProperty('currentVersion')
            })

            it('returns 404 when version does not exist', async () => {
                agentflowRepo.findOneBy.mockResolvedValue(buildAgentflow())
                versionRepo.findOneBy.mockResolvedValue(null)
                await expect(agentflowVersionsService.rollbackAgentflow('flow-1', 99, OWNER)).rejects.toMatchObject({
                    statusCode: StatusCodes.NOT_FOUND
                })
            })

            it('returns 400 when target equals already-published version', async () => {
                const flow = buildAgentflow({ publishedVersionId: 'ver-2', currentVersion: 5 })
                agentflowRepo.findOneBy.mockResolvedValue(flow)
                versionRepo.findOneBy.mockResolvedValue({
                    id: 'ver-2',
                    agentflowId: flow.id,
                    version: 2,
                    flowData: '{}'
                })
                await expect(agentflowVersionsService.rollbackAgentflow('flow-1', 2, OWNER)).rejects.toMatchObject({
                    statusCode: StatusCodes.BAD_REQUEST
                })
            })

            it('returns 400 for non-positive version numbers', async () => {
                await expect(agentflowVersionsService.rollbackAgentflow('flow-1', 0, OWNER)).rejects.toMatchObject({
                    statusCode: StatusCodes.BAD_REQUEST
                })
                await expect(agentflowVersionsService.rollbackAgentflow('flow-1', -1, OWNER)).rejects.toMatchObject({
                    statusCode: StatusCodes.BAD_REQUEST
                })
            })

            it('forbids non-owner', async () => {
                agentflowRepo.findOneBy.mockResolvedValue(buildAgentflow())
                await expect(agentflowVersionsService.rollbackAgentflow('flow-1', 1, STRANGER)).rejects.toMatchObject({
                    statusCode: StatusCodes.FORBIDDEN
                })
            })
        })

        // ─── getAgentflowVersions ───────────────────────────────────────

        describe('getAgentflowVersions', () => {
            it('returns array when no pagination', async () => {
                const flow = buildAgentflow()
                agentflowRepo.findOneBy.mockResolvedValue(flow)
                const qb = createMockQueryBuilder()
                qb.getManyAndCount.mockResolvedValue([[{ id: 'v1' }, { id: 'v2' }], 2])
                versionRepo.createQueryBuilder.mockReturnValue(qb)

                const result = await agentflowVersionsService.getAgentflowVersions('flow-1', -1, -1, OWNER)
                expect(Array.isArray(result)).toBe(true)
                expect(qb.orderBy).toHaveBeenCalledWith('agentflow_version.version', 'DESC')
            })

            it('returns paginated shape when page+limit set', async () => {
                agentflowRepo.findOneBy.mockResolvedValue(buildAgentflow())
                const qb = createMockQueryBuilder()
                qb.getManyAndCount.mockResolvedValue([[{ id: 'v1' }], 5])
                versionRepo.createQueryBuilder.mockReturnValue(qb)

                const result = await agentflowVersionsService.getAgentflowVersions('flow-1', 1, 10, OWNER)
                expect(result).toEqual({ data: [{ id: 'v1' }], total: 5 })
                expect(qb.skip).toHaveBeenCalledWith(0)
                expect(qb.take).toHaveBeenCalledWith(10)
            })

            it('forbids non-owner', async () => {
                agentflowRepo.findOneBy.mockResolvedValue(buildAgentflow())
                await expect(agentflowVersionsService.getAgentflowVersions('flow-1', -1, -1, STRANGER)).rejects.toMatchObject({
                    statusCode: StatusCodes.FORBIDDEN
                })
            })
        })

        // ─── getAgentflowVersion ────────────────────────────────────────

        describe('getAgentflowVersion', () => {
            it('returns the version row', async () => {
                agentflowRepo.findOneBy.mockResolvedValue(buildAgentflow())
                const target = { id: 'ver-2', agentflowId: 'flow-1', version: 2, flowData: '{}' }
                versionRepo.findOneBy.mockResolvedValue(target)
                const result = await agentflowVersionsService.getAgentflowVersion('flow-1', 2, OWNER)
                expect(result).toEqual(target)
            })

            it('404 when missing', async () => {
                agentflowRepo.findOneBy.mockResolvedValue(buildAgentflow())
                versionRepo.findOneBy.mockResolvedValue(null)
                await expect(agentflowVersionsService.getAgentflowVersion('flow-1', 2, OWNER)).rejects.toMatchObject({
                    statusCode: StatusCodes.NOT_FOUND
                })
            })

            it('400 when version is not a positive integer', async () => {
                await expect(agentflowVersionsService.getAgentflowVersion('flow-1', 0, OWNER)).rejects.toMatchObject({
                    statusCode: StatusCodes.BAD_REQUEST
                })
            })
        })
    })
}
