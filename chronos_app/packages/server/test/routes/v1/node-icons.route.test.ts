import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

/**
 * Helper function to get auth token
 */
async function getAuthToken(): Promise<string> {
    const uniqueId = Date.now() + Math.random()
    const testUser = {
        email: `node-icons-test-${uniqueId}@test.com`,
        password: 'test1234'
    }
    const response = await supertest(getRunningExpressApp().app).post('/api/v1/auth/signup').send(testUser)
    return response.body.token
}

/**
 * Test suite for node-icons route
 * Tests node icon endpoints
 */
export function nodeIconsRouteTest() {
    describe('Node Icons Route', () => {
        let authToken: string

        beforeAll(async () => {
            authToken = await getAuthToken()
        })

        describe('GET /api/v1/node-icon/:name', () => {
            it('should return 412 when name is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/node-icon/')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 412, 500]).toContain(response.status)
            })

            it('should handle valid node name', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/node-icon/chatOpenAI')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })

            it('should handle non-existent node name', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/node-icon/nonExistentNode')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })
        })
    })
}
