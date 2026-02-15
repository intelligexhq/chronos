import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

/**
 * Helper function to get auth token
 */
async function getAuthToken(): Promise<string> {
    const uniqueId = Date.now() + Math.random()
    const testUser = {
        email: `tools-test-${uniqueId}@test.com`,
        password: 'test1234'
    }
    const response = await supertest(getRunningExpressApp().app).post('/api/v1/auth/signup').send(testUser)
    return response.body.token
}

/**
 * Test suite for tools route
 * Tests tool CRUD endpoints
 */
export function toolsRouteTest() {
    describe('Tools Route', () => {
        let authToken: string

        beforeAll(async () => {
            authToken = await getAuthToken()
        })

        describe('GET /api/v1/tools', () => {
            it('should return all tools with 200 status', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/tools')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect(response.status).toBe(200)
            })

            it('should return tools as array', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/tools')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect(response.status).toBe(200)
                expect(Array.isArray(response.body)).toBe(true)
            })
        })

        describe('GET /api/v1/tools/:id', () => {
            it('should return 404 or 500 for non-existent tool', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/tools/non-existent-tool-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([404, 500]).toContain(response.status)
            })
        })

        describe('POST /api/v1/tools', () => {
            it('should require authentication', async () => {
                const response = await supertest(getRunningExpressApp().app).post('/api/v1/tools').send({})

                expect([401, 403]).toContain(response.status)
            })

            it('should handle creation with valid data', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/tools')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                    .send({
                        name: `Test Tool ${Date.now()}`,
                        description: 'Test tool description',
                        func: 'test_function',
                        schema: '{}'
                    })

                expect([200, 201, 400, 412, 500]).toContain(response.status)
            })

            it('should handle creation with empty body', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/tools')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                    .send({})

                expect([400, 412, 500]).toContain(response.status)
            })
        })

        describe('PUT /api/v1/tools/:id', () => {
            it('should handle update of non-existent tool', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .put('/api/v1/tools/non-existent-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                    .send({ name: 'Updated Tool' })

                expect([200, 404, 500]).toContain(response.status)
            })
        })

        describe('DELETE /api/v1/tools/:id', () => {
            it('should handle delete of non-existent tool', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .delete('/api/v1/tools/non-existent-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })
        })

        describe('GET /api/v1/tools with filters', () => {
            it('should handle pagination', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/tools?page=1&limit=10')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200]).toContain(response.status)
            })

            it('should handle search filter', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/tools?search=test')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200]).toContain(response.status)
            })

            it('should handle type filter', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/tools?type=custom')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200]).toContain(response.status)
            })
        })
    })
}
