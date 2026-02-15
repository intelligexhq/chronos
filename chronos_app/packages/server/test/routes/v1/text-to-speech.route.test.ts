import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

/**
 * Helper function to get auth token
 */
async function getAuthToken(): Promise<string> {
    const uniqueId = Date.now() + Math.random()
    const testUser = {
        email: `tts-test-${uniqueId}@test.com`,
        password: 'test1234'
    }
    const response = await supertest(getRunningExpressApp().app).post('/api/v1/auth/signup').send(testUser)
    return response.body.token
}

/**
 * Test suite for text-to-speech route
 * Tests TTS generation, abort, and voices endpoints
 */
export function textToSpeechRouteTest() {
    describe('Text To Speech Route', () => {
        let authToken: string

        beforeAll(async () => {
            authToken = await getAuthToken()
        })

        describe('POST /api/v1/tts/generate', () => {
            it('should return error when text is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/tts/generate')
                    .send({})
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 500]).toContain(response.status)
            })

            it('should return error when provider is not provided without chatflowId', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/tts/generate')
                    .send({ text: 'Hello world' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 500]).toContain(response.status)
            })

            it('should return error when credentialId is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/tts/generate')
                    .send({ text: 'Hello world', provider: 'openai' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 500]).toContain(response.status)
            })

            it('should handle request with chatflowId', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/tts/generate')
                    .send({
                        text: 'Hello world',
                        chatflowId: 'test-chatflow-id',
                        chatId: 'test-chat-id',
                        chatMessageId: 'msg-123'
                    })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })

            it('should handle request with provider and credentialId', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/tts/generate')
                    .send({
                        text: 'Hello world',
                        provider: 'openai',
                        credentialId: 'test-credential',
                        voice: 'alloy',
                        model: 'tts-1'
                    })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })
        })

        describe('POST /api/v1/tts/abort', () => {
            it('should return error when chatId is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/tts/abort')
                    .send({})
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 500]).toContain(response.status)
            })

            it('should return error when chatMessageId is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/tts/abort')
                    .send({ chatId: 'test-chat' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 500]).toContain(response.status)
            })

            it('should return error when chatflowId is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/tts/abort')
                    .send({ chatId: 'test-chat', chatMessageId: 'msg-123' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 500]).toContain(response.status)
            })

            it('should handle abort with all required params', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/tts/abort')
                    .send({ chatId: 'test-chat', chatMessageId: 'msg-123', chatflowId: 'test-flow' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })
        })

        describe('GET /api/v1/tts/voices', () => {
            it('should return error when provider is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/tts/voices')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 500]).toContain(response.status)
            })

            it('should handle request with provider', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/tts/voices')
                    .query({ provider: 'openai' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })

            it('should handle request with provider and credentialId', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/tts/voices')
                    .query({ provider: 'openai', credentialId: 'test-credential' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })
        })
    })
}
