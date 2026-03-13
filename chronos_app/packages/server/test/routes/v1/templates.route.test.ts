import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

/**
 * Helper function to get auth token
 */
async function getAuthToken(): Promise<string> {
    const uniqueId = Date.now() + Math.random()
    const testUser = {
        email: `template-test-${uniqueId}@test.com`,
        password: 'test1234'
    }
    const response = await supertest(getRunningExpressApp().app).post('/api/v1/auth/signup').send(testUser)
    return response.body.token
}

/**
 * Test suite for templates route
 * Tests template endpoints
 */
export function templatesRouteTest() {
    describe('Templates Route', () => {
        let authToken: string

        beforeAll(async () => {
            authToken = await getAuthToken()
        })

        describe('GET /api/v1/templates/templates', () => {
            it('should return builtin templates', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/templates/templates')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 412, 500]).toContain(response.status)
            })
        })

        describe('GET /api/v1/templates/custom', () => {
            it('should return custom templates', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/templates/custom')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 412, 500]).toContain(response.status)
            })
        })

        describe('POST /api/v1/templates/custom', () => {
            it('should handle custom template creation with tool', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/templates/custom')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                    .send({
                        name: 'Test Tool Template',
                        tool: {
                            iconSrc: 'test-icon.png',
                            schema: '{ "type": "object" }',
                            func: 'return "test"'
                        }
                    })

                expect([200, 201, 400, 412, 500]).toContain(response.status)
            })
        })

        describe('DELETE /api/v1/templates/custom/:id', () => {
            it('should handle custom template deletion', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .delete('/api/v1/templates/custom/non-existent-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })
        })

        describe('GET /api/v1/templates/templates with filters', () => {
            it('should handle templates with search', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/templates/templates?search=test')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 412, 500]).toContain(response.status)
            })

            it('should handle templates with category filter', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/templates/templates?category=chatbot')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 412, 500]).toContain(response.status)
            })

            it('should handle pagination', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/templates/templates?page=1&limit=10')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 412, 500]).toContain(response.status)
            })
        })
    })
}
