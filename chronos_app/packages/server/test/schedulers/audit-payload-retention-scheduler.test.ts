/**
 * Unit tests for the audit payload retention scheduler
 * (`schedulers/AuditPayloadRetentionScheduler.ts`).
 *
 * Covers: start/stop, no-double-start guard, non-overlapping-poll guard,
 * env-var driven retention window + sweep interval, no-immediate-sweep on
 * start, sweep failures swallowed by the safe wrapper do not break the
 * scheduler.
 */
export function auditPayloadRetentionSchedulerTest() {
    describe('AuditPayloadRetentionScheduler', () => {
        let AuditPayloadRetentionScheduler: any
        let runPayloadRetentionSweepSafeMock: jest.Mock
        let mockDataSource: any

        const setupMocks = () => {
            jest.doMock('../../src/services/audit/payload-retention', () => ({
                runPayloadRetentionSweepSafe: runPayloadRetentionSweepSafeMock
            }))
        }

        beforeEach(() => {
            jest.resetModules()
            delete process.env.AUDIT_PAYLOAD_RETENTION_DAYS
            delete process.env.AUDIT_PAYLOAD_RETENTION_SWEEP_INTERVAL_MS

            runPayloadRetentionSweepSafeMock = jest.fn().mockResolvedValue({ cutoff: new Date(), rowsAffected: 0 })
            mockDataSource = { getRepository: jest.fn() }

            setupMocks()
            AuditPayloadRetentionScheduler = require('../../src/schedulers/AuditPayloadRetentionScheduler').AuditPayloadRetentionScheduler
        })

        afterEach(() => {
            jest.dontMock('../../src/services/audit/payload-retention')
        })

        const createScheduler = () => new AuditPayloadRetentionScheduler({ appDataSource: mockDataSource })

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
                expect(runPayloadRetentionSweepSafeMock).not.toHaveBeenCalled()
                scheduler.stop()
            })
        })

        // ─── poll ─────────────────────────────────────────────────────

        describe('poll', () => {
            it('passes the default retentionDays=90 to the sweeper', async () => {
                const scheduler = createScheduler()
                await (scheduler as any).poll()
                expect(runPayloadRetentionSweepSafeMock).toHaveBeenCalledWith({
                    appDataSource: mockDataSource,
                    retentionDays: 90
                })
            })

            it('honours AUDIT_PAYLOAD_RETENTION_DAYS env override', async () => {
                process.env.AUDIT_PAYLOAD_RETENTION_DAYS = '30'
                const scheduler = createScheduler()
                await (scheduler as any).poll()
                expect(runPayloadRetentionSweepSafeMock).toHaveBeenCalledWith({
                    appDataSource: mockDataSource,
                    retentionDays: 30
                })
            })

            it('falls back to default when AUDIT_PAYLOAD_RETENTION_DAYS is non-numeric', async () => {
                process.env.AUDIT_PAYLOAD_RETENTION_DAYS = 'forever'
                const scheduler = createScheduler()
                await (scheduler as any).poll()
                expect(runPayloadRetentionSweepSafeMock).toHaveBeenCalledWith({
                    appDataSource: mockDataSource,
                    retentionDays: 90
                })
            })

            it('skips overlapping polls', async () => {
                const scheduler = createScheduler()
                ;(scheduler as any).running = true
                await (scheduler as any).poll()
                expect(runPayloadRetentionSweepSafeMock).not.toHaveBeenCalled()
            })

            it('resets running flag after each poll', async () => {
                const scheduler = createScheduler()
                await (scheduler as any).poll()
                expect((scheduler as any).running).toBe(false)
            })

            it('does not propagate sweeper rejections (safe wrapper returns null)', async () => {
                runPayloadRetentionSweepSafeMock.mockResolvedValueOnce(null)
                const scheduler = createScheduler()
                await expect((scheduler as any).poll()).resolves.toBeUndefined()
                expect((scheduler as any).running).toBe(false)
            })
        })

        // ─── env interval ─────────────────────────────────────────────

        describe('sweep interval env override', () => {
            it('accepts AUDIT_PAYLOAD_RETENTION_SWEEP_INTERVAL_MS without throwing on start', () => {
                process.env.AUDIT_PAYLOAD_RETENTION_SWEEP_INTERVAL_MS = '3600000'
                const scheduler = createScheduler()
                scheduler.start()
                expect((scheduler as any).intervalId).not.toBeNull()
                scheduler.stop()
            })
        })
    })
}
