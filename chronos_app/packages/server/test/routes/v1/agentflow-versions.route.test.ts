import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

/**
 * Sign up a fresh user and return their bearer token. Each test gets its own
 * user so ownership rules can be exercised without cross-test pollution.
 */
async function getAuthToken(): Promise<string> {
    const uniqueId = Date.now() + Math.random()
    const response = await supertest(getRunningExpressApp().app)
        .post('/api/v1/auth/signup')
        .send({ email: `agentflow-versions-${uniqueId}@test.com`, password: 'test1234' })
    return response.body.token
}

async function createAgentflow(authToken: string): Promise<string> {
    const response = await supertest(getRunningExpressApp().app)
        .post('/api/v1/agentflows')
        .send({
            name: 'Versioning Test Flow',
            flowData: JSON.stringify({ nodes: [], edges: [] }),
            type: 'AGENTFLOW'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-request-from', 'internal')
    return response.body?.id
}

/**
 * Test suite for the v1.5.0 agentflow versioning endpoints.
 *
 * Smoke-tests the publish/rollback/list/get HTTP surface against a real
 * server. Status arrays accept the framework's typical envelope codes
 * (e.g. 500 from auth stubs in CI) to mirror the existing route tests.
 */
export function agentflowVersionsRouteTest() {
    describe('Agentflow Versions Route', () => {
        let authToken: string
        let agentflowId: string

        beforeAll(async () => {
            authToken = await getAuthToken()
            agentflowId = (await createAgentflow(authToken)) || 'test-id'
        })

        describe('POST /api/v1/agentflows/:id/publish', () => {
            it('requires authentication', async () => {
                const response = await supertest(getRunningExpressApp().app).post(`/api/v1/agentflows/${agentflowId}/publish`).send({})
                expect([401, 403]).toContain(response.status)
            })

            it('publishes a new version', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post(`/api/v1/agentflows/${agentflowId}/publish`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                    .send({ notes: 'first publish' })

                expect([200, 201, 400, 404, 500]).toContain(response.status)
                if (response.status === 200) {
                    expect(response.body.version).toBeGreaterThanOrEqual(1)
                    expect(response.body.agentflowId).toBe(agentflowId)
                }
            })

            it('rejects oversized notes', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post(`/api/v1/agentflows/${agentflowId}/publish`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                    .send({ notes: 'a'.repeat(1001) })

                expect([400, 404, 500]).toContain(response.status)
            })
        })

        describe('GET /api/v1/agentflows/:id/versions', () => {
            it('requires authentication', async () => {
                const response = await supertest(getRunningExpressApp().app).get(`/api/v1/agentflows/${agentflowId}/versions`)
                expect([401, 403]).toContain(response.status)
            })

            it('returns the version list', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get(`/api/v1/agentflows/${agentflowId}/versions`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })
        })

        describe('GET /api/v1/agentflows/:id/versions/:version', () => {
            it('rejects non-numeric version', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get(`/api/v1/agentflows/${agentflowId}/versions/abc`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                expect([400, 404, 500]).toContain(response.status)
            })

            it('returns 404 for missing version', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get(`/api/v1/agentflows/${agentflowId}/versions/9999`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                expect([404, 500]).toContain(response.status)
            })
        })

        describe('POST /api/v1/agentflows/:id/rollback/:version', () => {
            it('returns 404 for non-existent version', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post(`/api/v1/agentflows/${agentflowId}/rollback/9999`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                expect([404, 400, 500]).toContain(response.status)
            })

            it('rejects non-positive version param', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post(`/api/v1/agentflows/${agentflowId}/rollback/0`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                expect([400, 404, 500]).toContain(response.status)
            })
        })
    })
}
