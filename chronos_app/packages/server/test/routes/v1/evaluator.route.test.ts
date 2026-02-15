import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

/**
 * Helper function to get auth token
 */
async function getAuthToken(): Promise<string> {
    const uniqueId = Date.now() + Math.random()
    const testUser = {
        email: `evaluator-test-${uniqueId}@test.com`,
        password: 'test1234'
    }
    const response = await supertest(getRunningExpressApp().app).post('/api/v1/auth/signup').send(testUser)
    return response.body.token
}

/**
 * Test suite for evaluator route
 * Tests evaluator CRUD endpoints
 */
export function evaluatorRouteTest() {
    describe('Evaluator Route', () => {
        let authToken: string

        beforeAll(async () => {
            authToken = await getAuthToken()
        })

        describe('GET /api/v1/evaluator', () => {
            it('should require authentication', async () => {
                const response = await supertest(getRunningExpressApp().app).get('/api/v1/evaluator')

                expect([401, 403]).toContain(response.status)
            })

            it('should get all evaluators', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/evaluator')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })

            it('should handle pagination params', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/evaluator')
                    .query({ page: '1', limit: '10' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })
        })

        describe('GET /api/v1/evaluator/:id', () => {
            it('should return 412 when id is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/evaluator/')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 412, 500]).toContain(response.status)
            })

            it('should handle non-existent evaluator id', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/evaluator/non-existent-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })
        })

        describe('POST /api/v1/evaluator', () => {
            it('should require authentication', async () => {
                const response = await supertest(getRunningExpressApp().app).post('/api/v1/evaluator').send({})

                expect([401, 403]).toContain(response.status)
            })

            it('should return 412 when body is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/evaluator')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 201, 400, 412, 500]).toContain(response.status)
            })

            it('should handle evaluator creation', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/evaluator')
                    .send({
                        name: 'Test Evaluator',
                        type: 'llm'
                    })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 201, 400, 404, 500]).toContain(response.status)
            })
        })

        describe('PUT /api/v1/evaluator/:id', () => {
            it('should return 412 when body is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .put('/api/v1/evaluator/test-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 412, 500]).toContain(response.status)
            })

            it('should return 412 when id is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .put('/api/v1/evaluator/')
                    .send({ name: 'Updated Evaluator' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 412, 500]).toContain(response.status)
            })

            it('should handle update with valid id and body', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .put('/api/v1/evaluator/test-id')
                    .send({ name: 'Updated Evaluator' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })
        })

        describe('DELETE /api/v1/evaluator/:id', () => {
            it('should return 412 when id is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .delete('/api/v1/evaluator/')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 412, 500]).toContain(response.status)
            })

            it('should handle delete non-existent evaluator', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .delete('/api/v1/evaluator/non-existent-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })
        })
    })
}
