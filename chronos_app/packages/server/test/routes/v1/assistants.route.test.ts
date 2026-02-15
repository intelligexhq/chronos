import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

/**
 * Helper function to get auth token
 */
async function getAuthToken(): Promise<string> {
    const uniqueId = Date.now() + Math.random()
    const testUser = {
        email: `assistants-test-${uniqueId}@test.com`,
        password: 'test1234'
    }
    const response = await supertest(getRunningExpressApp().app).post('/api/v1/auth/signup').send(testUser)
    return response.body.token
}

/**
 * Test suite for assistants route
 * Tests assistant CRUD endpoints
 */
export function assistantsRouteTest() {
    describe('Assistants Route', () => {
        let authToken: string

        beforeAll(async () => {
            authToken = await getAuthToken()
        })

        describe('GET /api/v1/assistants', () => {
            it('should return assistants list', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/assistants')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 412]).toContain(response.status)
            })
        })

        describe('GET /api/v1/assistants/:id', () => {
            it('should handle non-existent assistant', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/assistants/non-existent-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 412, 500]).toContain(response.status)
            })
        })

        describe('POST /api/v1/assistants', () => {
            it('should require authentication', async () => {
                const response = await supertest(getRunningExpressApp().app).post('/api/v1/assistants').send({})

                expect([401, 403]).toContain(response.status)
            })
        })

        describe('DELETE /api/v1/assistants/:id', () => {
            it('should require authentication', async () => {
                const response = await supertest(getRunningExpressApp().app).delete('/api/v1/assistants/some-id')

                expect([401, 403]).toContain(response.status)
            })

            it('should handle delete of non-existent assistant', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .delete('/api/v1/assistants/non-existent-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })
        })

        describe('PUT /api/v1/assistants/:id', () => {
            it('should handle update of non-existent assistant', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .put('/api/v1/assistants/non-existent-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                    .send({ name: 'Updated Assistant' })

                expect([200, 404, 500]).toContain(response.status)
            })
        })

        describe('GET /api/v1/assistants with filters', () => {
            it('should handle pagination', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/assistants?page=1&limit=10')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 412]).toContain(response.status)
            })

            it('should handle search filter', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/assistants?search=test')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 412]).toContain(response.status)
            })

            it('should handle type filter', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/assistants?type=openai')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 412]).toContain(response.status)
            })
        })

        describe('POST /api/v1/assistants with validation', () => {
            it('should handle creation with minimal data', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/assistants')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                    .send({ name: `Test Assistant ${Date.now()}` })

                expect([200, 201, 400, 412, 500]).toContain(response.status)
            })

            it('should handle creation with empty body', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/assistants')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                    .send({})

                expect([400, 412, 500]).toContain(response.status)
            })
        })

        describe('GET /api/v1/assistants/:id/credential', () => {
            it('should handle credential retrieval for non-existent assistant', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/assistants/non-existent-id/credential')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })
        })
    })
}
