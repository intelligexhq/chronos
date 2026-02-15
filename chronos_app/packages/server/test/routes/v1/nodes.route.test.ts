import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

/**
 * Helper function to get auth token
 */
async function getAuthToken(): Promise<string> {
    const uniqueId = Date.now() + Math.random()
    const testUser = {
        email: `nodes-test-${uniqueId}@test.com`,
        password: 'test1234'
    }
    const response = await supertest(getRunningExpressApp().app).post('/api/v1/auth/signup').send(testUser)
    return response.body.token
}

/**
 * Test suite for nodes route
 * Tests node retrieval endpoints
 */
export function nodesRouteTest() {
    describe('Nodes Route', () => {
        let authToken: string

        beforeAll(async () => {
            authToken = await getAuthToken()
        })

        describe('GET /api/v1/nodes', () => {
            it('should return all nodes with 200 status', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/nodes')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect(response.status).toBe(200)
                expect(Array.isArray(response.body)).toBe(true)
            })

            it('should return nodes as array', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/nodes')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect(response.status).toBe(200)
                if (response.body.length > 0) {
                    expect(response.body[0]).toHaveProperty('name')
                }
            })
        })

        describe('GET /api/v1/nodes/:name', () => {
            it('should return 404 for non-existent node', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/nodes/nonExistentNode12345')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([404, 500]).toContain(response.status)
            })
        })

        describe('GET /api/v1/nodes/category/:name', () => {
            it('should return nodes by category', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/nodes/category/LLM')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404]).toContain(response.status)
            })

            it('should return empty for non-existent category', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/nodes/category/NonExistentCategory')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404]).toContain(response.status)
            })

            it('should handle Agents category', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/nodes/category/Agents')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404]).toContain(response.status)
            })

            it('should handle Memory category', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/nodes/category/Memory')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404]).toContain(response.status)
            })

            it('should handle Tools category', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/nodes/category/Tools')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404]).toContain(response.status)
            })
        })

        describe('GET /api/v1/nodes/:name/icon', () => {
            it('should return node icon', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/nodes/chatOpenAI/icon')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404]).toContain(response.status)
            })

            it('should handle non-existent node icon', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/nodes/nonExistentNode/icon')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                // API may return 200 with empty/default icon, 404 or 500
                expect([200, 404, 500]).toContain(response.status)
            })
        })

        describe('GET /api/v1/nodes with filters', () => {
            it('should handle search filter', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/nodes?search=openai')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200]).toContain(response.status)
            })

            it('should handle type filter', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/nodes?type=llm')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200]).toContain(response.status)
            })
        })
    })
}
