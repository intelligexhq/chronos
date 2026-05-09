import { StatusCodes } from 'http-status-codes'
import supertest from 'supertest'
import { v4 as uuidv4 } from 'uuid'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'
import { Agent } from '../../../src/database/entities/Agent'
import { AgentRuntimeType, AgentStatus } from '../../../src/Interface'

/**
 * Test suite for the MCP gateway routes.
 *
 * The live test server boots with `ENABLE_MCP_SERVERS` unset, so the gateway
 * itself is not constructed — invoke() returns 503. These tests focus on the
 * middleware boundary (auth) and the controller boundary (body validation).
 * The gateway-level branches (intersection enforcement, tool dispatch) are
 * exercised by the unit suite at `test/services/mcp-gateway.service.test.ts`.
 */
export function mcpGatewayRouteTest() {
    describe('MCP Gateway Route', () => {
        const baseRoute = '/api/v1/mcp-gateway'
        let testAgent: Agent

        beforeAll(async () => {
            const repo = getRunningExpressApp().AppDataSource.getRepository(Agent)
            const agent = new Agent()
            agent.name = 'Gateway Route Test Agent'
            agent.slug = `gateway-test-${Date.now()}`
            agent.runtimeType = AgentRuntimeType.HTTP
            agent.status = AgentStatus.UNKNOWN
            agent.enabled = true
            agent.mcpGatewayToken = `tok-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
            agent.serviceEndpoint = 'https://upstream.example.com'
            agent.allowedTools = JSON.stringify(['postgres.query'])
            agent.version = '1.0.0'
            testAgent = await repo.save(agent)
        })

        afterAll(async () => {
            if (testAgent?.id) {
                await getRunningExpressApp().AppDataSource.getRepository(Agent).delete({ id: testAgent.id })
            }
        })

        describe(`POST ${baseRoute}/:agentId/tools/invoke`, () => {
            it('returns 401 when Authorization header is missing', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post(`${baseRoute}/${testAgent.id}/tools/invoke`)
                    .send({ tool: 'postgres.query', params: {} })
                expect(response.status).toEqual(StatusCodes.UNAUTHORIZED)
            })

            it('returns 401 for an unknown agent id (does not leak existence)', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post(`${baseRoute}/${uuidv4()}/tools/invoke`)
                    .set('Authorization', 'Bearer anything')
                    .send({ tool: 'postgres.query', params: {} })
                expect(response.status).toEqual(StatusCodes.UNAUTHORIZED)
            })

            it('returns 401 when MCP gateway token does not match', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post(`${baseRoute}/${testAgent.id}/tools/invoke`)
                    .set('Authorization', 'Bearer this-is-not-the-token')
                    .send({ tool: 'postgres.query', params: {} })
                expect(response.status).toEqual(StatusCodes.UNAUTHORIZED)
            })

            it('returns 400 when tool field is missing from body', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post(`${baseRoute}/${testAgent.id}/tools/invoke`)
                    .set('Authorization', `Bearer ${testAgent.mcpGatewayToken}`)
                    .send({ params: {} })
                expect(response.status).toEqual(StatusCodes.BAD_REQUEST)
            })

            it('returns 503 when gateway is not enabled (ENABLE_MCP_SERVERS off)', async () => {
                // Default test boot does not set ENABLE_MCP_SERVERS, so the
                // gateway is not wired. Auth + body validation pass; the
                // controller short-circuits to 503 before any MCP traffic.
                const response = await supertest(getRunningExpressApp().app)
                    .post(`${baseRoute}/${testAgent.id}/tools/invoke`)
                    .set('Authorization', `Bearer ${testAgent.mcpGatewayToken}`)
                    .send({ tool: 'postgres.query', params: { sql: 'select 1' } })
                expect(response.status).toEqual(StatusCodes.SERVICE_UNAVAILABLE)
            })
        })

        describe(`GET ${baseRoute}/:agentId/tools`, () => {
            it('returns 401 without Authorization header', async () => {
                const response = await supertest(getRunningExpressApp().app).get(`${baseRoute}/${testAgent.id}/tools`)
                expect(response.status).toEqual(StatusCodes.UNAUTHORIZED)
            })

            it('returns 503 when gateway is not enabled', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get(`${baseRoute}/${testAgent.id}/tools`)
                    .set('Authorization', `Bearer ${testAgent.mcpGatewayToken}`)
                expect(response.status).toEqual(StatusCodes.SERVICE_UNAVAILABLE)
            })
        })

        describe(`GET ${baseRoute}/:agentId/health`, () => {
            it('returns 401 without Authorization header', async () => {
                const response = await supertest(getRunningExpressApp().app).get(`${baseRoute}/${testAgent.id}/health`)
                expect(response.status).toEqual(StatusCodes.UNAUTHORIZED)
            })

            it('returns 401 when token does not match', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get(`${baseRoute}/${testAgent.id}/health`)
                    .set('Authorization', 'Bearer not-the-real-token')
                expect(response.status).toEqual(StatusCodes.UNAUTHORIZED)
            })

            it('returns 503 with valid bearer when gateway is not enabled', async () => {
                // Same boot config as the other suites: ENABLE_MCP_SERVERS unset,
                // so the gateway service is not constructed and /health surfaces
                // that as 503 even though auth passes.
                const response = await supertest(getRunningExpressApp().app)
                    .get(`${baseRoute}/${testAgent.id}/health`)
                    .set('Authorization', `Bearer ${testAgent.mcpGatewayToken}`)
                expect(response.status).toEqual(StatusCodes.SERVICE_UNAVAILABLE)
            })
        })
    })
}
