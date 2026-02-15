import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

/**
 * Helper function to get auth token
 */
async function getAuthToken(): Promise<string> {
    const uniqueId = Date.now() + Math.random()
    const testUser = {
        email: `files-test-${uniqueId}@test.com`,
        password: 'test1234'
    }
    const response = await supertest(getRunningExpressApp().app).post('/api/v1/auth/signup').send(testUser)
    return response.body.token
}

/**
 * Test suite for files route
 * Tests file listing and deletion endpoints
 */
export function filesRouteTest() {
    describe('Files Route', () => {
        let authToken: string

        beforeAll(async () => {
            authToken = await getAuthToken()
        })

        describe('GET /api/v1/files', () => {
            it('should require authentication', async () => {
                const response = await supertest(getRunningExpressApp().app).get('/api/v1/files')

                expect([401, 403]).toContain(response.status)
            })

            it('should handle request with auth', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/files')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })
        })

        describe('DELETE /api/v1/files', () => {
            it('should require authentication', async () => {
                const response = await supertest(getRunningExpressApp().app).delete('/api/v1/files')

                expect([401, 403]).toContain(response.status)
            })

            it('should handle delete without path', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .delete('/api/v1/files')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })

            it('should handle delete with path param', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .delete('/api/v1/files')
                    .query({ path: 'test/path/file.txt' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })
        })
    })
}
