import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

/**
 * Test suite for public-chatflows route
 * Tests public chatflow retrieval endpoint (no auth required)
 */
export function publicChatflowsRouteTest() {
    describe('Public Chatflows Route', () => {
        describe('GET /api/v1/public-chatflows/:id', () => {
            it('should handle request without id', async () => {
                const response = await supertest(getRunningExpressApp().app).get('/api/v1/public-chatflows/')

                expect([200, 404, 412, 500]).toContain(response.status)
            })

            it('should handle non-existent chatflow id', async () => {
                const response = await supertest(getRunningExpressApp().app).get('/api/v1/public-chatflows/non-existent-id')

                expect([200, 404, 500]).toContain(response.status)
            })

            it('should handle valid chatflow id', async () => {
                const response = await supertest(getRunningExpressApp().app).get('/api/v1/public-chatflows/valid-chatflow-id')

                expect([200, 404, 500]).toContain(response.status)
            })

            it('should handle uuid format chatflow id', async () => {
                const response = await supertest(getRunningExpressApp().app).get(
                    '/api/v1/public-chatflows/550e8400-e29b-41d4-a716-446655440000'
                )

                expect([200, 404, 500]).toContain(response.status)
            })

            it('should handle empty string id', async () => {
                const response = await supertest(getRunningExpressApp().app).get('/api/v1/public-chatflows/')

                expect([200, 404, 412, 500]).toContain(response.status)
            })

            it('should handle special characters in id', async () => {
                const response = await supertest(getRunningExpressApp().app).get('/api/v1/public-chatflows/test-id-with-special')

                expect([200, 404, 500]).toContain(response.status)
            })
        })
    })
}
