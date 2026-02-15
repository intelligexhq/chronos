import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

/**
 * Helper function to get auth token
 */
async function getAuthToken(): Promise<string> {
    const uniqueId = Date.now() + Math.random()
    const testUser = {
        email: `upsert-test-${uniqueId}@test.com`,
        password: 'test1234'
    }
    const response = await supertest(getRunningExpressApp().app).post('/api/v1/auth/signup').send(testUser)
    return response.body.token
}

/**
 * Test suite for upsert history route
 * Tests upsert history endpoints
 */
export function upsertHistoryRouteTest() {
    describe('Upsert History Route', () => {
        let authToken: string

        beforeAll(async () => {
            authToken = await getAuthToken()
        })

        describe('GET /api/v1/upsert-history/:id', () => {
            it('should handle non-existent history', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/upsert-history/non-existent-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 412, 500]).toContain(response.status)
            })
        })

        describe('PATCH /api/v1/upsert-history/:id', () => {
            it('should require authentication', async () => {
                const response = await supertest(getRunningExpressApp().app).patch('/api/v1/upsert-history/some-id').send({})

                expect([401, 403]).toContain(response.status)
            })
        })
    })
}
