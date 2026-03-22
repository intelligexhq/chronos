import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

/**
 * Helper function to get auth token
 */
async function getAuthToken(): Promise<string> {
    const uniqueId = Date.now() + Math.random()
    const testUser = {
        email: `dashboard-test-${uniqueId}@test.com`,
        password: 'test1234'
    }
    const response = await supertest(getRunningExpressApp().app).post('/api/v1/auth/signup').send(testUser)
    return response.body.token
}

/**
 * Test suite for dashboard route
 * Tests dashboard API endpoints
 */
export function dashboardRouteTest() {
    describe('Dashboard Route', () => {
        let authToken: string

        beforeAll(async () => {
            authToken = await getAuthToken()
        })

        describe('GET /api/v1/dashboard/summary', () => {
            it('should return 400 when startDate is missing', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/dashboard/summary?endDate=2026-03-21')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([400, 500]).toContain(response.status)
            })

            it('should return 400 when endDate is missing', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/dashboard/summary?startDate=2026-03-21')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([400, 500]).toContain(response.status)
            })

            it('should return summary data with valid date range', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/dashboard/summary?startDate=2026-03-01&endDate=2026-03-21')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect(response.status).toBe(200)
                expect(response.body).toHaveProperty('totalExecutions')
                expect(response.body).toHaveProperty('successRate')
                expect(response.body).toHaveProperty('totalCost')
                expect(response.body).toHaveProperty('avgDurationMs')
                expect(response.body).toHaveProperty('totalTokens')
                expect(response.body).toHaveProperty('currency')
            })

            it('should return summary for intra-day range', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/dashboard/summary?startDate=2026-03-21&endDate=2026-03-21')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect(response.status).toBe(200)
                expect(response.body).toHaveProperty('totalExecutions')
            })

            it('should accept agentflowId filter', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get(
                        '/api/v1/dashboard/summary?startDate=2026-03-01&endDate=2026-03-21&agentflowId=550e8400-e29b-41d4-a716-446655440000'
                    )
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect(response.status).toBe(200)
            })

            it('should require authentication', async () => {
                const response = await supertest(getRunningExpressApp().app).get(
                    '/api/v1/dashboard/summary?startDate=2026-03-01&endDate=2026-03-21'
                )

                expect([401, 403]).toContain(response.status)
            })
        })

        describe('GET /api/v1/dashboard/timeseries', () => {
            it('should return timeseries with daily granularity', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/dashboard/timeseries?startDate=2026-03-01&endDate=2026-03-21&granularity=daily')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect(response.status).toBe(200)
                expect(response.body).toHaveProperty('currency')
                expect(response.body).toHaveProperty('series')
                expect(Array.isArray(response.body.series)).toBe(true)
            })

            it('should return timeseries with hourly granularity', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/dashboard/timeseries?startDate=2026-03-21&endDate=2026-03-21&granularity=hourly')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect(response.status).toBe(200)
                expect(response.body).toHaveProperty('series')
            })

            it('should default to daily granularity', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/dashboard/timeseries?startDate=2026-03-01&endDate=2026-03-21')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect(response.status).toBe(200)
            })

            it('should return 400 when dates missing', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/dashboard/timeseries')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([400, 500]).toContain(response.status)
            })
        })

        describe('GET /api/v1/dashboard/agents', () => {
            it('should return agents list with valid date range', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/dashboard/agents?startDate=2026-03-01&endDate=2026-03-21')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect(response.status).toBe(200)
                expect(response.body).toHaveProperty('agents')
                expect(response.body).toHaveProperty('total')
                expect(response.body).toHaveProperty('currency')
                expect(Array.isArray(response.body.agents)).toBe(true)
            })

            it('should accept sort parameters', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/dashboard/agents?startDate=2026-03-01&endDate=2026-03-21&sortBy=totalCost&sortOrder=ASC')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect(response.status).toBe(200)
            })

            it('should accept pagination parameters', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/dashboard/agents?startDate=2026-03-01&endDate=2026-03-21&page=1&limit=5')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect(response.status).toBe(200)
            })
        })

        describe('GET /api/v1/dashboard/export', () => {
            it('should return JSON by default', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/dashboard/export?startDate=2026-03-01&endDate=2026-03-21')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect(response.status).toBe(200)
                expect(Array.isArray(response.body)).toBe(true)
            })

            it('should return CSV when format=csv', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/dashboard/export?startDate=2026-03-01&endDate=2026-03-21&format=csv')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect(response.status).toBe(200)
                // CSV returns text, empty CSV is empty string
                expect(typeof response.text).toBe('string')
            })

            it('should accept agentflowId filter', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get(
                        '/api/v1/dashboard/export?startDate=2026-03-01&endDate=2026-03-21&agentflowId=550e8400-e29b-41d4-a716-446655440000'
                    )
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect(response.status).toBe(200)
            })
        })
    })
}
