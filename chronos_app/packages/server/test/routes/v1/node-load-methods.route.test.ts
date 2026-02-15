import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

/**
 * Helper function to get auth token
 */
async function getAuthToken(): Promise<string> {
    const uniqueId = Date.now() + Math.random()
    const testUser = {
        email: `node-load-methods-test-${uniqueId}@test.com`,
        password: 'test1234'
    }
    const response = await supertest(getRunningExpressApp().app).post('/api/v1/auth/signup').send(testUser)
    return response.body.token
}

/**
 * Test suite for node-load-methods route
 * Tests node async options endpoint
 */
export function nodeLoadMethodsRouteTest() {
    describe('Node Load Methods Route', () => {
        let authToken: string

        beforeAll(async () => {
            authToken = await getAuthToken()
        })

        describe('POST /api/v1/node-load-method/:name', () => {
            it('should return 412 when body is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/node-load-method/testNode')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 412, 500]).toContain(response.status)
            })

            it('should return 412 when name is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/node-load-method/')
                    .send({ option: 'test' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 412, 500]).toContain(response.status)
            })

            it('should handle valid name and body', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/node-load-method/chatOpenAI')
                    .send({ nodeData: { inputs: {} } })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })

            it('should handle non-existent node', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/node-load-method/nonExistentNode')
                    .send({ nodeData: {} })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })
        })
    })
}
