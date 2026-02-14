import { getErrorMessage } from '../../src/errors/utils'

/**
 * Test suite for error utility functions
 * Tests error message extraction from various error types
 */
export function errorUtilsTest() {
    describe('Error Utilities', () => {
        describe('getErrorMessage', () => {
            it('should extract message from Error object', () => {
                const error = new Error('Test error message')
                const result = getErrorMessage(error)
                expect(result).toBe('Test error message')
            })

            it('should extract message from object with message property', () => {
                const error = { message: 'Custom error message' }
                const result = getErrorMessage(error)
                expect(result).toBe('Custom error message')
            })

            it('should handle string input by converting to Error', () => {
                const result = getErrorMessage('Simple string error')
                expect(result).toBe('"Simple string error"')
            })

            it('should handle number input', () => {
                const result = getErrorMessage(404)
                expect(result).toBe('404')
            })

            it('should handle null input', () => {
                const result = getErrorMessage(null)
                expect(result).toBe('null')
            })

            it('should handle undefined input', () => {
                const result = getErrorMessage(undefined)
                // undefined gets converted to empty string via String(undefined) in error handling
                expect(result).toBe('')
            })

            it('should handle object without message property', () => {
                const error = { code: 500, status: 'error' }
                const result = getErrorMessage(error)
                expect(result).toBe('{"code":500,"status":"error"}')
            })

            it('should handle array input', () => {
                const error = ['error1', 'error2']
                const result = getErrorMessage(error)
                expect(result).toBe('["error1","error2"]')
            })

            it('should handle TypeError', () => {
                const error = new TypeError('Cannot read property of undefined')
                const result = getErrorMessage(error)
                expect(result).toBe('Cannot read property of undefined')
            })

            it('should handle SyntaxError', () => {
                const error = new SyntaxError('Unexpected token')
                const result = getErrorMessage(error)
                expect(result).toBe('Unexpected token')
            })

            it('should handle custom error classes', () => {
                class CustomError extends Error {
                    constructor(message: string) {
                        super(message)
                        this.name = 'CustomError'
                    }
                }
                const error = new CustomError('Custom error occurred')
                const result = getErrorMessage(error)
                expect(result).toBe('Custom error occurred')
            })

            it('should handle empty string message', () => {
                const error = new Error('')
                const result = getErrorMessage(error)
                expect(result).toBe('')
            })

            it('should handle boolean input', () => {
                const result = getErrorMessage(false)
                expect(result).toBe('false')
            })

            it('should handle empty object', () => {
                const result = getErrorMessage({})
                expect(result).toBe('{}')
            })

            it('should handle nested object with message', () => {
                const error = {
                    message: 'Outer message',
                    inner: { message: 'Inner message' }
                }
                const result = getErrorMessage(error)
                expect(result).toBe('Outer message')
            })

            it('should handle object with non-string message property', () => {
                const error = { message: 123 }
                const result = getErrorMessage(error)
                // Since message is not a string, it should stringify the object
                expect(result).toBe('{"message":123}')
            })
        })
    })
}
