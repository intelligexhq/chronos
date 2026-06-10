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

            // ─── cause-chain dedup ────────────────────────────────────────

            const withCause = (message: string, cause: unknown): Error => {
                // ES2022's `new Error(msg, { cause })` is post the server's TS target,
                // so set the cause via assignment instead.
                const err = new Error(message) as Error & { cause?: unknown }
                err.cause = cause
                return err
            }

            it('appends [Cause: ...] when cause has a distinct message', () => {
                const cause = new Error('inner reason')
                const wrapped = withCause('wrapper failed', cause)
                expect(getErrorMessage(wrapped)).toBe('wrapper failed [Cause: inner reason]')
            })

            it('suppresses duplicate cause when wrapper message is equal to cause message', () => {
                const cause = new Error('same message')
                const wrapped = withCause('same message', cause)
                expect(getErrorMessage(wrapped)).toBe('same message')
            })

            it('suppresses duplicate cause when wrapper embeds the cause message verbatim (prefix wrap)', () => {
                // This is the common `throw new Error(\`Error in X: \${err.message}\`, { cause: err })` pattern.
                // Before the fix, getErrorMessage produced "Error in X: msg [Cause: msg]".
                const cause = new Error('OpenRouter Endpoint URL must be exactly https://openrouter.ai/api/v1')
                const wrapped = withCause(`Error in Agent node: ${cause.message}`, cause)
                expect(getErrorMessage(wrapped)).toBe(
                    'Error in Agent node: OpenRouter Endpoint URL must be exactly https://openrouter.ai/api/v1'
                )
            })

            it('still chains through multi-level causes when each layer adds distinct content', () => {
                const root = new Error('root reason')
                const middle = withCause('middle context', root)
                const top = withCause('top context', middle)
                expect(getErrorMessage(top)).toBe('top context [Cause: middle context [Cause: root reason]]')
            })

            // ─── HTML-payload sanitizer ───────────────────────────────────

            it('replaces a 404 + HTML payload error body with a clean message', () => {
                const error = new Error('404 <!DOCTYPE html><html lang="en"><head><meta charSet="utf-8"/>...')
                expect(getErrorMessage(error)).toBe(
                    'HTTP 404 — provider returned an HTML response instead of JSON. The endpoint URL is most likely wrong; check the Endpoint URL on the model node.'
                )
            })

            it('replaces an unprefixed HTML payload with a clean message (no status hint)', () => {
                const error = new Error('<!DOCTYPE html><html>...</html>')
                expect(getErrorMessage(error)).toBe(
                    'provider returned an HTML response instead of JSON. The endpoint URL is most likely wrong; check the Endpoint URL on the model node.'
                )
            })

            it('replaces a bare <html> body too', () => {
                const error = new Error('<html><body>404 Not Found</body></html>')
                expect(getErrorMessage(error)).toMatch(/provider returned an HTML response/)
            })

            it('does NOT munge legitimate error messages that happen to contain angle brackets', () => {
                const error = new Error('Failed to call <missing_tool>')
                expect(getErrorMessage(error)).toBe('Failed to call <missing_tool>')
            })

            it('cleans HTML even when wrapped in a cause-chain', () => {
                const inner = new Error('500 <!DOCTYPE html><html>oops</html>')
                const wrapped = withCause('Error in Agent node', inner)
                const result = getErrorMessage(wrapped)
                // Wrapper message intact; inner cause's HTML cleaned + appended.
                expect(result).toContain('Error in Agent node')
                expect(result).toContain('HTTP 500 — provider returned an HTML response')
                expect(result).not.toContain('<!DOCTYPE')
            })
        })
    })
}
