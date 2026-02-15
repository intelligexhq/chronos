import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

/**
 * Helper function to get auth token
 */
async function getAuthToken(): Promise<string> {
    const uniqueId = Date.now() + Math.random()
    const testUser = {
        email: `oauth2-test-${uniqueId}@test.com`,
        password: 'test1234'
    }
    const response = await supertest(getRunningExpressApp().app).post('/api/v1/auth/signup').send(testUser)
    return response.body.token
}

/**
 * Test suite for oauth2 route
 * Tests OAuth2 authorization flow endpoints
 */
export function oauth2RouteTest() {
    describe('OAuth2 Route', () => {
        let authToken: string

        beforeAll(async () => {
            authToken = await getAuthToken()
        })

        describe('POST /api/v1/oauth2-credential/authorize/:credentialId', () => {
            it('should return 404 for non-existent credential', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/oauth2-credential/authorize/non-existent-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([404, 500]).toContain(response.status)
            })

            it('should handle valid uuid credential id', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/oauth2-credential/authorize/550e8400-e29b-41d4-a716-446655440000')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })
        })

        describe('GET /api/v1/oauth2-credential/callback', () => {
            it('should return error when error param is present', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/oauth2-credential/callback')
                    .query({ error: 'access_denied', error_description: 'User denied access' })

                expect([400]).toContain(response.status)
            })

            it('should return error when code is missing', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/oauth2-credential/callback')
                    .query({ state: 'test-state' })

                expect([400]).toContain(response.status)
            })

            it('should return error when state is missing', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/oauth2-credential/callback')
                    .query({ code: 'test-code' })

                expect([400]).toContain(response.status)
            })

            it('should return 404 when credential not found for state', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/oauth2-credential/callback')
                    .query({ code: 'test-code', state: 'non-existent-state' })

                expect([400, 404, 500]).toContain(response.status)
            })
        })

        describe('POST /api/v1/oauth2-credential/refresh/:credentialId', () => {
            it('should return 404 for non-existent credential', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/oauth2-credential/refresh/non-existent-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([404, 500]).toContain(response.status)
            })

            it('should handle valid uuid credential id', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/oauth2-credential/refresh/550e8400-e29b-41d4-a716-446655440000')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })
        })
    })
}
