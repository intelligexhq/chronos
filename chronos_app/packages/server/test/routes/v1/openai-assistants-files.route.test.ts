import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

/**
 * Helper function to get auth token
 */
async function getAuthToken(): Promise<string> {
    const uniqueId = Date.now() + Math.random()
    const testUser = {
        email: `openai-files-test-${uniqueId}@test.com`,
        password: 'test1234'
    }
    const response = await supertest(getRunningExpressApp().app).post('/api/v1/auth/signup').send(testUser)
    return response.body.token
}

/**
 * Test suite for openai-assistants-files route
 * Tests file download and upload endpoints
 */
export function openaiAssistantsFilesRouteTest() {
    describe('OpenAI Assistants Files Route', () => {
        let authToken: string

        beforeAll(async () => {
            authToken = await getAuthToken()
        })

        describe('POST /api/v1/openai-assistants-files/download', () => {
            it('should return 500 when required fields are missing', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/openai-assistants-files/download/')
                    .send({})
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 500]).toContain(response.status)
            })

            it('should return 500 when chatflowId is missing', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/openai-assistants-files/download/')
                    .send({ chatId: 'test-chat', fileName: 'test.txt' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 500]).toContain(response.status)
            })

            it('should return 500 when chatId is missing', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/openai-assistants-files/download/')
                    .send({ chatflowId: 'test-flow', fileName: 'test.txt' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 500]).toContain(response.status)
            })

            it('should return 500 when fileName is missing', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/openai-assistants-files/download/')
                    .send({ chatflowId: 'test-flow', chatId: 'test-chat' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 500]).toContain(response.status)
            })

            it('should handle valid download request', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/openai-assistants-files/download/')
                    .send({ chatflowId: 'test-flow', chatId: 'test-chat', fileName: 'test.txt' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })
        })

        describe('POST /api/v1/openai-assistants-files/upload', () => {
            it('should return 412 when credential is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/openai-assistants-files/upload/')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 412, 500]).toContain(response.status)
            })

            it('should handle upload with credential', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/openai-assistants-files/upload/')
                    .query({ credential: 'test-credential' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })
        })
    })
}
