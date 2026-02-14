import { StatusCodes } from 'http-status-codes'
import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

/**
 * Test suite for the ping route
 * Tests the health check endpoint at /api/v1/ping
 */
export function pingRouteTest() {
    describe('Ping Route', () => {
        const route = '/api/v1/ping'

        describe(`GET ${route}`, () => {
            it('should return a 200 status code', async () => {
                const response = await supertest(getRunningExpressApp().app).get(route)
                expect(response.status).toEqual(StatusCodes.OK)
            })

            it('should return "pong" as the response text', async () => {
                const response = await supertest(getRunningExpressApp().app).get(route)
                expect(response.text).toEqual('pong')
            })
        })
    })
}
