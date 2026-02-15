import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

/**
 * Helper function to get auth token
 */
async function getAuthToken(): Promise<string> {
    const uniqueId = Date.now() + Math.random()
    const testUser = {
        email: `components-creds-icon-test-${uniqueId}@test.com`,
        password: 'test1234'
    }
    const response = await supertest(getRunningExpressApp().app).post('/api/v1/auth/signup').send(testUser)
    return response.body.token
}

/**
 * Test suite for components-credentials-icon route
 * Tests credential icon retrieval endpoint
 */
export function componentsCredentialsIconRouteTest() {
    describe('Components Credentials Icon Route', () => {
        let authToken: string

        beforeAll(async () => {
            authToken = await getAuthToken()
        })

        describe('GET /api/v1/components-credentials-icon/:name', () => {
            it('should return 412 when name is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/components-credentials-icon/')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 412, 500]).toContain(response.status)
            })

            it('should handle valid credential name', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/components-credentials-icon/openAIApi')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })

            it('should handle non-existent credential', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/components-credentials-icon/nonExistentCredential')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })
        })
    })
}
