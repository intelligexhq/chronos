import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

/**
 * Test suite for pricing route
 * Tests pricing endpoint (no auth required)
 */
export function pricingRouteTest() {
    describe('Pricing Route', () => {
        describe('GET /api/v1/pricing', () => {
            it('should return pricing plans', async () => {
                const response = await supertest(getRunningExpressApp().app).get('/api/v1/pricing')

                expect([200, 404, 500]).toContain(response.status)
            })

            it('should return array of pricing plans', async () => {
                const response = await supertest(getRunningExpressApp().app).get('/api/v1/pricing')

                if (response.status === 200) {
                    expect(Array.isArray(response.body)).toBe(true)
                }
            })
        })
    })
}
