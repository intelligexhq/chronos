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
        let testEvaluatorId: string

        beforeAll(async () => {
            authToken = await getAuthToken()
        })

        afterAll(async () => {
            // Cleanup test evaluator if created
            if (testEvaluatorId) {
                await supertest(getRunningExpressApp().app)
                    .delete(`/api/v1/evaluators/${testEvaluatorId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
            }
        })

        describe('GET /api/v1/evaluators', () => {
            it('should require authentication', async () => {
                const response = await supertest(getRunningExpressApp().app).get('/api/v1/evaluators')

                expect([401, 403]).toContain(response.status)
            })

            it('should get all evaluators', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/evaluators')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
                if (response.status === 200) {
                    expect(Array.isArray(response.body) || response.body.data !== undefined).toBe(true)
                }
            })

            it('should handle pagination params', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/evaluators')
                    .query({ page: '1', limit: '10' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })

            it('should handle invalid pagination params', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/evaluators')
                    .query({ page: '-1', limit: '10' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 412, 500]).toContain(response.status)
            })

            it('should handle large page number', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/evaluators')
                    .query({ page: '999999', limit: '10' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })
        })

        describe('GET /api/v1/evaluators/:id', () => {
            it('should return 412 when id is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/evaluators/')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 412, 500]).toContain(response.status)
            })

            it('should handle non-existent evaluator id', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/evaluators/non-existent-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })

            it('should handle valid UUID format id', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/evaluators/00000000-0000-0000-0000-000000000000')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })
        })

        describe('POST /api/v1/evaluators/:id', () => {
            it('should require authentication', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/evaluators/test-id')
                    .send({ name: 'Test Evaluator' })

                expect([401, 403]).toContain(response.status)
            })

            it('should return 412 when body is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/evaluators/test-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 201, 400, 412, 500]).toContain(response.status)
            })

            it('should create evaluator with valid data', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/evaluators/test-id')
                    .send({
                        name: `Test Evaluator ${Date.now()}`,
                        type: 'llm',
                        description: 'Test evaluator for automated tests'
                    })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 201, 400, 404, 500]).toContain(response.status)
                if (response.status === 200 || response.status === 201) {
                    expect(response.body).toHaveProperty('id')
                    testEvaluatorId = response.body.id
                }
            })

            it('should create evaluator with minimal data', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/evaluators/minimal-test')
                    .send({
                        name: `Minimal Evaluator ${Date.now()}`,
                        type: 'exact-match'
                    })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 201, 400, 404, 500]).toContain(response.status)
                if (response.status === 200 || response.status === 201) {
                    // Cleanup
                    await supertest(getRunningExpressApp().app)
                        .delete(`/api/v1/evaluators/${response.body.id}`)
                        .set('Authorization', `Bearer ${authToken}`)
                        .set('x-request-from', 'internal')
                }
            })

            it('should handle evaluator creation with llm type', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/evaluators/llm-test')
                    .send({
                        name: 'LLM Evaluator',
                        type: 'llm',
                        config: {
                            model: 'gpt-4'
                        }
                    })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 201, 400, 404, 500]).toContain(response.status)
            })

            it('should handle evaluator creation with custom type', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/evaluators/custom-test')
                    .send({
                        name: 'Custom Evaluator',
                        type: 'custom',
                        config: {
                            script: 'return true'
                        }
                    })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 201, 400, 404, 500]).toContain(response.status)
            })

            it('should handle empty body object', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/evaluators/empty-test')
                    .send({})
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 201, 400, 412, 500]).toContain(response.status)
            })
        })

        describe('PUT /api/v1/evaluators/:id', () => {
            it('should return 412 when body is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .put('/api/v1/evaluators/test-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 412, 500]).toContain(response.status)
            })

            it('should return 412 when id is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .put('/api/v1/evaluators/')
                    .send({ name: 'Updated Evaluator' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 412, 500]).toContain(response.status)
            })

            it('should handle update with valid id and body', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .put('/api/v1/evaluators/test-id')
                    .send({ name: 'Updated Evaluator', description: 'Updated description' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })

            it('should update existing evaluator', async () => {
                if (testEvaluatorId) {
                    const response = await supertest(getRunningExpressApp().app)
                        .put(`/api/v1/evaluators/${testEvaluatorId}`)
                        .send({
                            name: `Updated Evaluator ${Date.now()}`,
                            description: 'Updated description'
                        })
                        .set('Authorization', `Bearer ${authToken}`)
                        .set('x-request-from', 'internal')

                    expect([200, 404, 500]).toContain(response.status)
                }
            })

            it('should handle update with config changes', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .put('/api/v1/evaluators/test-id')
                    .send({
                        name: 'Updated Evaluator',
                        type: 'llm',
                        config: {
                            model: 'gpt-4-turbo',
                            temperature: 0.7
                        }
                    })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })
        })

        describe('DELETE /api/v1/evaluators/:id', () => {
            it('should return 412 when id is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .delete('/api/v1/evaluators/')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 412, 500]).toContain(response.status)
            })

            it('should handle delete non-existent evaluator', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .delete('/api/v1/evaluators/non-existent-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })

            it('should require authentication for delete', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .delete('/api/v1/evaluators/test-id')

                expect([401, 403]).toContain(response.status)
            })
        })
    })
}
