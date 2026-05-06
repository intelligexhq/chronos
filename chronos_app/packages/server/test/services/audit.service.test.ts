import { createMockRepository } from '../mocks/appServer.mock'

/**
 * Test suite for v1.7 § 3a auditService.
 * Covers the best-effort write contract (DB errors swallowed, never re-thrown
 * to the caller) and the callId read helper used by the smoke runner and the
 * v1.7 § 6 HTTP-agent execution viewer.
 */
export function auditServiceTest() {
    describe('Audit Service', () => {
        let auditService: any
        let mockRepository: ReturnType<typeof createMockRepository>
        let mockAppServer: any

        const setupMocks = () => {
            jest.doMock('../../src/utils/getRunningExpressApp', () => ({
                getRunningExpressApp: jest.fn(() => mockAppServer)
            }))
        }

        beforeEach(() => {
            // Re-establish mocks per-test because earlier suites in the run order
            // (mcp-gateway) leave `jest.doMock('../../src/services/audit', ...)`
            // registered AND call `jest.resetModules()` themselves. Without
            // `unmock`, our `require('../../src/services/audit')` would return
            // the gateway-test stub instead of the real implementation.
            jest.resetModules()
            jest.unmock('../../src/services/audit')
            mockRepository = createMockRepository()
            mockAppServer = {
                AppDataSource: { getRepository: jest.fn().mockReturnValue(mockRepository) }
            }
            setupMocks()
            auditService = require('../../src/services/audit').default
        })

        afterAll(() => {
            jest.resetModules()
        })

        const baseInput = (overrides: Partial<Record<string, unknown>> = {}) => ({
            agentId: 'agent-1',
            agentSlug: 'my-agent',
            mcpServerId: 'srv-1',
            mcpServerSlug: 'postgres',
            toolName: 'query',
            namespacedTool: 'postgres.query',
            success: true,
            durationMs: 42,
            errorMessage: null,
            callId: 'call-1',
            userId: 'user-1',
            ...overrides
        })

        describe('recordToolInvocation', () => {
            it('inserts a row with the input payload verbatim', async () => {
                mockRepository.insert.mockResolvedValue({ identifiers: [{ id: 'audit-1' }] } as any)
                const input = baseInput()
                await auditService.recordToolInvocation(input)
                expect(mockRepository.insert).toHaveBeenCalledWith(input)
            })

            it('swallows DB errors so the gateway invoke hot path is never affected', async () => {
                mockRepository.insert.mockRejectedValue(new Error('connection lost'))
                await expect(auditService.recordToolInvocation(baseInput())).resolves.toBeUndefined()
            })

            it('persists failure rows with success=false and the operator-friendly errorMessage', async () => {
                mockRepository.insert.mockResolvedValue({ identifiers: [{ id: 'audit-2' }] } as any)
                const input = baseInput({ success: false, errorMessage: 'rpc broken' })
                await auditService.recordToolInvocation(input)
                expect(mockRepository.insert).toHaveBeenCalledWith(expect.objectContaining({ success: false, errorMessage: 'rpc broken' }))
            })
        })

        describe('listByCallId', () => {
            it('returns rows for the given callId in chronological order', async () => {
                const rows = [{ id: 'a' }, { id: 'b' }]
                mockRepository.find.mockResolvedValue(rows as any)
                const result = await auditService.listByCallId('call-1')
                expect(mockRepository.find).toHaveBeenCalledWith({ where: { callId: 'call-1' }, order: { createdDate: 'ASC' } })
                expect(result).toBe(rows)
            })

            it('returns an empty array when no rows match', async () => {
                mockRepository.find.mockResolvedValue([])
                const result = await auditService.listByCallId('unknown-call')
                expect(result).toEqual([])
            })
        })
    })
}
