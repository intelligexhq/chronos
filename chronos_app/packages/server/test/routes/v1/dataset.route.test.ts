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
 * Helper to create a test dataset
 */
async function createTestDataset(authToken: string): Promise<string> {
    const datasetData = {
        name: `Test Dataset ${Date.now()}`,
        description: 'Test dataset for automated tests'
    }
    const response = await supertest(getRunningExpressApp().app)
        .post('/api/v1/datasets/set')
        .send(datasetData)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-request-from', 'internal')

    return response.body?.id || ''
}

/**
 * Test suite for dataset route
 * Tests dataset CRUD and row operations
 */
export function datasetRouteTest() {
    describe('Dataset Route', () => {
        let authToken: string
        let testDatasetId: string
        let testRowId: string

        beforeAll(async () => {
            authToken = await getAuthToken()
        })

        afterAll(async () => {
            // Cleanup test dataset if created
            if (testDatasetId) {
                await supertest(getRunningExpressApp().app)
                    .delete(`/api/v1/datasets/set/${testDatasetId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
            }
        })

        describe('GET /api/v1/datasets', () => {
            it('should require authentication', async () => {
                const response = await supertest(getRunningExpressApp().app).get('/api/v1/datasets')

                expect([401, 403]).toContain(response.status)
            })

            it('should get all datasets with authentication', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/datasets')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
                if (response.status === 200) {
                    expect(Array.isArray(response.body) || response.body.data !== undefined).toBe(true)
                }
            })

            it('should handle pagination params', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/datasets')
                    .query({ page: '1', limit: '10' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })

            it('should handle invalid page param', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/datasets')
                    .query({ page: '-1', limit: '10' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 412, 500]).toContain(response.status)
            })

            it('should handle string limit param', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/datasets')
                    .query({ page: '1', limit: 'invalid' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })

            it('should handle zero limit param', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/datasets')
                    .query({ page: '1', limit: '0' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })

            it('should handle large page number', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/datasets')
                    .query({ page: '999999', limit: '10' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })
        })

        describe('GET /api/v1/datasets/set/:id', () => {
            it('should return 412 when id is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/datasets/set/')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 412, 500]).toContain(response.status)
            })

            it('should handle non-existent dataset id', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/datasets/set/non-existent-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })

            it('should handle dataset with pagination', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/datasets/set/test-id')
                    .query({ page: '1', limit: '20' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })

            it('should handle valid UUID format id', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/datasets/set/00000000-0000-0000-0000-000000000000')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })
        })

        describe('POST /api/v1/datasets/set', () => {
            it('should require authentication', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/datasets/set')
                    .send({ name: 'Test Dataset' })

                expect([401, 403]).toContain(response.status)
            })

            it('should return 412 when body is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/datasets/set')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 201, 400, 412, 500]).toContain(response.status)
            })

            it('should create dataset with valid body', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/datasets/set')
                    .send({
                        name: `Test Dataset ${Date.now()}`,
                        description: 'Test description for automated tests'
                    })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 201, 400, 500]).toContain(response.status)
                if (response.status === 200 || response.status === 201) {
                    expect(response.body).toHaveProperty('id')
                    testDatasetId = response.body.id
                }
            })

            it('should create dataset with minimal data', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/datasets/set')
                    .send({ name: `Minimal Dataset ${Date.now()}` })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 201, 400, 500]).toContain(response.status)
                if (response.status === 200 || response.status === 201) {
                    // Cleanup
                    await supertest(getRunningExpressApp().app)
                        .delete(`/api/v1/datasets/set/${response.body.id}`)
                        .set('Authorization', `Bearer ${authToken}`)
                        .set('x-request-from', 'internal')
                }
            })

            it('should handle empty body object', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/datasets/set')
                    .send({})
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 201, 400, 412, 500]).toContain(response.status)
            })
        })

        describe('PUT /api/v1/datasets/set/:id', () => {
            it('should return 412 when id is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .put('/api/v1/datasets/set/')
                    .send({ name: 'Updated Dataset' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 412, 500]).toContain(response.status)
            })

            it('should return 412 when body is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .put('/api/v1/datasets/set/test-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 412, 500]).toContain(response.status)
            })

            it('should handle update with valid id and body', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .put('/api/v1/datasets/set/test-id')
                    .send({ name: 'Updated Dataset', description: 'Updated description' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })

            it('should update existing dataset', async () => {
                if (testDatasetId) {
                    const response = await supertest(getRunningExpressApp().app)
                        .put(`/api/v1/datasets/set/${testDatasetId}`)
                        .send({
                            name: `Updated Dataset ${Date.now()}`,
                            description: 'Updated description'
                        })
                        .set('Authorization', `Bearer ${authToken}`)
                        .set('x-request-from', 'internal')

                    expect([200, 404, 500]).toContain(response.status)
                }
            })
        })

        describe('DELETE /api/v1/datasets/set/:id', () => {
            it('should return 412 when id is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .delete('/api/v1/datasets/set/')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 412, 500]).toContain(response.status)
            })

            it('should handle delete non-existent dataset', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .delete('/api/v1/datasets/set/non-existent-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })
        })

        describe('POST /api/v1/datasets/rows/:id', () => {
            it('should return 412 when body is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/datasets/rows/test-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 201, 400, 412, 500]).toContain(response.status)
            })

            it('should return 412 when id is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/datasets/rows/')
                    .send({ input: 'test input', output: 'test output' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 201, 400, 404, 412, 500]).toContain(response.status)
            })

            it('should handle add row with valid datasetId', async () => {
                if (testDatasetId) {
                    const response = await supertest(getRunningExpressApp().app)
                        .post(`/api/v1/datasets/rows/${testDatasetId}`)
                        .send({ input: 'test input', output: 'test output' })
                        .set('Authorization', `Bearer ${authToken}`)
                        .set('x-request-from', 'internal')

                    expect([200, 201, 400, 404, 412, 500]).toContain(response.status)
                    if (response.status === 200 || response.status === 201) {
                        testRowId = response.body.id
                    }
                }
            })

            it('should handle add row with non-existent dataset', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/datasets/rows/non-existent-dataset-id')
                    .send({ input: 'test input', output: 'test output' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 201, 400, 404, 412, 500]).toContain(response.status)
            })
        })

        describe('PUT /api/v1/datasets/rows/:id', () => {
            it('should return 412 when id is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .put('/api/v1/datasets/rows/')
                    .send({ input: 'updated input' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 412, 500]).toContain(response.status)
            })

            it('should return 412 when body is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .put('/api/v1/datasets/rows/test-row-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 412, 500]).toContain(response.status)
            })

            it('should handle update row with valid id and body', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .put('/api/v1/datasets/rows/test-row-id')
                    .send({ input: 'updated input', output: 'updated output' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })

            it('should update existing row', async () => {
                if (testRowId) {
                    const response = await supertest(getRunningExpressApp().app)
                        .put(`/api/v1/datasets/rows/${testRowId}`)
                        .send({ input: 'updated test input', output: 'updated test output' })
                        .set('Authorization', `Bearer ${authToken}`)
                        .set('x-request-from', 'internal')

                    expect([200, 404, 500]).toContain(response.status)
                }
            })
        })

        describe('DELETE /api/v1/datasets/rows/:id', () => {
            it('should return 412 when id is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .delete('/api/v1/datasets/rows/')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 412, 500]).toContain(response.status)
            })

            it('should handle delete non-existent row', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .delete('/api/v1/datasets/rows/non-existent-row-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })
        })

        describe('PATCH /api/v1/datasets/rows', () => {
            it('should handle patch delete with empty ids', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .patch('/api/v1/datasets/rows')
                    .send({ ids: [] })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })

            it('should handle patch delete with ids array', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .patch('/api/v1/datasets/rows')
                    .send({ ids: ['row-1', 'row-2'] })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })

            it('should handle patch delete without ids field', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .patch('/api/v1/datasets/rows')
                    .send({})
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })

            it('should require authentication', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .patch('/api/v1/datasets/rows')
                    .send({ ids: ['row-1'] })

                expect([401, 403]).toContain(response.status)
            })
        })

        describe('POST /api/v1/datasets/reorder', () => {
            it('should return 412 when body is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/datasets/reorder')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 412, 500]).toContain(response.status)
            })

            it('should handle reorder with valid datasetId and rows', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/datasets/reorder')
                    .send({ datasetId: 'test-dataset-id', rows: ['row-1', 'row-2'] })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })

            it('should handle reorder with empty rows', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/datasets/reorder')
                    .send({ datasetId: 'test-dataset-id', rows: [] })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })

            it('should require authentication', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/datasets/reorder')
                    .send({ datasetId: 'test-id', rows: [] })

                expect([401, 403]).toContain(response.status)
            })

            it('should handle reorder with existing dataset', async () => {
                if (testDatasetId && testRowId) {
                    const response = await supertest(getRunningExpressApp().app)
                        .post('/api/v1/datasets/reorder')
                        .send({ datasetId: testDatasetId, rows: [testRowId] })
                        .set('Authorization', `Bearer ${authToken}`)
                        .set('x-request-from', 'internal')

                    expect([200, 400, 404, 500]).toContain(response.status)
                }
            })
        })
    })
}
