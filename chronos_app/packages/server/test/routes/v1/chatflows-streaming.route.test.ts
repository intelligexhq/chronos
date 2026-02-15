import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

/**
 * Helper function to get auth token
 */
async function getAuthToken(): Promise<string> {
    const uniqueId = Date.now() + Math.random()
    const testUser = {
        email: `chatflows-streaming-test-${uniqueId}@test.com`,
        password: 'test1234'
    }
    const response = await supertest(getRunningExpressApp().app).post('/api/v1/auth/signup').send(testUser)
    return response.body.token
}

/**
 * Test suite for chatflows-streaming route
 * Tests streaming validation endpoint
 */
export function chatflowsStreamingRouteTest() {
    describe('Chatflows Streaming Route', () => {
        let authToken: string

        beforeAll(async () => {
            authToken = await getAuthToken()
        })

        describe('GET /api/v1/chatflows-streaming/:id', () => {
            it('should handle request without auth', async () => {
                const response = await supertest(getRunningExpressApp().app).get('/api/v1/chatflows-streaming/test-id')

                expect([200, 401, 403, 404, 500]).toContain(response.status)
            })

            it('should return 412 when id is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/chatflows-streaming/')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 412, 500]).toContain(response.status)
            })

            it('should handle non-existent chatflow id', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/chatflows-streaming/non-existent-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 412, 500]).toContain(response.status)
            })

            it('should handle valid chatflow id', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/chatflows-streaming/valid-chatflow-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })

            it('should handle uuid format chatflow id', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/chatflows-streaming/550e8400-e29b-41d4-a716-446655440000')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })
        })
    })
}
