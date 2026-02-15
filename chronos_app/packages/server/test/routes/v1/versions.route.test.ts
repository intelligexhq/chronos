import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

/**
 * Test suite for versions route
 * Tests version retrieval endpoint
 */
export function versionsRouteTest() {
    describe('Versions Route', () => {
        describe('GET /api/v1/version', () => {
            it('should return version info with 200 status', async () => {
                const response = await supertest(getRunningExpressApp().app).get('/api/v1/version')

                expect(response.status).toBe(200)
                expect(response.body).toBeDefined()
            })

            it('should return version string in response', async () => {
                const response = await supertest(getRunningExpressApp().app).get('/api/v1/version')

                expect(response.status).toBe(200)
                expect(response.body).toHaveProperty('version')
                expect(typeof response.body.version).toBe('string')
            })

            it('should return semantic version format', async () => {
                const response = await supertest(getRunningExpressApp().app).get('/api/v1/version')

                expect(response.status).toBe(200)
                // Version should be in semver format like "1.0.0" or "1.0.1"
                expect(response.body.version).toMatch(/^\d+\.\d+\.\d+/)
            })
        })
    })
}
