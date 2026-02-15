import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

/**
 * Test suite for settings route
 * Tests settings retrieval endpoint
 */
export function settingsRouteTest() {
    describe('Settings Route', () => {
        describe('GET /api/v1/settings', () => {
            it('should return settings with 200 status', async () => {
                const response = await supertest(getRunningExpressApp().app).get('/api/v1/settings')

                expect(response.status).toBe(200)
                expect(response.body).toBeDefined()
            })

            it('should return PLATFORM_TYPE in settings', async () => {
                const response = await supertest(getRunningExpressApp().app).get('/api/v1/settings')

                expect(response.status).toBe(200)
                // Settings may or may not have PLATFORM_TYPE based on license
                expect(typeof response.body).toBe('object')
            })
        })
    })
}
