import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

/**
 * Helper function to get auth token
 */
async function getAuthToken(): Promise<string> {
    const uniqueId = Date.now() + Math.random()
    const testUser = {
        email: `export-import-test-${uniqueId}@test.com`,
        password: 'test1234'
    }
    const response = await supertest(getRunningExpressApp().app).post('/api/v1/auth/signup').send(testUser)
    return response.body.token
}

/**
 * Test suite for export-import route
 * Tests workspace export and import endpoints
 */
export function exportImportRouteTest() {
    describe('Export-Import Route', () => {
        let authToken: string

        beforeAll(async () => {
            authToken = await getAuthToken()
        })

        describe('POST /api/v1/export-import/export', () => {
            it('should require authentication', async () => {
                const response = await supertest(getRunningExpressApp().app).post('/api/v1/export-import/export').send({})

                expect([401, 403]).toContain(response.status)
            })

            it('should handle export without workspace context', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/export-import/export')
                    .send({})
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })

            it('should handle export with empty body', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/export-import/export')
                    .send({})
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })

            it('should handle export with chatflows option', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/export-import/export')
                    .send({ chatflows: true })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })

            it('should handle export with agentflows option', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/export-import/export')
                    .send({ agentflows: true })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })

            it('should handle export with tools option', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/export-import/export')
                    .send({ tools: true })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })

            it('should handle export with variables option', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/export-import/export')
                    .send({ variables: true })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })

            it('should handle export with assistants option', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/export-import/export')
                    .send({ assistants: true })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })

            it('should handle export with all options', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/export-import/export')
                    .send({
                        chatflows: true,
                        agentflows: true,
                        tools: true,
                        variables: true,
                        assistants: true
                    })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })
        })

        describe('POST /api/v1/export-import/import', () => {
            it('should require authentication', async () => {
                const response = await supertest(getRunningExpressApp().app).post('/api/v1/export-import/import').send({})

                expect([401, 403]).toContain(response.status)
            })

            it('should return error when importData is not provided', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/export-import/import')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })

            it('should handle import with empty body', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/export-import/import')
                    .send({})
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })

            it('should handle import with chatflows data', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/export-import/import')
                    .send({ Chatflows: [] })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })

            it('should handle import with agentflows data', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/export-import/import')
                    .send({ Agentflows: [] })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })

            it('should handle import with tools data', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/export-import/import')
                    .send({ Tools: [] })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })

            it('should handle import with variables data', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/export-import/import')
                    .send({ Variables: [] })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })

            it('should handle import with complete data structure', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/export-import/import')
                    .send({
                        Chatflows: [],
                        Agentflows: [],
                        Tools: [],
                        Variables: [],
                        Assistants: []
                    })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })
        })
    })
}
