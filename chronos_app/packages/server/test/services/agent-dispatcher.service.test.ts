/**
 * Test suite for the Agent Dispatcher (v1.6.0).
 * Verifies the BUILT_IN / HTTP runtime branching, agent lookup by id+slug,
 * and the disabled / unknown-runtime error paths.
 */
export function agentDispatcherServiceTest() {
    describe('Agent Dispatcher', () => {
        let dispatcher: any
        let mockAppServer: any
        let mockAgentRepo: any
        let mockUtilBuildAgentflow: jest.Mock
        let mockHttpInvoke: jest.Mock

        const setupMocks = () => {
            jest.doMock('../../src/utils/getRunningExpressApp', () => ({
                getRunningExpressApp: jest.fn(() => mockAppServer)
            }))
            jest.doMock('../../src/utils/buildAgentflow', () => ({
                utilBuildAgentflow: mockUtilBuildAgentflow
            }))
            jest.doMock('../../src/services/agent-runtime-http', () => ({
                __esModule: true,
                default: { invoke: mockHttpInvoke, resolveOutboundAuth: jest.fn() }
            }))
        }

        afterAll(() => {
            jest.unmock('../../src/utils/getRunningExpressApp')
            jest.unmock('../../src/utils/buildAgentflow')
            jest.unmock('../../src/services/agent-runtime-http')
            jest.resetModules()
        })

        beforeEach(() => {
            jest.resetModules()
            process.env.ENABLE_AGENTS = 'true'
            mockAgentRepo = {
                findOneBy: jest.fn().mockResolvedValue(null)
            }
            mockAppServer = {
                AppDataSource: { getRepository: jest.fn().mockReturnValue(mockAgentRepo) },
                sseStreamer: {
                    addExternalClient: jest.fn(),
                    streamMetadataEvent: jest.fn(),
                    streamErrorEvent: jest.fn(),
                    removeClient: jest.fn()
                }
            }
            mockUtilBuildAgentflow = jest.fn().mockResolvedValue({ chatId: 'c1', text: 'hello' })
            mockHttpInvoke = jest.fn().mockResolvedValue(undefined)
            setupMocks()
            dispatcher = require('../../src/services/agent-dispatcher').default
        })

        const buildReqRes = (overrides: any = {}) => {
            const req: any = {
                params: {},
                body: {},
                headers: {},
                get: jest.fn(),
                ...overrides
            }
            const res: any = {
                setHeader: jest.fn(),
                flushHeaders: jest.fn(),
                json: jest.fn(),
                end: jest.fn(),
                write: jest.fn(),
                headersSent: false,
                writableEnded: false
            }
            return { req, res }
        }

        // ─── feature flag ──────────────────────────────────────────────

        it('returns 503 when ENABLE_AGENTS is not true', async () => {
            process.env.ENABLE_AGENTS = 'false'
            jest.resetModules()
            setupMocks()
            dispatcher = require('../../src/services/agent-dispatcher').default

            const { req, res } = buildReqRes()
            await expect(dispatcher.dispatch(req, res, 'any')).rejects.toMatchObject({ statusCode: 503 })

            process.env.ENABLE_AGENTS = 'true'
        })

        // ─── agent lookup ──────────────────────────────────────────────

        it('looks up by id first, then by slug', async () => {
            mockAgentRepo.findOneBy.mockImplementation(({ id, slug }: any) => {
                if (id === 'uuid-1') return Promise.resolve(null)
                if (slug === 'uuid-1') return Promise.resolve({ id: 'a1', slug: 'uuid-1', enabled: true, runtimeType: 'HTTP' })
                return Promise.resolve(null)
            })
            const { req, res } = buildReqRes()
            await dispatcher.dispatch(req, res, 'uuid-1')
            expect(mockHttpInvoke).toHaveBeenCalled()
        })

        it('returns 404 when agent not found by id or slug', async () => {
            mockAgentRepo.findOneBy.mockResolvedValue(null)
            const { req, res } = buildReqRes()
            await expect(dispatcher.dispatch(req, res, 'missing')).rejects.toMatchObject({ statusCode: 404 })
        })

        it('returns 409 when agent is disabled', async () => {
            mockAgentRepo.findOneBy.mockResolvedValueOnce({ id: 'a1', enabled: false, runtimeType: 'HTTP' })
            const { req, res } = buildReqRes()
            await expect(dispatcher.dispatch(req, res, 'a1')).rejects.toMatchObject({ statusCode: 409 })
        })

        it('returns 400 for unknown runtimeType', async () => {
            mockAgentRepo.findOneBy.mockResolvedValueOnce({ id: 'a1', enabled: true, runtimeType: 'WEIRD' })
            const { req, res } = buildReqRes()
            await expect(dispatcher.dispatch(req, res, 'a1')).rejects.toMatchObject({ statusCode: 400 })
        })

        // ─── BUILT_IN branch ───────────────────────────────────────────

        it('BUILT_IN: rewrites params.id to builtinAgentflowId and calls utilBuildAgentflow (non-streaming)', async () => {
            mockAgentRepo.findOneBy.mockResolvedValueOnce({
                id: 'a1',
                slug: 'flow-a',
                enabled: true,
                runtimeType: 'BUILT_IN',
                builtinAgentflowId: 'flow-1'
            })
            const { req, res } = buildReqRes()
            const result = await dispatcher.dispatch(req, res, 'a1')
            expect(req.params.id).toBe('flow-1')
            expect(mockUtilBuildAgentflow).toHaveBeenCalledWith(req)
            expect(result).toEqual({ chatId: 'c1', text: 'hello' })
        })

        it('BUILT_IN: streaming sets up SSE headers and registers sseStreamer client', async () => {
            mockAgentRepo.findOneBy.mockResolvedValueOnce({
                id: 'a1',
                slug: 'flow-a',
                enabled: true,
                runtimeType: 'BUILT_IN',
                builtinAgentflowId: 'flow-1'
            })
            const { req, res } = buildReqRes({ body: { streaming: true, chatId: 'chat-77' } })
            const result = await dispatcher.dispatch(req, res, 'a1')
            expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream')
            expect(mockAppServer.sseStreamer.addExternalClient).toHaveBeenCalledWith('chat-77', res)
            expect(mockAppServer.sseStreamer.streamMetadataEvent).toHaveBeenCalled()
            expect(mockAppServer.sseStreamer.removeClient).toHaveBeenCalledWith('chat-77')
            expect(result).toBeUndefined()
        })

        it('BUILT_IN: returns 404 when builtinAgentflowId is missing', async () => {
            mockAgentRepo.findOneBy.mockResolvedValueOnce({
                id: 'a1',
                slug: 'flow-a',
                enabled: true,
                runtimeType: 'BUILT_IN',
                builtinAgentflowId: null
            })
            const { req, res } = buildReqRes()
            await expect(dispatcher.dispatch(req, res, 'a1')).rejects.toMatchObject({ statusCode: 404 })
        })

        // ─── HTTP branch ───────────────────────────────────────────────

        it('HTTP: delegates to HttpAgentRuntime.invoke and returns undefined', async () => {
            const agent = { id: 'a2', slug: 'http-1', enabled: true, runtimeType: 'HTTP', serviceEndpoint: 'https://x' }
            mockAgentRepo.findOneBy.mockResolvedValueOnce(agent)
            const { req, res } = buildReqRes({ body: { messages: [] } })
            const result = await dispatcher.dispatch(req, res, 'a2')
            expect(mockHttpInvoke).toHaveBeenCalledWith(agent, { messages: [] }, req, res)
            expect(result).toBeUndefined()
        })
    })
}
