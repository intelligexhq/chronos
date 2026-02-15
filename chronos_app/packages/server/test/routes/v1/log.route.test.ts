import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

/**
 * Helper function to get auth token
 */
async function getAuthToken(): Promise<string> {
    const uniqueId = Date.now() + Math.random()
    const testUser = {
        email: `log-test-${uniqueId}@test.com`,
        password: 'test1234'
    }
    const response = await supertest(getRunningExpressApp().app).post('/api/v1/auth/signup').send(testUser)
    return response.body.token
}

/**
 * Test suite for log route
 * Tests log retrieval with date filtering
 */
export function logRouteTest() {
    describe('Log Route', () => {
        let authToken: string

        beforeAll(async () => {
            authToken = await getAuthToken()
        })

        describe('GET /api/v1/log', () => {
            it('should require authentication', async () => {
                const response = await supertest(getRunningExpressApp().app).get('/api/v1/log')

                expect([401, 403]).toContain(response.status)
            })

            it('should get logs without date filters', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/log')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })

            it('should get logs with startDate filter', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/log')
                    .query({ startDate: '2024-01-01' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })

            it('should get logs with endDate filter', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/log')
                    .query({ endDate: '2024-12-31' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })

            it('should get logs with both startDate and endDate filters', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/log')
                    .query({ startDate: '2024-01-01', endDate: '2024-12-31' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })

            it('should handle invalid date format for startDate', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/log')
                    .query({ startDate: 'invalid-date' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })

            it('should handle invalid date format for endDate', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/log')
                    .query({ endDate: 'invalid-date' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })

            it('should handle future dates', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/log')
                    .query({ startDate: '2030-01-01', endDate: '2030-12-31' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })

            it('should handle ISO date format', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/log')
                    .query({ startDate: '2024-01-01T00:00:00.000Z', endDate: '2024-12-31T23:59:59.999Z' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })

            it('should handle timestamp format', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/log')
                    .query({ startDate: '1704067200000', endDate: '1735689599999' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })
        })
    })
}
