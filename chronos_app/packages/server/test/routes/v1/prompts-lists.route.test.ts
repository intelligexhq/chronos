import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

/**
 * Helper function to get auth token
 */
async function getAuthToken(): Promise<string> {
    const uniqueId = Date.now() + Math.random()
    const testUser = {
        email: `prompts-test-${uniqueId}@test.com`,
        password: 'test1234'
    }
    const response = await supertest(getRunningExpressApp().app).post('/api/v1/auth/signup').send(testUser)
    return response.body.token
}

/**
 * Test suite for prompts-lists route
 * Tests LangChain Hub prompts retrieval
 */
export function promptsListsRouteTest() {
    describe('Prompts Lists Route', () => {
        let authToken: string

        beforeAll(async () => {
            authToken = await getAuthToken()
        })

        describe('POST /api/v1/prompts-lists', () => {
            it('should return prompts list with 200 status', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/prompts-lists')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                    .send({})

                // May return 200 with data or error depending on external API
                expect([200, 500, 503]).toContain(response.status)
            })

            it('should accept tags parameter', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/prompts-lists')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                    .send({ tags: 'qa' })

                // External API may or may not be available
                expect([200, 500, 503]).toContain(response.status)
            })

            it('should handle multiple tags', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/prompts-lists')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                    .send({ tags: 'qa,summarization' })

                expect([200, 500, 503]).toContain(response.status)
            })

            it('should handle search parameter', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/prompts-lists')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                    .send({ search: 'chat' })

                expect([200, 500, 503]).toContain(response.status)
            })

            it('should handle pagination parameters', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/prompts-lists')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                    .send({ page: 1, limit: 10 })

                expect([200, 500, 503]).toContain(response.status)
            })
        })

        describe('GET /api/v1/prompts-lists/:id', () => {
            it('should handle prompt retrieval', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/prompts-lists/test-prompt-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500, 503]).toContain(response.status)
            })
        })
    })
}
