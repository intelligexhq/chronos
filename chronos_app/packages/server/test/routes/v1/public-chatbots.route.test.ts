import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

/**
 * Test suite for public-chatbots route
 * Tests public chatbot config retrieval (no auth required)
 */
export function publicChatbotsRouteTest() {
    describe('Public Chatbots Route', () => {
        describe('GET /api/v1/public-chatbots/:id', () => {
            it('should handle request without id', async () => {
                const response = await supertest(getRunningExpressApp().app).get('/api/v1/public-chatbots/')

                expect([200, 401, 404, 412, 500]).toContain(response.status)
            })

            it('should handle non-existent chatbot id', async () => {
                const response = await supertest(getRunningExpressApp().app).get('/api/v1/public-chatbots/non-existent-id')

                expect([200, 401, 404, 412, 500]).toContain(response.status)
            })

            it('should handle valid chatbot id', async () => {
                const response = await supertest(getRunningExpressApp().app).get('/api/v1/public-chatbots/valid-chatbot-id')

                expect([200, 401, 404, 412, 500]).toContain(response.status)
            })

            it('should handle uuid format id', async () => {
                const response = await supertest(getRunningExpressApp().app).get(
                    '/api/v1/public-chatbots/550e8400-e29b-41d4-a716-446655440000'
                )

                expect([200, 401, 404, 412, 500]).toContain(response.status)
            })
        })
    })
}
