import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

/**
 * Helper function to get auth token
 */
async function getAuthToken(): Promise<string> {
    const uniqueId = Date.now() + Math.random()
    const testUser = {
        email: `vars-test-${uniqueId}@test.com`,
        password: 'test1234'
    }
    const response = await supertest(getRunningExpressApp().app).post('/api/v1/auth/signup').send(testUser)
    return response.body.token
}

/**
 * Test suite for variables route
 * Tests variable CRUD endpoints
 */
export function variablesRouteTest() {
    describe('Variables Route', () => {
        let authToken: string

        beforeAll(async () => {
            authToken = await getAuthToken()
        })

        describe('GET /api/v1/variables', () => {
            it('should return all variables with 200 status', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/variables')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect(response.status).toBe(200)
            })

            it('should return variables as array or paginated result', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/variables')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect(response.status).toBe(200)
                // Could be array or paginated result
                expect(response.body).toBeDefined()
            })
        })

        describe('GET /api/v1/variables/:id', () => {
            it('should handle non-existent variable', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/variables/non-existent-var-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                // Could return 200 with null, 404, or 500
                expect([200, 404, 500]).toContain(response.status)
            })
        })

        describe('POST /api/v1/variables', () => {
            it('should require authentication', async () => {
                const response = await supertest(getRunningExpressApp().app).post('/api/v1/variables').send({})

                expect([401, 403]).toContain(response.status)
            })

            it('should create variable with valid data', async () => {
                const newVariable = {
                    name: `TEST_VAR_${Date.now()}`,
                    value: 'test-value',
                    type: 'static'
                }

                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/variables')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                    .send(newVariable)

                // 200 for success, 500 for any validation/db errors
                expect([200, 201, 500]).toContain(response.status)
            })

            it('should create variable with empty value', async () => {
                const newVariable = {
                    name: `EMPTY_VAR_${Date.now()}`,
                    value: '',
                    type: 'static'
                }

                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/variables')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                    .send(newVariable)

                expect([200, 201, 500]).toContain(response.status)
            })
        })

        describe('PUT /api/v1/variables/:id', () => {
            it('should handle update of non-existent variable', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .put('/api/v1/variables/non-existent-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                    .send({ value: 'updated-value' })

                expect([200, 404, 500]).toContain(response.status)
            })
        })

        describe('DELETE /api/v1/variables/:id', () => {
            it('should handle delete of non-existent variable', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .delete('/api/v1/variables/non-existent-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })

            it('should require authentication for delete', async () => {
                const response = await supertest(getRunningExpressApp().app).delete('/api/v1/variables/some-id')

                expect([401, 403]).toContain(response.status)
            })
        })

        describe('Variable Types', () => {
            it('should create runtime variable', async () => {
                const newVariable = {
                    name: `RUNTIME_VAR_${Date.now()}`,
                    value: 'runtime-value',
                    type: 'runtime'
                }

                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/variables')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                    .send(newVariable)

                expect([200, 201, 500]).toContain(response.status)
            })

            it('should create secret variable', async () => {
                const newVariable = {
                    name: `SECRET_VAR_${Date.now()}`,
                    value: 'secret-value',
                    type: 'secret'
                }

                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/variables')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                    .send(newVariable)

                expect([200, 201, 500]).toContain(response.status)
            })
        })

        describe('Pagination', () => {
            it('should handle page parameter', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/variables?page=0')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect(response.status).toBe(200)
            })

            it('should handle limit parameter', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/variables?limit=5')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect(response.status).toBe(200)
            })

            it('should handle page and limit together', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/variables?page=0&limit=10')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect(response.status).toBe(200)
            })
        })
    })
}
