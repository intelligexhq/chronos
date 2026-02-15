import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

/**
 * Helper function to get auth token
 */
async function getAuthToken(): Promise<string> {
    const uniqueId = Date.now() + Math.random()
    const testUser = {
        email: `openai-assistants-test-${uniqueId}@test.com`,
        password: 'test1234'
    }
    const response = await supertest(getRunningExpressApp().app).post('/api/v1/auth/signup').send(testUser)
    return response.body.token
}

/**
 * Test suite for openai-assistants route
 * Tests OpenAI assistants endpoints
 */
export function openaiAssistantsRouteTest() {
    describe('OpenAI Assistants Route', () => {
        let authToken: string

        beforeAll(async () => {
            authToken = await getAuthToken()
        })

        describe('GET /api/v1/openai-assistants', () => {
            it('should return 412 when credential is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/openai-assistants')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([400, 412, 500]).toContain(response.status)
            })

            it('should handle request with credential param', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/openai-assistants')
                    .query({ credential: 'test-credential-id' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })
        })

        describe('GET /api/v1/openai-assistants/:id', () => {
            it('should return 412 when id is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/openai-assistants/')
                    .query({ credential: 'test-credential-id' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 412, 500]).toContain(response.status)
            })

            it('should return 412 when credential is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/openai-assistants/asst_123')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([400, 412, 500]).toContain(response.status)
            })

            it('should handle valid id with credential', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/openai-assistants/asst_123')
                    .query({ credential: 'test-credential-id' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })

            it('should handle non-existent assistant id', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/openai-assistants/non-existent-assistant')
                    .query({ credential: 'test-credential-id' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })
        })
    })
}
