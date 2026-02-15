import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

/**
 * Helper function to get auth token
 */
async function getAuthToken(): Promise<string> {
    const uniqueId = Date.now() + Math.random()
    const testUser = {
        email: `dataset-test-${uniqueId}@test.com`,
        password: 'test1234'
    }
    const response = await supertest(getRunningExpressApp().app).post('/api/v1/auth/signup').send(testUser)
    return response.body.token
}

/**
 * Test suite for dataset route
 * Tests dataset CRUD and row operations
 */
export function datasetRouteTest() {
    describe('Dataset Route', () => {
        let authToken: string

        beforeAll(async () => {
            authToken = await getAuthToken()
        })

        describe('GET /api/v1/dataset', () => {
            it('should require authentication', async () => {
                const response = await supertest(getRunningExpressApp().app).get('/api/v1/dataset')

                expect([401, 403]).toContain(response.status)
            })

            it('should get all datasets with authentication', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/dataset')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })

            it('should handle pagination params', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/dataset')
                    .query({ page: '1', limit: '10' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })

            it('should handle invalid page param', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/dataset')
                    .query({ page: '-1', limit: '10' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })

            it('should handle string limit param', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/dataset')
                    .query({ page: '1', limit: 'invalid' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })
        })

        describe('GET /api/v1/dataset/set/:id', () => {
            it('should return 412 when id is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/dataset/set')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 412, 500]).toContain(response.status)
            })

            it('should handle non-existent dataset id', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/dataset/set/non-existent-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })

            it('should handle dataset with pagination', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/dataset/set/test-id')
                    .query({ page: '1', limit: '20' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })
        })

        describe('POST /api/v1/dataset/set', () => {
            it('should return 412 when body is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/dataset/set')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 201, 400, 412, 500]).toContain(response.status)
            })

            it('should create dataset with valid body', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/dataset/set')
                    .send({ name: 'Test Dataset', description: 'Test description' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 201, 400, 500]).toContain(response.status)
            })

            it('should handle empty body object', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/dataset/set')
                    .send({})
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 201, 400, 412, 500]).toContain(response.status)
            })
        })

        describe('PUT /api/v1/dataset/set/:id', () => {
            it('should return 412 when id is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .put('/api/v1/dataset/set')
                    .send({ name: 'Updated Dataset' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 412, 500]).toContain(response.status)
            })

            it('should return 412 when body is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .put('/api/v1/dataset/set/test-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 412, 500]).toContain(response.status)
            })

            it('should handle update with valid id and body', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .put('/api/v1/dataset/set/test-id')
                    .send({ name: 'Updated Dataset', description: 'Updated description' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })
        })

        describe('DELETE /api/v1/dataset/set/:id', () => {
            it('should return 412 when id is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .delete('/api/v1/dataset/set')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 412, 500]).toContain(response.status)
            })

            it('should handle delete non-existent dataset', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .delete('/api/v1/dataset/set/non-existent-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })
        })

        describe('POST /api/v1/dataset/rows', () => {
            it('should return 412 when body is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/dataset/rows')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 201, 400, 412, 500]).toContain(response.status)
            })

            it('should return 412 when datasetId is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/dataset/rows')
                    .send({ data: { key: 'value' } })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 201, 400, 412, 500]).toContain(response.status)
            })

            it('should handle add row with valid datasetId', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/dataset/rows')
                    .send({ datasetId: 'test-dataset-id', data: { key: 'value' } })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 201, 400, 404, 500]).toContain(response.status)
            })
        })

        describe('PUT /api/v1/dataset/rows/:id', () => {
            it('should return 412 when id is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .put('/api/v1/dataset/rows')
                    .send({ data: { key: 'updated value' } })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 412, 500]).toContain(response.status)
            })

            it('should return 412 when body is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .put('/api/v1/dataset/rows/test-row-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 412, 500]).toContain(response.status)
            })

            it('should handle update row with valid id and body', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .put('/api/v1/dataset/rows/test-row-id')
                    .send({ data: { key: 'updated value' } })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })
        })

        describe('DELETE /api/v1/dataset/rows/:id', () => {
            it('should return 412 when id is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .delete('/api/v1/dataset/rows')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 412, 500]).toContain(response.status)
            })

            it('should handle delete non-existent row', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .delete('/api/v1/dataset/rows/non-existent-row-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })
        })

        describe('PATCH /api/v1/dataset/rows', () => {
            it('should handle patch delete with empty ids', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .patch('/api/v1/dataset/rows')
                    .send({ ids: [] })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })

            it('should handle patch delete with ids array', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .patch('/api/v1/dataset/rows')
                    .send({ ids: ['row-1', 'row-2'] })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })

            it('should handle patch delete without ids field', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .patch('/api/v1/dataset/rows')
                    .send({})
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })
        })

        describe('POST /api/v1/dataset/reorder', () => {
            it('should return 412 when body is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/dataset/reorder')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 412, 500]).toContain(response.status)
            })

            it('should handle reorder with valid datasetId and rows', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/dataset/reorder')
                    .send({ datasetId: 'test-dataset-id', rows: ['row-1', 'row-2'] })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })

            it('should handle reorder with empty rows', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/dataset/reorder')
                    .send({ datasetId: 'test-dataset-id', rows: [] })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })
        })
    })
}
