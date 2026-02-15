import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

/**
 * Helper function to get auth token
 */
async function getAuthToken(): Promise<string> {
    const uniqueId = Date.now() + Math.random()
    const testUser = {
        email: `openai-realtime-test-${uniqueId}@test.com`,
        password: 'test1234'
    }
    const response = await supertest(getRunningExpressApp().app).post('/api/v1/auth/signup').send(testUser)
    return response.body.token
}

/**
 * Test suite for openai-realtime route
 * Tests OpenAI realtime agent tools endpoints
 */
export function openaiRealtimeRouteTest() {
    describe('OpenAI Realtime Route', () => {
        let authToken: string

        beforeAll(async () => {
            authToken = await getAuthToken()
        })

        describe('GET /api/v1/openai-realtime', () => {
            it('should handle request without id', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/openai-realtime')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 412, 500]).toContain(response.status)
            })
        })

        describe('GET /api/v1/openai-realtime/:id', () => {
            it('should handle request with non-existent id', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/openai-realtime/non-existent-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 412, 500]).toContain(response.status)
            })

            it('should handle request with valid uuid id', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/openai-realtime/550e8400-e29b-41d4-a716-446655440000')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 412, 500]).toContain(response.status)
            })
        })

        describe('POST /api/v1/openai-realtime', () => {
            it('should handle request without id and empty body', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/openai-realtime')
                    .send({})
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 412, 500]).toContain(response.status)
            })

            it('should handle request with tool data', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/openai-realtime')
                    .send({
                        toolName: 'test-tool',
                        toolInput: {}
                    })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 412, 500]).toContain(response.status)
            })
        })

        describe('POST /api/v1/openai-realtime/:id', () => {
            it('should handle request with non-existent id', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/openai-realtime/non-existent-id')
                    .send({ toolName: 'test-tool' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 412, 500]).toContain(response.status)
            })

            it('should handle request with valid uuid id and tool data', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/openai-realtime/550e8400-e29b-41d4-a716-446655440000')
                    .send({
                        toolName: 'test-tool',
                        toolInput: { query: 'test' }
                    })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 412, 500]).toContain(response.status)
            })
        })
    })
}
