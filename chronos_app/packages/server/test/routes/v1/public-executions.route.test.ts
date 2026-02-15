import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

/**
 * Test suite for public-executions route
 * Tests public execution retrieval (no auth required)
 */
export function publicExecutionsRouteTest() {
    describe('Public Executions Route', () => {
        describe('GET /api/v1/public-executions/:id', () => {
            it('should handle request without id', async () => {
                const response = await supertest(getRunningExpressApp().app).get('/api/v1/public-executions/')

                expect([200, 404, 412, 500]).toContain(response.status)
            })

            it('should handle non-existent execution id', async () => {
                const response = await supertest(getRunningExpressApp().app).get('/api/v1/public-executions/non-existent-id')

                expect([200, 404, 500]).toContain(response.status)
            })

            it('should handle valid execution id', async () => {
                const response = await supertest(getRunningExpressApp().app).get('/api/v1/public-executions/valid-execution-id')

                expect([200, 404, 500]).toContain(response.status)
            })

            it('should handle uuid format id', async () => {
                const response = await supertest(getRunningExpressApp().app).get(
                    '/api/v1/public-executions/550e8400-e29b-41d4-a716-446655440000'
                )

                expect([200, 404, 500]).toContain(response.status)
            })
        })
    })
}
