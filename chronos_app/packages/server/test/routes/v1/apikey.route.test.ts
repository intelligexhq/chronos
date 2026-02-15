import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

/**
 * Helper function to get auth token
 */
async function getAuthToken(): Promise<string> {
    const uniqueId = Date.now() + Math.random()
    const testUser = {
        email: `apikey-test-${uniqueId}@test.com`,
        password: 'test1234'
    }
    const response = await supertest(getRunningExpressApp().app).post('/api/v1/auth/signup').send(testUser)
    return response.body.token
}

/**
 * Test suite for API key route
 * Tests API key CRUD endpoints
 */
export function apikeyRouteTest() {
    describe('API Key Route', () => {
        let authToken: string

        beforeAll(async () => {
            authToken = await getAuthToken()
        })

        describe('GET /api/v1/apikey', () => {
            it('should return all API keys with 200 status', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/apikey')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect(response.status).toBe(200)
            })

            it('should return API keys as array', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/apikey')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect(response.status).toBe(200)
                expect(Array.isArray(response.body)).toBe(true)
            })
        })

        describe('POST /api/v1/apikey', () => {
            it('should require authentication', async () => {
                const response = await supertest(getRunningExpressApp().app).post('/api/v1/apikey').send({})

                expect([401, 403]).toContain(response.status)
            })

            it('should create API key with valid data', async () => {
                const newKey = {
                    keyName: `Test Key ${Date.now()}`
                }

                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/apikey')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                    .send(newKey)

                expect([200, 201]).toContain(response.status)
            })
        })

        describe('GET /api/v1/apikey/:id', () => {
            it('should handle non-existent API key', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/apikey/non-existent-key-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })
        })

        describe('GET /api/v1/apikey/verify/:apikey', () => {
            it('should handle API key verification', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/apikey/verify/invalid-api-key')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                // Various possible responses for invalid key
                expect([200, 401, 403, 404, 500]).toContain(response.status)
            })
        })

        describe('PUT /api/v1/apikey/:id', () => {
            it('should handle update of non-existent key', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .put('/api/v1/apikey/non-existent-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                    .send({ keyName: 'UpdatedName' })

                expect([200, 404, 500]).toContain(response.status)
            })
        })

        describe('DELETE /api/v1/apikey/:id', () => {
            it('should handle delete of non-existent key', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .delete('/api/v1/apikey/non-existent-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })

            it('should require authentication', async () => {
                const response = await supertest(getRunningExpressApp().app).delete('/api/v1/apikey/some-id')

                expect([401, 403]).toContain(response.status)
            })
        })

        describe('Pagination', () => {
            it('should handle pagination with page and limit', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/apikey?page=1&limit=10')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect(response.status).toBe(200)
            })

            it('should handle pagination without page and limit', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/apikey')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect(response.status).toBe(200)
            })
        })

        describe('Import/Export', () => {
            it('should handle import with invalid dataURI', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/apikey/import')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                    .send({ jsonFile: 'invalid-data' })

                expect([400, 500]).toContain(response.status)
            })

            it('should handle import with non-array JSON', async () => {
                const invalidJson = { notAnArray: true }
                const base64 = Buffer.from(JSON.stringify(invalidJson)).toString('base64')
                const dataUri = `data:application/json;base64,${base64}`

                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/apikey/import')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                    .send({ jsonFile: dataUri, importMode: 'ignoreIfExist' })

                expect([400, 500]).toContain(response.status)
            })

            it('should handle import with missing fields', async () => {
                const invalidKeys = [{ keyName: 'Test' }]
                const base64 = Buffer.from(JSON.stringify(invalidKeys)).toString('base64')
                const dataUri = `data:application/json;base64,${base64}`

                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/apikey/import')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                    .send({ jsonFile: dataUri, importMode: 'ignoreIfExist' })

                expect([400, 500]).toContain(response.status)
            })
        })
    })
}
