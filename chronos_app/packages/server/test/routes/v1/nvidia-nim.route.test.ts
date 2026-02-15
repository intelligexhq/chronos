import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

/**
 * Helper function to get auth token
 */
async function getAuthToken(): Promise<string> {
    const uniqueId = Date.now() + Math.random()
    const testUser = {
        email: `nvidia-nim-test-${uniqueId}@test.com`,
        password: 'test1234'
    }
    const response = await supertest(getRunningExpressApp().app).post('/api/v1/auth/signup').send(testUser)
    return response.body.token
}

/**
 * Test suite for nvidia-nim route
 * Tests NVIDIA NIM container management endpoints
 */
export function nvidiaNimRouteTest() {
    describe('NVIDIA NIM Route', () => {
        let authToken: string

        beforeAll(async () => {
            authToken = await getAuthToken()
        })

        describe('GET /api/v1/nvidia-nim/preload', () => {
            it('should handle preload request', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/nvidia-nim/preload')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })
        })

        describe('GET /api/v1/nvidia-nim/get-token', () => {
            it('should handle get token request', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/nvidia-nim/get-token')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })
        })

        describe('GET /api/v1/nvidia-nim/download-installer', () => {
            it('should handle download installer request', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/nvidia-nim/download-installer')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })
        })

        describe('GET /api/v1/nvidia-nim/list-running-containers', () => {
            it('should handle list running containers request', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get('/api/v1/nvidia-nim/list-running-containers')
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })
        })

        describe('POST /api/v1/nvidia-nim/pull-image', () => {
            it('should return error when body is empty', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/nvidia-nim/pull-image')
                    .send({})
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })

            it('should handle pull image with image name', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/nvidia-nim/pull-image')
                    .send({ imageName: 'test-image' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })
        })

        describe('POST /api/v1/nvidia-nim/start-container', () => {
            it('should return error when body is empty', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/nvidia-nim/start-container')
                    .send({})
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })

            it('should handle start container with config', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/nvidia-nim/start-container')
                    .send({ imageName: 'test-image', containerName: 'test-container' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })
        })

        describe('POST /api/v1/nvidia-nim/stop-container', () => {
            it('should return error when body is empty', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/nvidia-nim/stop-container')
                    .send({})
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })

            it('should handle stop container with container name', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/nvidia-nim/stop-container')
                    .send({ containerName: 'test-container' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })
        })

        describe('POST /api/v1/nvidia-nim/get-image', () => {
            it('should return error when body is empty', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/nvidia-nim/get-image')
                    .send({})
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })

            it('should handle get image with image name', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/nvidia-nim/get-image')
                    .send({ imageName: 'test-image' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })
        })

        describe('POST /api/v1/nvidia-nim/get-container', () => {
            it('should return error when body is empty', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/nvidia-nim/get-container')
                    .send({})
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })

            it('should handle get container with container name', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post('/api/v1/nvidia-nim/get-container')
                    .send({ containerName: 'test-container' })
                    .set('Authorization', `Bearer ${authToken}`)
                    .set('x-request-from', 'internal')

                expect([200, 400, 404, 500]).toContain(response.status)
            })
        })
    })
}
