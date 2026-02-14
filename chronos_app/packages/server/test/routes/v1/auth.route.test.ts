import { StatusCodes } from 'http-status-codes'
import supertest from 'supertest'
import { getRunningExpressApp } from '../../../src/utils/getRunningExpressApp'

/**
 * Test suite for authentication routes
 * Tests the auth endpoints at /api/v1/auth/*
 */
export function authRouteTest() {
    describe('Auth Route', () => {
        const baseRoute = '/api/v1/auth'
        const testUser = {
            email: 'test@test.com',
            password: 'test1234'
        }
        let authToken: string

        describe('Auth Flow - Signup, Login, Me', () => {
            it('should successfully signup a new user', async () => {
                const response = await supertest(getRunningExpressApp().app).post(`${baseRoute}/signup`).send(testUser)

                expect(response.status).toEqual(StatusCodes.OK)
                expect(response.body.user).toBeDefined()
                expect(response.body.user.email).toEqual(testUser.email)
                expect(response.body.token).toBeDefined()
                authToken = response.body.token
            })

            it('should successfully login with the registered user', async () => {
                const response = await supertest(getRunningExpressApp().app).post(`${baseRoute}/login`).send(testUser)

                expect(response.status).toEqual(StatusCodes.OK)
                expect(response.body.user).toBeDefined()
                expect(response.body.user.email).toEqual(testUser.email)
                expect(response.body.token).toBeDefined()
                authToken = response.body.token
            })

            it('should return current user with valid JWT', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .get(`${baseRoute}/me`)
                    .set('Authorization', `Bearer ${authToken}`)

                expect(response.status).toEqual(StatusCodes.OK)
                expect(response.body.user).toBeDefined()
                expect(response.body.user.email).toEqual(testUser.email)
            })
        })

        describe(`POST ${baseRoute}/logout`, () => {
            it('should return 200 status and success message', async () => {
                const response = await supertest(getRunningExpressApp().app).post(`${baseRoute}/logout`)

                expect(response.status).toEqual(StatusCodes.OK)
                expect(response.body.message).toEqual('Logged out successfully')
            })
        })

        describe(`GET ${baseRoute}/me`, () => {
            it('should return 401 when not authenticated', async () => {
                const response = await supertest(getRunningExpressApp().app).get(`${baseRoute}/me`)

                expect(response.status).toEqual(StatusCodes.UNAUTHORIZED)
                expect(response.body.error).toEqual('Not authenticated')
            })
        })

        describe(`POST ${baseRoute}/signup`, () => {
            it('should return 400 when email is missing', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post(`${baseRoute}/signup`)
                    .send({ password: 'testpassword123' })

                expect(response.status).toEqual(StatusCodes.BAD_REQUEST)
                expect(response.body.error).toEqual('Email and password are required')
            })

            it('should return 400 when password is missing', async () => {
                const response = await supertest(getRunningExpressApp().app).post(`${baseRoute}/signup`).send({ email: 'test@example.com' })

                expect(response.status).toEqual(StatusCodes.BAD_REQUEST)
                expect(response.body.error).toEqual('Email and password are required')
            })

            it('should return 400 when password is too short', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post(`${baseRoute}/signup`)
                    .send({ email: 'test@example.com', password: 'short' })

                expect(response.status).toEqual(StatusCodes.BAD_REQUEST)
                expect(response.body.error).toEqual('Password must be at least 8 characters long')
            })
        })

        describe(`POST ${baseRoute}/login`, () => {
            it('should return 401 with invalid credentials', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post(`${baseRoute}/login`)
                    .send({ email: 'nonexistent@example.com', password: 'wrongpassword' })

                expect(response.status).toEqual(StatusCodes.UNAUTHORIZED)
                expect(response.body.error).toEqual('Invalid email or password')
            })

            it('should return 401 when email is missing', async () => {
                const response = await supertest(getRunningExpressApp().app)
                    .post(`${baseRoute}/login`)
                    .send({ password: 'testpassword123' })

                expect(response.status).toEqual(StatusCodes.UNAUTHORIZED)
                expect(response.body.error).toEqual('Email and password are required')
            })
        })
    })
}
