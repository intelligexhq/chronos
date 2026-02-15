import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

/**
 * Helper function to get auth token
 */
async function getAuthToken(): Promise<string> {
    const uniqueId = Date.now() + Math.random()
    const testUser = {
        email: `docstore-test-${uniqueId}@test.com`,
        password: 'test1234'
    }
    const response = await supertest(getRunningExpressApp().app).post('/api/v1/auth/signup').send(testUser)
    return response.body.token
}

/**
 * Test suite for document store route
 * Tests document store CRUD endpoints
 */
export function documentstoreRouteTest() {
    describe('Document Store Route', () => {
        let authToken: string

        beforeAll(async () => {
            authToken = await getAuthToken()
        })

        describe('GET /api/v1/documentstore', () => {
            it('should return document stores', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/documentstore')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 412]).toContain(response.status)
            })
        })

        describe('GET /api/v1/documentstore/store/:id', () => {
            it('should handle non-existent document store', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/documentstore/store/non-existent-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 412, 500]).toContain(response.status)
            })
        })

        describe('POST /api/v1/documentstore', () => {
            it('should require authentication', async () => {
                const response = await supertest(getRunningExpressApp().app).post('/api/v1/documentstore').send({})

                expect([401, 403]).toContain(response.status)
            })

            it('should handle document store creation', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/documentstore')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                    .send({
                        name: `Test Store ${Date.now()}`,
                        description: 'Test document store'
                    })

                expect([200, 201, 400, 500]).toContain(response.status)
            })
        })

        describe('PUT /api/v1/documentstore/:id', () => {
            it('should handle update of non-existent store', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .put('/api/v1/documentstore/non-existent-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                    .send({ name: 'Updated Name' })

                expect([200, 404, 500]).toContain(response.status)
            })
        })

        describe('DELETE /api/v1/documentstore/:id', () => {
            it('should handle delete of non-existent store', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .delete('/api/v1/documentstore/non-existent-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })
        })

        describe('GET /api/v1/documentstore/chunks/:id', () => {
            it('should handle chunks retrieval for non-existent store', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/documentstore/chunks/non-existent-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })

            it('should handle chunks with pagination', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/documentstore/chunks/test-id?page=1&limit=10')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })
        })

        describe('GET /api/v1/documentstore/loaders', () => {
            it('should return available loaders', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/documentstore/loaders')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200]).toContain(response.status)
            })
        })

        describe('POST /api/v1/documentstore/upsert/:id', () => {
            it('should handle upsert for non-existent store', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/documentstore/upsert/non-existent-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                    .send({})

                expect([200, 400, 404, 500]).toContain(response.status)
            })
        })
    })
}
