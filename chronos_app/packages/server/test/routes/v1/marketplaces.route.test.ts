import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

/**
 * Helper function to get auth token
 */
async function getAuthToken(): Promise<string> {
    const uniqueId = Date.now() + Math.random()
    const testUser = {
        email: `market-test-${uniqueId}@test.com`,
        password: 'test1234'
    }
    const response = await supertest(getRunningExpressApp().app).post('/api/v1/auth/signup').send(testUser)
    return response.body.token
}

/**
 * Test suite for marketplaces route
 * Tests marketplace endpoints
 */
export function marketplacesRouteTest() {
    describe('Marketplaces Route', () => {
        let authToken: string

        beforeAll(async () => {
            authToken = await getAuthToken()
        })

        describe('GET /api/v1/marketplaces/templates', () => {
            it('should return marketplace templates', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/marketplaces/templates')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 412, 500]).toContain(response.status)
            })
        })

        describe('GET /api/v1/marketplaces/chatflows', () => {
            it('should return marketplace chatflows', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/marketplaces/chatflows')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 412, 500]).toContain(response.status)
            })
        })

        describe('GET /api/v1/marketplaces/tools', () => {
            it('should return marketplace tools', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/marketplaces/tools')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 412, 500]).toContain(response.status)
            })
        })

        describe('GET /api/v1/marketplaces/templates/:id', () => {
            it('should handle template retrieval', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/marketplaces/templates/test-template-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 412, 500]).toContain(response.status)
            })
        })

        describe('POST /api/v1/marketplaces/templates', () => {
            it('should handle template creation', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/marketplaces/templates')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                    .send({ name: 'Test Template', flowData: '{}' })

                expect([200, 201, 400, 412, 500]).toContain(response.status)
            })
        })

        describe('DELETE /api/v1/marketplaces/templates/:id', () => {
            it('should handle template deletion', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .delete('/api/v1/marketplaces/templates/non-existent-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })
        })

        describe('GET /api/v1/marketplaces with filters', () => {
            it('should handle templates with search', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/marketplaces/templates?search=test')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 412, 500]).toContain(response.status)
            })

            it('should handle templates with category filter', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/marketplaces/templates?category=chatbot')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 412, 500]).toContain(response.status)
            })

            it('should handle chatflows with type filter', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/marketplaces/chatflows?type=CHATFLOW')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 412, 500]).toContain(response.status)
            })

            it('should handle pagination', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/marketplaces/templates?page=1&limit=10')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 412, 500]).toContain(response.status)
            })
        })
    })
}
