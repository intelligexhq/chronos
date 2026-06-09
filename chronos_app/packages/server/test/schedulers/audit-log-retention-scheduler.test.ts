/**
 * Unit tests for the audit log retention scheduler
 * (`schedulers/AuditLogRetentionScheduler.ts`).
 *
 * Covers: start/stop, no-double-start guard, non-overlapping-poll guard,
 * constructor-supplied retention window threaded through to the sweeper,
 * env-driven sweep interval, no-immediate-sweep on start, sweep failures
 * swallowed by the safe wrapper do not break the scheduler.
 */
export function auditLogRetentionSchedulerTest() {
    describe('AuditLogRetentionScheduler', () => {
        let AuditLogRetentionScheduler: any
        let runLogRetentionSweepSafeMock: jest.Mock
        let mockDataSource: any

        const setupMocks = () => {
            jest.doMock('../../src/services/audit/log-retention', () => ({
                runLogRetentionSweepSafe: runLogRetentionSweepSafeMock
            }))
        }

        beforeEach(() => {
            jest.resetModules()
            delete process.env.AUDIT_LOG_RETENTION_SWEEP_INTERVAL_MS

            runLogRetentionSweepSafeMock = jest.fn().mockResolvedValue({
                cutoff: new Date(),
                toolInvocationRowsDeleted: 0,
                credentialAccessRowsDeleted: 0
            })
            mockDataSource = { getRepository: jest.fn() }

            setupMocks()
            AuditLogRetentionScheduler = require('../../src/schedulers/AuditLogRetentionScheduler').AuditLogRetentionScheduler
        })

        afterEach(() => {
            jest.dontMock('../../src/services/audit/log-retention')
        })

        const createScheduler = (retentionDays: number = 90) =>
            new AuditLogRetentionScheduler({ appDataSource: mockDataSource, retentionDays })

        // ─── start/stop ────────────────────────────────────────────────

        describe('start/stop', () => {
            it('starts and stops without errors', () => {
                const scheduler = createScheduler()
                scheduler.start()
                expect((scheduler as any).intervalId).not.toBeNull()
                scheduler.stop()
                expect((scheduler as any).intervalId).toBeNull()
            })

            it('does not start twice', () => {
                const scheduler = createScheduler()
                scheduler.start()
                const first = (scheduler as any).intervalId
                scheduler.start()
                expect((scheduler as any).intervalId).toBe(first)
                scheduler.stop()
            })

            it('does NOT fire a sweep immediately on start (waits one interval)', () => {
                const scheduler = createScheduler()
                scheduler.start()
                expect(runLogRetentionSweepSafeMock).not.toHaveBeenCalled()
                scheduler.stop()
            })
        })

        // ─── poll ─────────────────────────────────────────────────────

        describe('poll', () => {
            it('passes the constructor retentionDays to the sweeper', async () => {
                const scheduler = createScheduler(45)
                await (scheduler as any).poll()
                expect(runLogRetentionSweepSafeMock).toHaveBeenCalledWith({
                    appDataSource: mockDataSource,
                    retentionDays: 45
                })
            })

            it('skips overlapping polls', async () => {
                const scheduler = createScheduler()
                ;(scheduler as any).running = true
                await (scheduler as any).poll()
                expect(runLogRetentionSweepSafeMock).not.toHaveBeenCalled()
            })

            it('resets running flag after each poll', async () => {
                const scheduler = createScheduler()
                await (scheduler as any).poll()
                expect((scheduler as any).running).toBe(false)
            })

            it('does not propagate sweeper rejections (safe wrapper returns null)', async () => {
                runLogRetentionSweepSafeMock.mockResolvedValueOnce(null)
                const scheduler = createScheduler()
                await expect((scheduler as any).poll()).resolves.toBeUndefined()
                expect((scheduler as any).running).toBe(false)
            })
        })

        // ─── env interval ─────────────────────────────────────────────

        describe('sweep interval env override', () => {
            it('accepts AUDIT_LOG_RETENTION_SWEEP_INTERVAL_MS without throwing on start', () => {
                process.env.AUDIT_LOG_RETENTION_SWEEP_INTERVAL_MS = '3600000'
                const scheduler = createScheduler()
                scheduler.start()
                expect((scheduler as any).intervalId).not.toBeNull()
                scheduler.stop()
            })
        })
    })
}
