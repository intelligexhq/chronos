import { InternalFlowiseError } from '../../src/errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'

/**
 * Test suite for InternalFlowiseError class
 * Tests custom error creation and properties
 */
export function internalFlowiseErrorTest() {
    describe('InternalFlowiseError', () => {
        it('should create error with status code and message', () => {
            const error = new InternalFlowiseError(StatusCodes.NOT_FOUND, 'Resource not found')

            expect(error).toBeInstanceOf(Error)
            expect(error).toBeInstanceOf(InternalFlowiseError)
            expect(error.statusCode).toBe(404)
            expect(error.message).toBe('Resource not found')
        })

        it('should create error with 500 status code', () => {
            const error = new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, 'Something went wrong')

            expect(error.statusCode).toBe(500)
            expect(error.message).toBe('Something went wrong')
        })

        it('should create error with 401 unauthorized status', () => {
            const error = new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Unauthorized')

            expect(error.statusCode).toBe(401)
            expect(error.message).toBe('Unauthorized')
        })

        it('should create error with 400 bad request status', () => {
            const error = new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Invalid input')

            expect(error.statusCode).toBe(400)
            expect(error.message).toBe('Invalid input')
        })

        it('should create error with 403 forbidden status', () => {
            const error = new InternalFlowiseError(StatusCodes.FORBIDDEN, 'Access denied')

            expect(error.statusCode).toBe(403)
            expect(error.message).toBe('Access denied')
        })

        it('should have a stack trace', () => {
            const error = new InternalFlowiseError(StatusCodes.NOT_FOUND, 'Test error')

            expect(error.stack).toBeDefined()
            // Stack trace starts with error message, includes file location
            expect(error.stack).toContain('Test error')
        })

        it('should be throwable and catchable', () => {
            expect(() => {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, 'Test throw')
            }).toThrow(InternalFlowiseError)
        })

        it('should preserve status code when caught', () => {
            try {
                throw new InternalFlowiseError(StatusCodes.CONFLICT, 'Conflict error')
            } catch (error) {
                expect((error as InternalFlowiseError).statusCode).toBe(409)
                expect((error as InternalFlowiseError).message).toBe('Conflict error')
            }
        })

        it('should work with custom numeric status codes', () => {
            const error = new InternalFlowiseError(418, "I'm a teapot")

            expect(error.statusCode).toBe(418)
            expect(error.message).toBe("I'm a teapot")
        })

        it('should handle empty message', () => {
            const error = new InternalFlowiseError(StatusCodes.NOT_FOUND, '')

            expect(error.statusCode).toBe(404)
            expect(error.message).toBe('')
        })

        it('should handle long error messages', () => {
            const longMessage = 'A'.repeat(1000)
            const error = new InternalFlowiseError(StatusCodes.BAD_REQUEST, longMessage)

            expect(error.message).toBe(longMessage)
            expect(error.message).toHaveLength(1000)
        })

        it('should be identifiable via instanceof check', () => {
            const error = new InternalFlowiseError(StatusCodes.NOT_FOUND, 'Test')
            const regularError = new Error('Regular error')

            expect(error instanceof InternalFlowiseError).toBe(true)
            expect(regularError instanceof InternalFlowiseError).toBe(false)
        })
    })
}
