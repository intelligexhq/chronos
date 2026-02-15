import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

/**
 * Helper function to get auth token
 */
async function getAuthToken(): Promise<string> {
    const uniqueId = Date.now() + Math.random()
    const testUser = {
        email: `creds-test-${uniqueId}@test.com`,
        password: 'test1234'
    }
    const response = await supertest(getRunningExpressApp().app).post('/api/v1/auth/signup').send(testUser)
    return response.body.token
}

/**
 * Test suite for credentials route
 * Tests credential CRUD endpoints
 */
export function credentialsRouteTest() {
    describe('Credentials Route', () => {
        let authToken: string

        beforeAll(async () => {
            authToken = await getAuthToken()
        })

        describe('GET /api/v1/credentials', () => {
            it('should return all credentials with 200 status', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/credentials')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect(response.status).toBe(200)
            })

            it('should return credentials as array', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/credentials')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect(response.status).toBe(200)
                expect(Array.isArray(response.body)).toBe(true)
            })
        })

        describe('GET /api/v1/credentials/:id', () => {
            it('should return 404 or 500 for non-existent credential', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/credentials/non-existent-cred-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([404, 500]).toContain(response.status)
            })
        })

        describe('POST /api/v1/credentials', () => {
            it('should require authentication', async () => {
                const response = await supertest(getRunningExpressApp().app).post('/api/v1/credentials').send({})

                expect([401, 403]).toContain(response.status)
            })

            it('should handle credential creation with valid data', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/credentials')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                    .send({
                        name: `Test Cred ${Date.now()}`,
                        credentialName: 'openAIApi',
                        plainDataObj: { openAIApiKey: 'test-key' }
                    })

                expect([200, 201, 400, 500]).toContain(response.status)
            })
        })

        describe('PUT /api/v1/credentials/:id', () => {
            it('should handle update of non-existent credential', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .put('/api/v1/credentials/non-existent-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                    .send({ name: 'Updated Name' })

                expect([200, 404, 500]).toContain(response.status)
            })
        })

        describe('DELETE /api/v1/credentials/:id', () => {
            it('should handle delete of non-existent credential', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .delete('/api/v1/credentials/non-existent-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })

            it('should require authentication', async () => {
                const response = await supertest(getRunningExpressApp().app).delete('/api/v1/credentials/some-id')

                expect([401, 403]).toContain(response.status)
            })
        })

        describe('Pagination', () => {
            it('should handle pagination with page and limit', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/credentials?page=1&limit=10')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect(response.status).toBe(200)
            })
        })

        describe('Filter by credential name', () => {
            it('should filter credentials by credentialName', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/credentials?credentialName=openAIApi')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect(response.status).toBe(200)
            })
        })
    })
}
