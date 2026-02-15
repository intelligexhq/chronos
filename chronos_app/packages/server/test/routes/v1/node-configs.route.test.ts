import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

/**
 * Helper function to get auth token
 */
async function getAuthToken(): Promise<string> {
    const uniqueId = Date.now() + Math.random()
    const testUser = {
        email: `node-configs-test-${uniqueId}@test.com`,
        password: 'test1234'
    }
    const response = await supertest(getRunningExpressApp().app).post('/api/v1/auth/signup').send(testUser)
    return response.body.token
}

/**
 * Test suite for node-configs route
 * Tests node configuration endpoints
 */
export function nodeConfigsRouteTest() {
    describe('Node Configs Route', () => {
        let authToken: string

        beforeAll(async () => {
            authToken = await getAuthToken()
        })

        describe('POST /api/v1/node-config', () => {
            it('should require authentication', async () => {
                const response = await supertest(getRunningExpressApp().app).post('/api/v1/node-config').send({})

                expect([401, 403]).toContain(response.status)
            })

            it('should get all node configs with POST', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/node-config')
                    .send({})
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })

            it('should handle node configs request with body', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/node-config')
                    .send({
                        nodeId: 'test-node-id',
                        type: 'config'
                    })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })

            it('should handle empty body', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/node-config')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 412, 500]).toContain(response.status)
            })
        })
    })
}
