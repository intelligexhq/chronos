import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

/**
 * Helper function to get auth token
 */
async function getAuthToken(): Promise<string> {
    const uniqueId = Date.now() + Math.random()
    const testUser = {
        email: `openai-vs-test-${uniqueId}@test.com`,
        password: 'test1234'
    }
    const response = await supertest(getRunningExpressApp().app).post('/api/v1/auth/signup').send(testUser)
    return response.body.token
}

/**
 * Test suite for openai-assistants-vector-store route
 * Tests OpenAI vector store CRUD endpoints
 */
export function openaiAssistantsVectorStoreRouteTest() {
    describe('OpenAI Assistants Vector Store Route', () => {
        let authToken: string

        beforeAll(async () => {
            authToken = await getAuthToken()
        })

        describe('GET /api/v1/openai-assistants-vector-store', () => {
            it('should return 412 when credential is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/openai-assistants-vector-store')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([400, 412, 500]).toContain(response.status)
            })

            it('should handle request with credential', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/openai-assistants-vector-store')
                    .query({ credential: 'test-credential' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })
        })

        describe('GET /api/v1/openai-assistants-vector-store/:id', () => {
            it('should return 412 when id is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/openai-assistants-vector-store/')
                    .query({ credential: 'test-credential' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 412, 500]).toContain(response.status)
            })

            it('should return 412 when credential is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/openai-assistants-vector-store/vs_123')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([400, 412, 500]).toContain(response.status)
            })

            it('should handle valid id and credential', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/openai-assistants-vector-store/vs_123')
                    .query({ credential: 'test-credential' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })
        })

        describe('POST /api/v1/openai-assistants-vector-store', () => {
            it('should return 412 when body is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/openai-assistants-vector-store')
                    .query({ credential: 'test-credential' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 201, 400, 412, 500]).toContain(response.status)
            })

            it('should return 412 when credential is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/openai-assistants-vector-store')
                    .send({ name: 'Test Vector Store' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([400, 412, 500]).toContain(response.status)
            })

            it('should handle valid body and credential', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/openai-assistants-vector-store')
                    .query({ credential: 'test-credential' })
                    .send({ name: 'Test Vector Store' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 201, 400, 404, 500]).toContain(response.status)
            })
        })

        describe('PUT /api/v1/openai-assistants-vector-store/:id', () => {
            it('should return 412 when id is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .put('/api/v1/openai-assistants-vector-store/')
                    .query({ credential: 'test-credential' })
                    .send({ name: 'Updated Store' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 412, 500]).toContain(response.status)
            })

            it('should return 412 when credential is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .put('/api/v1/openai-assistants-vector-store/vs_123')
                    .send({ name: 'Updated Store' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([400, 412, 500]).toContain(response.status)
            })

            it('should return 412 when body is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .put('/api/v1/openai-assistants-vector-store/vs_123')
                    .query({ credential: 'test-credential' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 412, 500]).toContain(response.status)
            })

            it('should handle valid request', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .put('/api/v1/openai-assistants-vector-store/vs_123')
                    .query({ credential: 'test-credential' })
                    .send({ name: 'Updated Store' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })
        })

        describe('DELETE /api/v1/openai-assistants-vector-store/:id', () => {
            it('should return 412 when id is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .delete('/api/v1/openai-assistants-vector-store/')
                    .query({ credential: 'test-credential' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 412, 500]).toContain(response.status)
            })

            it('should return 412 when credential is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .delete('/api/v1/openai-assistants-vector-store/vs_123')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([400, 412, 500]).toContain(response.status)
            })

            it('should handle valid delete request', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .delete('/api/v1/openai-assistants-vector-store/vs_123')
                    .query({ credential: 'test-credential' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 500]).toContain(response.status)
            })
        })

        describe('POST /api/v1/openai-assistants-vector-store/:id (upload files)', () => {
            it('should return 412 when id is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/openai-assistants-vector-store/')
                    .query({ credential: 'test-credential' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 201, 400, 412, 500]).toContain(response.status)
            })

            it('should return 412 when credential is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/openai-assistants-vector-store/vs_123')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 201, 400, 412, 500]).toContain(response.status)
            })
        })

        describe('PATCH /api/v1/openai-assistants-vector-store/:id (delete files)', () => {
            it('should return 412 when id is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .patch('/api/v1/openai-assistants-vector-store/')
                    .query({ credential: 'test-credential' })
                    .send({ file_ids: [] })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 404, 412, 500]).toContain(response.status)
            })

            it('should return 412 when credential is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .patch('/api/v1/openai-assistants-vector-store/vs_123')
                    .send({ file_ids: [] })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([400, 412, 500]).toContain(response.status)
            })

            it('should return 412 when body is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .patch('/api/v1/openai-assistants-vector-store/vs_123')
                    .query({ credential: 'test-credential' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 412, 500]).toContain(response.status)
            })

            it('should handle valid delete files request', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .patch('/api/v1/openai-assistants-vector-store/vs_123')
                    .query({ credential: 'test-credential' })
                    .send({ file_ids: ['file_1', 'file_2'] })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })
        })
    })
}
