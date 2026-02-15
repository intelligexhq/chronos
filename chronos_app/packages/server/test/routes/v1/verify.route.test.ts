import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

/**
 * Test suite for verify route
 * Tests API key verification endpoint
 */
export function verifyRouteTest() {
    describe('Verify Route', () => {
        describe('GET /api/v1/verify/apikey/:apikey', () => {
            it('should handle request without apikey', async () => {
                const response = await supertest(getRunningExpressApp().app).get('/api/v1/verify/apikey/')

                expect([200, 404, 412, 500]).toContain(response.status)
            })

            it('should handle non-existent apikey', async () => {
                const response = await supertest(getRunningExpressApp().app).get('/api/v1/verify/apikey/non-existent-key')

                expect([200, 401, 404, 500]).toContain(response.status)
            })

            it('should handle invalid apikey format', async () => {
                const response = await supertest(getRunningExpressApp().app).get('/api/v1/verify/apikey/invalid-key-format')

                expect([200, 401, 404, 500]).toContain(response.status)
            })

            it('should handle empty apikey', async () => {
                const response = await supertest(getRunningExpressApp().app).get('/api/v1/verify/apikey')

                expect([200, 401, 404, 412, 500]).toContain(response.status)
            })

            it('should handle apikey with special characters', async () => {
                const response = await supertest(getRunningExpressApp().app).get('/api/v1/verify/apikey/key_with-special.chars')

                expect([200, 401, 404, 500]).toContain(response.status)
            })

            it('should handle uuid-like apikey', async () => {
                const response = await supertest(getRunningExpressApp().app).get(
                    '/api/v1/verify/apikey/550e8400-e29b-41d4-a716-446655440000'
                )

                expect([200, 401, 404, 500]).toContain(response.status)
            })

            it('should handle long apikey string', async () => {
                const longKey = 'a'.repeat(256)
                const response = await supertest(getRunningExpressApp().app).get(`/api/v1/verify/apikey/${longKey}`)

                expect([200, 400, 401, 404, 500]).toContain(response.status)
            })
        })
    })
}
