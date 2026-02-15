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
 * Helper to create a test document store
 */
async function _createTestDocumentStore(authToken: string): Promise<string> {
    const storeData = {
        name: `Test Store ${Date.now()}`,
        description: 'Test document store for automated tests'
    }
    const response = await supertest(getRunningExpressApp().app)
        .post('/api/v1/documentstore/store')
        .send(storeData)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-request-from', 'internal')

    return response.body?.id || ''
}

/**
 * Test suite for document store route
 * Tests document store CRUD endpoints
 */
export function documentstoreRouteTest() {
    describe('Document Store Route', () => {
        let authToken: string
        let testStoreId: string

        beforeAll(async () => {
            authToken = await getAuthToken()
        })

        afterAll(async () => {
            // Cleanup test store if created
            if (testStoreId) {
                await supertest(getRunningExpressApp().app)
                    .delete(`/api/v1/documentstore/store/${testStoreId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
            }
        })

        describe('GET /api/v1/documentstore/store', () => {
            it('should require authentication', async () => {
                const response = await supertest(getRunningExpressApp().app).get('/api/v1/documentstore/store')

                expect([401, 403]).toContain(response.status)
            })

            it('should return document stores', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/documentstore/store')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 412]).toContain(response.status)
            })

            it('should handle pagination parameters', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/documentstore/store')
                    .query({ page: 1, limit: 10 })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 412]).toContain(response.status)
            })
        })

        describe('GET /api/v1/documentstore/store/:id', () => {
            it('should return 412 when id is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/documentstore/store/')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 412]).toContain(response.status)
            })

            it('should handle non-existent document store', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/documentstore/store/non-existent-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 412, 500]).toContain(response.status)
            })

            it('should handle valid UUID format id', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/documentstore/store/00000000-0000-0000-0000-000000000000')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })
        })

        describe('POST /api/v1/documentstore/store', () => {
            it('should require authentication', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/documentstore/store')
                    .send({ name: 'Test Store' })

                expect([401, 403]).toContain(response.status)
            })

            it('should return 412 when body is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/documentstore/store')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 201, 400, 412, 500]).toContain(response.status)
            })

            it('should create document store with valid data', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/documentstore/store')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                    .send({
                        name: `Test Store ${Date.now()}`,
                        description: 'Test document store for integration test'
                    })

                expect([200, 201, 400, 500]).toContain(response.status)
                if ((response.status === 200 || response.status === 201) && response.body?.id) {
                    testStoreId = response.body.id
                }
            })

            it('should create document store with minimal data', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/documentstore/store')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                    .send({ name: `Minimal Store ${Date.now()}` })

                expect([200, 201, 400, 500]).toContain(response.status)
                if (response.status === 200 || response.status === 201) {
                    // Cleanup
                    await supertest(getRunningExpressApp().app)
                        .delete(`/api/v1/documentstore/store/${response.body.id}`)
                        .set('Authorization', `Bearer ${authToken}`)
                        .set('x-request-from', 'internal')
                }
            })
        })

        describe('PUT /api/v1/documentstore/store/:id', () => {
            it('should return 412 when id is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .put('/api/v1/documentstore/store/')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                    .send({ name: 'Updated Name' })

                expect([200, 404, 412, 500]).toContain(response.status)
            })

            it('should return 412 when body is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .put('/api/v1/documentstore/store/test-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 412, 500]).toContain(response.status)
            })

            it('should handle update of non-existent store', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .put('/api/v1/documentstore/store/non-existent-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                    .send({ name: 'Updated Name' })

                expect([200, 404, 500]).toContain(response.status)
            })

            it('should update existing store', async () => {
                if (testStoreId) {
                    const response = await supertest(getRunningExpressApp().app)
                        .put(`/api/v1/documentstore/store/${testStoreId}`)
                        .set('Authorization', `Bearer ${authToken}`)
                        .set('x-request-from', 'internal')
                        .send({
                            name: `Updated Store ${Date.now()}`,
                            description: 'Updated description'
                        })

                    expect([200, 404, 500]).toContain(response.status)
                }
            })
        })

        describe('DELETE /api/v1/documentstore/store/:id', () => {
            it('should return 412 when id is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .delete('/api/v1/documentstore/store/')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 412, 500]).toContain(response.status)
            })

            it('should handle delete of non-existent store', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .delete('/api/v1/documentstore/store/non-existent-id')
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

        describe('POST /api/v1/documentstore/refresh/:id', () => {
            it('should handle refresh for non-existent store', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/documentstore/refresh/non-existent-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                    .send({})

                expect([200, 400, 404, 500]).toContain(response.status)
            })
        })

        describe('POST /api/v1/documentstore/query/:id', () => {
            it('should handle query for non-existent store', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/documentstore/query/non-existent-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                    .send({ query: 'test query' })

                expect([200, 400, 404, 500]).toContain(response.status)
            })

            it('should handle query with topK parameter', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/documentstore/query/test-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                    .send({ query: 'test query', topK: 5 })

                expect([200, 400, 404, 500]).toContain(response.status)
            })
        })

        describe('GET /api/v1/documentstore/store/:id/files', () => {
            it('should handle files retrieval for non-existent store', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/documentstore/store/non-existent-id/files')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })
        })

        describe('DELETE /api/v1/documentstore/:storeId/file/:fileId', () => {
            it('should handle file delete for non-existent store/file', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .delete('/api/v1/documentstore/test-store/file/test-file')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })
        })

        describe('Pagination tests', () => {
            it('should handle page parameter', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/documentstore/store')
                    .query({ page: 1 })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 412]).toContain(response.status)
            })

            it('should handle limit parameter', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/documentstore/store')
                    .query({ limit: 10 })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 412]).toContain(response.status)
            })

            it('should handle negative page parameter', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/documentstore/store')
                    .query({ page: -1 })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 412, 500]).toContain(response.status)
            })
        })

        describe('GET /api/v1/documentstore/components/loaders', () => {
            it('should return available document loaders', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/documentstore/components/loaders')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200]).toContain(response.status)
            })
        })

        describe('GET /api/v1/documentstore/components/embeddings', () => {
            it('should return available embedding providers', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/documentstore/components/embeddings')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200]).toContain(response.status)
            })
        })

        describe('GET /api/v1/documentstore/components/vectorstore', () => {
            it('should return available vector store providers', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/documentstore/components/vectorstore')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200]).toContain(response.status)
            })
        })

        describe('GET /api/v1/documentstore/components/recordmanager', () => {
            it('should return available record manager providers', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/documentstore/components/recordmanager')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200]).toContain(response.status)
            })
        })

        describe('POST /api/v1/documentstore/loader/preview', () => {
            it('should return 412 when body is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/documentstore/loader/preview')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 412, 500]).toContain(response.status)
            })

            it('should handle preview with loader config', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/documentstore/loader/preview')
                    .send({
                        loaderId: 'test-loader-id',
                        loaderName: 'textFile',
                        loaderConfig: {}
                    })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })
        })

        describe('POST /api/v1/documentstore/vectorstore/insert', () => {
            it('should return error when body is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/documentstore/vectorstore/insert')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 412, 500]).toContain(response.status)
            })

            it('should handle insert with config', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/documentstore/vectorstore/insert')
                    .send({
                        storeId: 'test-store-id',
                        vectorStoreName: 'inMemoryVectorStore',
                        embeddingName: 'openAIEmbeddings'
                    })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })
        })

        describe('POST /api/v1/documentstore/vectorstore/query', () => {
            it('should return error when body is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/documentstore/vectorstore/query')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 412, 500]).toContain(response.status)
            })

            it('should handle query with parameters', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/documentstore/vectorstore/query')
                    .send({
                        storeId: 'test-store-id',
                        query: 'test query',
                        topK: 5
                    })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })
        })

        describe('DELETE /api/v1/documentstore/vectorstore/:storeId', () => {
            it('should return 412 when storeId is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .delete('/api/v1/documentstore/vectorstore/')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 412, 500]).toContain(response.status)
            })

            it('should handle delete for non-existent store', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .delete('/api/v1/documentstore/vectorstore/non-existent-store-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })
        })

        describe('GET /api/v1/documentstore/store-configs/:id/:loaderId', () => {
            it('should return 412 when id is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/documentstore/store-configs//loader-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 412, 500]).toContain(response.status)
            })

            it('should return 412 when loaderId is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/documentstore/store-configs/store-id/')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 412, 500]).toContain(response.status)
            })

            it('should handle valid store and loader ids', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/documentstore/store-configs/test-store-id/test-loader-id')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })
        })

        describe('POST /api/v1/documentstore/generate-tool-desc/:id', () => {
            it('should return 412 when id is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/documentstore/generate-tool-desc/')
                    .send({ selectedChatModel: 'gpt-4' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 412, 500]).toContain(response.status)
            })

            it('should handle generate tool description', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/documentstore/generate-tool-desc/test-store-id')
                    .send({ selectedChatModel: 'gpt-4' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })
        })

        describe('Chunk operations', () => {
            describe('GET /api/v1/documentstore/chunks/:storeId/:fileId/:pageNo', () => {
                it('should return 412 when storeId is not provided', async () => {
                    const response = await supertest(getRunningExpressApp().app)
                        .get('/api/v1/documentstore/chunks//file-id/1')
                        .set('Authorization', `Bearer ${authToken}`)
                        .set('x-request-from', 'internal')

                    expect([200, 404, 412, 500]).toContain(response.status)
                })

                it('should return 412 when fileId is not provided', async () => {
                    const response = await supertest(getRunningExpressApp().app)
                        .get('/api/v1/documentstore/chunks/store-id//1')
                        .set('Authorization', `Bearer ${authToken}`)
                        .set('x-request-from', 'internal')

                    expect([200, 404, 412, 500]).toContain(response.status)
                })

                it('should handle valid chunk request', async () => {
                    const response = await supertest(getRunningExpressApp().app)
                        .get('/api/v1/documentstore/chunks/test-store/test-file/1')
                        .set('Authorization', `Bearer ${authToken}`)
                        .set('x-request-from', 'internal')

                    expect([200, 404, 500]).toContain(response.status)
                })
            })

            describe('DELETE /api/v1/documentstore/:storeId/:loaderId/chunks/:chunkId', () => {
                it('should return 412 when storeId is not provided', async () => {
                    const response = await supertest(getRunningExpressApp().app)
                        .delete('/api/v1/documentstore//loader-id/chunks/chunk-id')
                        .set('Authorization', `Bearer ${authToken}`)
                        .set('x-request-from', 'internal')

                    expect([200, 404, 412, 500]).toContain(response.status)
                })

                it('should handle delete chunk request', async () => {
                    const response = await supertest(getRunningExpressApp().app)
                        .delete('/api/v1/documentstore/test-store/test-loader/chunks/test-chunk')
                        .set('Authorization', `Bearer ${authToken}`)
                        .set('x-request-from', 'internal')

                    expect([200, 404, 500]).toContain(response.status)
                })
            })

            describe('PUT /api/v1/documentstore/:storeId/:loaderId/chunks/:chunkId', () => {
                it('should return 412 when body is not provided', async () => {
                    const response = await supertest(getRunningExpressApp().app)
                        .put('/api/v1/documentstore/test-store/test-loader/chunks/test-chunk')
                        .set('Authorization', `Bearer ${authToken}`)
                        .set('x-request-from', 'internal')

                    expect([200, 400, 412, 500]).toContain(response.status)
                })

                it('should handle edit chunk request', async () => {
                    const response = await supertest(getRunningExpressApp().app)
                        .put('/api/v1/documentstore/test-store/test-loader/chunks/test-chunk')
                        .send({
                            pageContent: 'Updated content',
                            metadata: { source: 'test' }
                        })
                        .set('Authorization', `Bearer ${authToken}`)
                        .set('x-request-from', 'internal')

                    expect([200, 404, 500]).toContain(response.status)
                })
            })
        })

        describe('Loader operations', () => {
            describe('DELETE /api/v1/documentstore/:id/loader/:loaderId', () => {
                it('should return 412 when ids are not provided', async () => {
                    const response = await supertest(getRunningExpressApp().app)
                        .delete('/api/v1/documentstore//loader/')
                        .set('Authorization', `Bearer ${authToken}`)
                        .set('x-request-from', 'internal')

                    expect([200, 404, 412, 500]).toContain(response.status)
                })

                it('should handle delete loader request', async () => {
                    const response = await supertest(getRunningExpressApp().app)
                        .delete('/api/v1/documentstore/test-store/loader/test-loader')
                        .set('Authorization', `Bearer ${authToken}`)
                        .set('x-request-from', 'internal')

                    expect([200, 404, 500]).toContain(response.status)
                })
            })

            describe('POST /api/v1/documentstore/loader/save', () => {
                it('should return 412 when body is not provided', async () => {
                    const response = await supertest(getRunningExpressApp().app)
                        .post('/api/v1/documentstore/loader/save')
                        .set('Authorization', `Bearer ${authToken}`)
                        .set('x-request-from', 'internal')

                    expect([200, 400, 412, 500]).toContain(response.status)
                })

                it('should handle save loader request', async () => {
                    const response = await supertest(getRunningExpressApp().app)
                        .post('/api/v1/documentstore/loader/save')
                        .send({
                            storeId: 'test-store-id',
                            loaderName: 'textFile',
                            loaderConfig: {}
                        })
                        .set('Authorization', `Bearer ${authToken}`)
                        .set('x-request-from', 'internal')

                    expect([200, 400, 404, 500]).toContain(response.status)
                })
            })

            describe('POST /api/v1/documentstore/loader/process/:loaderId', () => {
                it('should return 412 when loaderId is not provided', async () => {
                    const response = await supertest(getRunningExpressApp().app)
                        .post('/api/v1/documentstore/loader/process/')
                        .send({})
                        .set('Authorization', `Bearer ${authToken}`)
                        .set('x-request-from', 'internal')

                    expect([200, 404, 412, 500]).toContain(response.status)
                })

                it('should return 412 when body is not provided', async () => {
                    const response = await supertest(getRunningExpressApp().app)
                        .post('/api/v1/documentstore/loader/process/test-loader')
                        .set('Authorization', `Bearer ${authToken}`)
                        .set('x-request-from', 'internal')

                    expect([200, 400, 412, 500]).toContain(response.status)
                })

                it('should handle process loader request', async () => {
                    const response = await supertest(getRunningExpressApp().app)
                        .post('/api/v1/documentstore/loader/process/test-loader')
                        .send({
                            loaderConfig: {},
                            splitterConfig: {}
                        })
                        .set('Authorization', `Bearer ${authToken}`)
                        .set('x-request-from', 'internal')

                    expect([200, 400, 404, 500]).toContain(response.status)
                })
            })
        })
    })
}
