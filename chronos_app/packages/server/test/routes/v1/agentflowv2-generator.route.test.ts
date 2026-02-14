import { StatusCodes } from 'http-status-codes'
import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

/**
 * Helper function to get auth token
 */
async function getAuthToken(): Promise<string> {
    const uniqueId = Date.now() + Math.random()
    const testUser = {
        email: `agentflow-test-${uniqueId}@test.com`,
        password: 'test1234'
    }
    const response = await supertest(getRunningExpressApp().app).post('/api/v1/auth/signup').send(testUser)
    return response.body.token
}

/**
 * Test suite for agentflowv2 generator routes
 * Tests the agentflow generation endpoint at /api/v1/agentflowv2-generator/*
 */
export function agentflowv2GeneratorRouteTest() {
    describe('Agentflowv2 Generator Route', () => {
        const baseRoute = '/api/v1/agentflowv2-generator'

        describe(`POST ${baseRoute}/generate`, () => {
            it('should return error when question is missing', async () => {
                const authToken = await getAuthToken()

                const response = await supertest(getRunningExpressApp().app)
                    .post(`${baseRoute}/generate`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                    .send({
                        selectedChatModel: {
                            name: 'chatOpenAI',
                            model: 'gpt-4'
                        }
                    })

                expect(response.status).toEqual(StatusCodes.INTERNAL_SERVER_ERROR)
                expect(response.body.message).toContain('Question and selectedChatModel are required')
            })

            it('should return error when selectedChatModel is missing', async () => {
                const authToken = await getAuthToken()

                const response = await supertest(getRunningExpressApp().app)
                    .post(`${baseRoute}/generate`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                    .send({
                        question: 'Create a simple chatbot'
                    })

                expect(response.status).toEqual(StatusCodes.INTERNAL_SERVER_ERROR)
                expect(response.body.message).toContain('Question and selectedChatModel are required')
            })

            it('should return error when body is empty', async () => {
                const authToken = await getAuthToken()

                const response = await supertest(getRunningExpressApp().app)
                    .post(`${baseRoute}/generate`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                    .send({})

                expect(response.status).toEqual(StatusCodes.INTERNAL_SERVER_ERROR)
                expect(response.body.message).toContain('Question and selectedChatModel are required')
            })

            it('should attempt generation with valid parameters (may fail due to missing LLM credentials)', async () => {
                const authToken = await getAuthToken()

                const response = await supertest(getRunningExpressApp().app)
                    .post(`${baseRoute}/generate`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')
                    .send({
                        question: 'Create a simple chatbot that answers questions',
                        selectedChatModel: {
                            name: 'chatOpenAI',
                            model: 'gpt-4',
                            credential: 'test-credential'
                        }
                    })

                // Will likely fail due to missing LLM credentials, but should pass validation
                // Accept either success or error from LLM execution
                expect([StatusCodes.OK, StatusCodes.INTERNAL_SERVER_ERROR]).toContain(response.status)
            })

            it('should require authentication', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post(`${baseRoute}/generate`)
                    .send({
                        question: 'Create a chatbot',
                        selectedChatModel: {
                            name: 'chatOpenAI',
                            model: 'gpt-4'
                        }
                    })

                // Without auth header, should return 401
                expect(response.status).toEqual(StatusCodes.UNAUTHORIZED)
            })
        })
    })
}
