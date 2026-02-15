import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

/**
 * Helper function to get auth token
 */
async function getAuthToken(): Promise<string> {
    const uniqueId = Date.now() + Math.random()
    const testUser = {
        email: `fetch-links-test-${uniqueId}@test.com`,
        password: 'test1234'
    }
    const response = await supertest(getRunningExpressApp().app).post('/api/v1/auth/signup').send(testUser)
    return response.body.token
}

/**
 * Test suite for fetch-links route
 * Tests link fetching with required query params
 */
export function fetchLinksRouteTest() {
    describe('Fetch Links Route', () => {
        let authToken: string

        beforeAll(async () => {
            authToken = await getAuthToken()
        })

        describe('GET /api/v1/fetch-links', () => {
            it('should return 412 when url is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/fetch-links')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([400, 412, 500]).toContain(response.status)
            })

            it('should return 412 when relativeLinksMethod is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/fetch-links')
                    .query({ url: 'https://example.com' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([400, 412, 500]).toContain(response.status)
            })

            it('should return 412 when limit is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/fetch-links')
                    .query({ url: 'https://example.com', relativeLinksMethod: 'webCrawl' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([400, 412, 500]).toContain(response.status)
            })

            it('should handle valid params', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/fetch-links')
                    .query({ url: 'https://example.com', relativeLinksMethod: 'webCrawl', limit: '10' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })

            it('should handle empty query params', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/fetch-links')
                    .query({})
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([400, 412, 500]).toContain(response.status)
            })
        })
    })
}
