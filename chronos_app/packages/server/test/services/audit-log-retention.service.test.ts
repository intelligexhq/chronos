/**
 * Unit tests for the audit log retention sweeper
 * (`services/audit/log-retention.ts`).
 *
 * Covers: cutoff math against the configured retention window, DELETE
 * statement shape per table, return-value split across both audit
 * tables, the swallow-and-log wrapper does not propagate errors. The
 * v1.9 distinction vs `audit-payload-retention.service.test.ts` is the
 * DELETE-not-UPDATE shape and the credential_access_audit second table.
 */
export function auditLogRetentionSweeperTest() {
    describe('Audit Log Retention Sweeper', () => {
        let runLogRetentionSweep: any
        let runLogRetentionSweepSafe: any
        let toolInvocationDeleteQB: any
        let credentialAccessDeleteQB: any
        let mockToolInvocationRepo: any
        let mockCredentialAccessRepo: any
        let mockDataSource: any

        beforeEach(() => {
            jest.resetModules()

            const buildDeleteQB = (affected: number) => ({
                delete: jest.fn().mockReturnThis(),
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                execute: jest.fn().mockResolvedValue({ affected })
            })
            toolInvocationDeleteQB = buildDeleteQB(0)
            credentialAccessDeleteQB = buildDeleteQB(0)
            mockToolInvocationRepo = { createQueryBuilder: jest.fn().mockReturnValue(toolInvocationDeleteQB) }
            mockCredentialAccessRepo = { createQueryBuilder: jest.fn().mockReturnValue(credentialAccessDeleteQB) }

            mockDataSource = {
                getRepository: jest.fn((entity: any) => {
                    const name = typeof entity === 'function' ? entity.name : entity
                    if (name === 'ToolInvocationAudit') return mockToolInvocationRepo
                    if (name === 'CredentialAccessAudit') return mockCredentialAccessRepo
                    throw new Error(`Unexpected entity ${name}`)
                })
            }

            const mod = require('../../src/services/audit/log-retention')
            runLogRetentionSweep = mod.runLogRetentionSweep
            runLogRetentionSweepSafe = mod.runLogRetentionSweepSafe
        })

        // ─── cutoff math ───────────────────────────────────────────────

        describe('cutoff math', () => {
            it('computes cutoff = now - retentionDays * 86_400_000', async () => {
                const before = Date.now()
                const result = await runLogRetentionSweep({ appDataSource: mockDataSource, retentionDays: 90 })
                const after = Date.now()

                const expectedMin = before - 90 * 86_400_000
                const expectedMax = after - 90 * 86_400_000
                expect(result.cutoff.getTime()).toBeGreaterThanOrEqual(expectedMin)
                expect(result.cutoff.getTime()).toBeLessThanOrEqual(expectedMax)
            })

            it('clamps non-finite retentionDays to a 1-day minimum', async () => {
                const result = await runLogRetentionSweep({
                    appDataSource: mockDataSource,
                    retentionDays: Number.NaN
                })
                const expected = Date.now() - 86_400_000
                expect(Math.abs(result.cutoff.getTime() - expected)).toBeLessThan(1_000)
            })

            it('clamps retentionDays < 1 to a 1-day minimum', async () => {
                const result = await runLogRetentionSweep({
                    appDataSource: mockDataSource,
                    retentionDays: 0
                })
                const expected = Date.now() - 86_400_000
                expect(Math.abs(result.cutoff.getTime() - expected)).toBeLessThan(1_000)
            })

            it('floors fractional retentionDays', async () => {
                const result = await runLogRetentionSweep({
                    appDataSource: mockDataSource,
                    retentionDays: 7.9
                })
                const expected = Date.now() - 7 * 86_400_000
                expect(Math.abs(result.cutoff.getTime() - expected)).toBeLessThan(1_000)
            })
        })

        // ─── DELETE shape ──────────────────────────────────────────────

        describe('DELETE statement shape', () => {
            it('issues a DELETE against tool_invocation_audit with createdDate < :cutoff', async () => {
                await runLogRetentionSweep({ appDataSource: mockDataSource, retentionDays: 30 })
                expect(toolInvocationDeleteQB.delete).toHaveBeenCalled()
                const [whereClause, whereParams] = toolInvocationDeleteQB.where.mock.calls[0]
                expect(whereClause).toBe('createdDate < :cutoff')
                expect(whereParams.cutoff).toBeInstanceOf(Date)
            })

            it('issues a DELETE against credential_access_audit with createdDate < :cutoff', async () => {
                await runLogRetentionSweep({ appDataSource: mockDataSource, retentionDays: 30 })
                expect(credentialAccessDeleteQB.delete).toHaveBeenCalled()
                const [whereClause, whereParams] = credentialAccessDeleteQB.where.mock.calls[0]
                expect(whereClause).toBe('createdDate < :cutoff')
                expect(whereParams.cutoff).toBeInstanceOf(Date)
            })

            it('returns per-table affected counts split out', async () => {
                toolInvocationDeleteQB.execute.mockResolvedValueOnce({ affected: 17 })
                credentialAccessDeleteQB.execute.mockResolvedValueOnce({ affected: 4 })
                const result = await runLogRetentionSweep({ appDataSource: mockDataSource, retentionDays: 30 })
                expect(result.toolInvocationRowsDeleted).toBe(17)
                expect(result.credentialAccessRowsDeleted).toBe(4)
            })

            it('coerces missing affected counts to 0 for each table', async () => {
                toolInvocationDeleteQB.execute.mockResolvedValueOnce({})
                credentialAccessDeleteQB.execute.mockResolvedValueOnce({})
                const result = await runLogRetentionSweep({ appDataSource: mockDataSource, retentionDays: 30 })
                expect(result.toolInvocationRowsDeleted).toBe(0)
                expect(result.credentialAccessRowsDeleted).toBe(0)
            })
        })

        // ─── safe wrapper ──────────────────────────────────────────────

        describe('runLogRetentionSweepSafe', () => {
            it('returns the sweep result on success', async () => {
                toolInvocationDeleteQB.execute.mockResolvedValueOnce({ affected: 3 })
                credentialAccessDeleteQB.execute.mockResolvedValueOnce({ affected: 1 })
                const result = await runLogRetentionSweepSafe({ appDataSource: mockDataSource, retentionDays: 90 })
                expect(result).not.toBeNull()
                expect(result.toolInvocationRowsDeleted).toBe(3)
                expect(result.credentialAccessRowsDeleted).toBe(1)
            })

            it('returns null and swallows the error if the tool_invocation_audit delete fails', async () => {
                toolInvocationDeleteQB.execute.mockRejectedValueOnce(new Error('db gone'))
                await expect(runLogRetentionSweepSafe({ appDataSource: mockDataSource, retentionDays: 90 })).resolves.toBeNull()
            })

            it('returns null and swallows the error if the credential_access_audit delete fails', async () => {
                credentialAccessDeleteQB.execute.mockRejectedValueOnce(new Error('db gone'))
                await expect(runLogRetentionSweepSafe({ appDataSource: mockDataSource, retentionDays: 90 })).resolves.toBeNull()
            })
        })
    })
}
