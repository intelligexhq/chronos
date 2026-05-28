/**
 * Unit tests for the audit payload retention sweeper
 * (`services/audit/payload-retention.ts`).
 *
 * Covers: cutoff math against the configured retention window, single-pass
 * UPDATE shape, predicate skips rows that already have NULL payloads,
 * runOnce returns affected count, the swallow-and-log wrapper does not
 * propagate errors.
 */
export function auditPayloadRetentionSweeperTest() {
    describe('Audit Payload Retention Sweeper', () => {
        let runPayloadRetentionSweep: any
        let runPayloadRetentionSweepSafe: any
        let mockUpdateQB: any
        let mockRepo: any
        let mockDataSource: any

        beforeEach(() => {
            jest.resetModules()

            mockUpdateQB = {
                update: jest.fn().mockReturnThis(),
                set: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                execute: jest.fn().mockResolvedValue({ affected: 0 })
            }
            mockRepo = {
                createQueryBuilder: jest.fn().mockReturnValue(mockUpdateQB)
            }
            mockDataSource = {
                getRepository: jest.fn().mockReturnValue(mockRepo)
            }

            const mod = require('../../src/services/audit/payload-retention')
            runPayloadRetentionSweep = mod.runPayloadRetentionSweep
            runPayloadRetentionSweepSafe = mod.runPayloadRetentionSweepSafe
        })

        // ─── cutoff math ───────────────────────────────────────────────

        describe('cutoff math', () => {
            it('computes cutoff = now - retentionDays * 86_400_000', async () => {
                const before = Date.now()
                const result = await runPayloadRetentionSweep({ appDataSource: mockDataSource, retentionDays: 90 })
                const after = Date.now()

                const expectedMin = before - 90 * 86_400_000
                const expectedMax = after - 90 * 86_400_000
                expect(result.cutoff.getTime()).toBeGreaterThanOrEqual(expectedMin)
                expect(result.cutoff.getTime()).toBeLessThanOrEqual(expectedMax)
            })

            it('clamps non-finite retentionDays to a 1-day minimum', async () => {
                const result = await runPayloadRetentionSweep({
                    appDataSource: mockDataSource,
                    retentionDays: Number.NaN
                })
                const expected = Date.now() - 86_400_000
                // Allow generous slack — the body runs in <100ms in CI.
                expect(Math.abs(result.cutoff.getTime() - expected)).toBeLessThan(1_000)
            })

            it('clamps retentionDays < 1 to a 1-day minimum', async () => {
                const result = await runPayloadRetentionSweep({
                    appDataSource: mockDataSource,
                    retentionDays: 0
                })
                const expected = Date.now() - 86_400_000
                expect(Math.abs(result.cutoff.getTime() - expected)).toBeLessThan(1_000)
            })

            it('floors fractional retentionDays', async () => {
                const result = await runPayloadRetentionSweep({
                    appDataSource: mockDataSource,
                    retentionDays: 7.9
                })
                const expected = Date.now() - 7 * 86_400_000
                expect(Math.abs(result.cutoff.getTime() - expected)).toBeLessThan(1_000)
            })
        })

        // ─── UPDATE shape ──────────────────────────────────────────────

        describe('UPDATE statement shape', () => {
            it('sets requestPayload and responsePayload to SQL NULL', async () => {
                await runPayloadRetentionSweep({ appDataSource: mockDataSource, retentionDays: 90 })
                const setArg = mockUpdateQB.set.mock.calls[0][0]
                // TypeORM QueryBuilder accepts a function-returning-SQL fragment as
                // the NULL-literal idiom; both fields must evaluate to "NULL".
                expect(typeof setArg.requestPayload).toBe('function')
                expect(typeof setArg.responsePayload).toBe('function')
                expect(setArg.requestPayload()).toBe('NULL')
                expect(setArg.responsePayload()).toBe('NULL')
            })

            it('filters on createdDate < cutoff', async () => {
                await runPayloadRetentionSweep({ appDataSource: mockDataSource, retentionDays: 30 })
                const [whereClause, whereParams] = mockUpdateQB.where.mock.calls[0]
                expect(whereClause).toBe('createdDate < :cutoff')
                expect(whereParams.cutoff).toBeInstanceOf(Date)
            })

            it('skips rows whose payload columns are already NULL', async () => {
                await runPayloadRetentionSweep({ appDataSource: mockDataSource, retentionDays: 30 })
                expect(mockUpdateQB.andWhere).toHaveBeenCalledWith('(requestPayload IS NOT NULL OR responsePayload IS NOT NULL)')
            })

            it('does not touch any other column (metadata + errorMessage preserved)', async () => {
                await runPayloadRetentionSweep({ appDataSource: mockDataSource, retentionDays: 30 })
                // .set() is called exactly once with exactly the two payload keys.
                expect(mockUpdateQB.set).toHaveBeenCalledTimes(1)
                const setArg = mockUpdateQB.set.mock.calls[0][0]
                expect(Object.keys(setArg).sort()).toEqual(['requestPayload', 'responsePayload'])
            })

            it('returns the affected row count from the driver', async () => {
                mockUpdateQB.execute.mockResolvedValueOnce({ affected: 42 })
                const result = await runPayloadRetentionSweep({ appDataSource: mockDataSource, retentionDays: 90 })
                expect(result.rowsAffected).toBe(42)
            })

            it('coerces missing affected count to 0', async () => {
                mockUpdateQB.execute.mockResolvedValueOnce({})
                const result = await runPayloadRetentionSweep({ appDataSource: mockDataSource, retentionDays: 90 })
                expect(result.rowsAffected).toBe(0)
            })
        })

        // ─── safe wrapper ──────────────────────────────────────────────

        describe('runPayloadRetentionSweepSafe', () => {
            it('returns the sweep result on success', async () => {
                mockUpdateQB.execute.mockResolvedValueOnce({ affected: 7 })
                const result = await runPayloadRetentionSweepSafe({ appDataSource: mockDataSource, retentionDays: 90 })
                expect(result).not.toBeNull()
                expect(result.rowsAffected).toBe(7)
            })

            it('returns null and swallows the error on failure', async () => {
                mockUpdateQB.execute.mockRejectedValueOnce(new Error('db gone'))
                await expect(runPayloadRetentionSweepSafe({ appDataSource: mockDataSource, retentionDays: 90 })).resolves.toBeNull()
            })
        })
    })
}
