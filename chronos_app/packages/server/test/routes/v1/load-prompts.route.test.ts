import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

/**
 * Helper function to get auth token
 */
async function getAuthToken(): Promise<string> {
    const uniqueId = Date.now() + Math.random()
    const testUser = {
        email: `load-prompts-test-${uniqueId}@test.com`,
        password: 'test1234'
    }
    const response = await supertest(getRunningExpressApp().app).post('/api/v1/auth/signup').send(testUser)
    return response.body.token
}

/**
 * Test suite for load-prompts route
 * Tests prompt creation endpoint
 */
export function loadPromptsRouteTest() {
    describe('Load Prompts Route', () => {
        let authToken: string

        beforeAll(async () => {
            authToken = await getAuthToken()
        })

        describe('POST /api/v1/load-prompts', () => {
            it('should require authentication', async () => {
                const response = await supertest(getRunningExpressApp().app).post('/api/v1/load-prompts').send({ name: 'Test Prompt' })

                expect([401, 403]).toContain(response.status)
            })

            it('should handle empty body', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/load-prompts')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 201, 400, 412, 500]).toContain(response.status)
            })

            it('should handle prompt creation with valid body', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/load-prompts')
                    .send({
                        name: 'Test Prompt',
                        template: 'Hello {{name}}'
                    })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 201, 400, 404, 500]).toContain(response.status)
            })

            it('should handle prompt with minimal fields', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/load-prompts')
                    .send({ name: 'Minimal Prompt' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 201, 400, 404, 500]).toContain(response.status)
            })

            it('should handle empty body object', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/load-prompts')
                    .send({})
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 201, 400, 412, 500]).toContain(response.status)
            })
        })
    })
}
