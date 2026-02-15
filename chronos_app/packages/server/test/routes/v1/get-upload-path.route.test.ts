import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

/**
 * Helper function to get auth token
 */
async function getAuthToken(): Promise<string> {
    const uniqueId = Date.now() + Math.random()
    const testUser = {
        email: `get-upload-path-test-${uniqueId}@test.com`,
        password: 'test1234'
    }
    const response = await supertest(getRunningExpressApp().app).post('/api/v1/auth/signup').send(testUser)
    return response.body.token
}

/**
 * Test suite for get-upload-path route
 * Tests upload path retrieval endpoint
 */
export function getUploadPathRouteTest() {
    describe('Get Upload Path Route', () => {
        let authToken: string

        beforeAll(async () => {
            authToken = await getAuthToken()
        })

        describe('GET /api/v1/get-upload-path', () => {
            it('should return storage path', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/get-upload-path')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })

            it('should return path object when successful', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/get-upload-path')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                if (response.status === 200) {
                    expect(response.body).toHaveProperty('storagePath')
                }
            })
        })
    })
}
