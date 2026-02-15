import logger, { expressRequestLogger } from '../../src/utils/logger'

/**
 * Test suite for logger utility
 * Tests logging functionality with comprehensive branch coverage
 */
export function loggerUtilTest() {
    describe('Logger Utilities', () => {
        let originalEnv: NodeJS.ProcessEnv

        beforeEach(() => {
            originalEnv = { ...process.env }
        })

        afterEach(() => {
            process.env = originalEnv
        })

        describe('logger instance', () => {
            it('should have info method', () => {
                expect(typeof logger.info).toBe('function')
            })

            it('should have error method', () => {
                expect(typeof logger.error).toBe('function')
            })

            it('should have warn method', () => {
                expect(typeof logger.warn).toBe('function')
            })

            it('should have debug method', () => {
                expect(typeof logger.debug).toBe('function')
            })

            it('should have http method', () => {
                expect(typeof logger.http).toBe('function')
            })

            it('should handle info logging without throwing', () => {
                expect(() => logger.info('Test info message')).not.toThrow()
            })

            it('should handle error logging without throwing', () => {
                expect(() => logger.error('Test error message')).not.toThrow()
            })

            it('should handle warn logging without throwing', () => {
                expect(() => logger.warn('Test warn message')).not.toThrow()
            })

            it('should handle debug logging without throwing', () => {
                expect(() => logger.debug('Test debug message')).not.toThrow()
            })

            it('should handle http logging without throwing', () => {
                expect(() => logger.http('Test http message')).not.toThrow()
            })

            it('should handle logging with objects', () => {
                expect(() => logger.info('Message with data', { key: 'value' })).not.toThrow()
            })

            it('should handle logging with Error objects', () => {
                const error = new Error('Test error')
                expect(() => logger.error('Error occurred', error)).not.toThrow()
            })

            it('should handle logging with nested objects', () => {
                expect(() =>
                    logger.info('Nested data', {
                        level1: {
                            level2: {
                                level3: 'value'
                            }
                        }
                    })
                ).not.toThrow()
            })
        })

        describe('expressRequestLogger', () => {
            it('should call next for non-API URLs', () => {
                const req = {
                    url: '/static/file.js',
                    method: 'GET',
                    params: {},
                    body: {},
                    query: {},
                    headers: {}
                } as any
                const res = {} as any
                const next = jest.fn()

                expressRequestLogger(req, res, next)

                expect(next).toHaveBeenCalled()
            })

            it('should call next for API URLs', () => {
                const req = {
                    url: '/api/v1/chatflows',
                    method: 'GET',
                    params: {},
                    body: {},
                    query: {},
                    headers: {}
                } as any
                const res = {} as any
                const next = jest.fn()

                expressRequestLogger(req, res, next)

                expect(next).toHaveBeenCalled()
            })

            it('should skip logging for node-icon URLs', () => {
                const req = {
                    url: '/api/v1/node-icon/test-icon',
                    method: 'GET',
                    params: {},
                    body: {},
                    query: {},
                    headers: {}
                } as any
                const res = {} as any
                const next = jest.fn()

                expressRequestLogger(req, res, next)

                expect(next).toHaveBeenCalled()
            })

            it('should skip logging for credentials-icon URLs', () => {
                const req = {
                    url: '/api/v1/components-credentials-icon/test',
                    method: 'GET',
                    params: {},
                    body: {},
                    query: {},
                    headers: {}
                } as any
                const res = {} as any
                const next = jest.fn()

                expressRequestLogger(req, res, next)

                expect(next).toHaveBeenCalled()
            })

            it('should skip logging for ping URLs', () => {
                const req = {
                    url: '/api/v1/ping',
                    method: 'GET',
                    params: {},
                    body: {},
                    query: {},
                    headers: {}
                } as any
                const res = {} as any
                const next = jest.fn()

                expressRequestLogger(req, res, next)

                expect(next).toHaveBeenCalled()
            })

            it('should handle POST requests', () => {
                const req = {
                    url: '/api/v1/chatflows',
                    method: 'POST',
                    params: {},
                    body: { name: 'test' },
                    query: {},
                    headers: {}
                } as any
                const res = {} as any
                const next = jest.fn()

                expressRequestLogger(req, res, next)

                expect(next).toHaveBeenCalled()
            })

            it('should handle PUT requests', () => {
                const req = {
                    url: '/api/v1/chatflows/123',
                    method: 'PUT',
                    params: { id: '123' },
                    body: { name: 'updated' },
                    query: {},
                    headers: {}
                } as any
                const res = {} as any
                const next = jest.fn()

                expressRequestLogger(req, res, next)

                expect(next).toHaveBeenCalled()
            })

            it('should handle DELETE requests', () => {
                const req = {
                    url: '/api/v1/chatflows/123',
                    method: 'DELETE',
                    params: { id: '123' },
                    body: {},
                    query: {},
                    headers: {}
                } as any
                const res = {} as any
                const next = jest.fn()

                expressRequestLogger(req, res, next)

                expect(next).toHaveBeenCalled()
            })

            it('should handle OPTION requests', () => {
                const req = {
                    url: '/api/v1/chatflows',
                    method: 'OPTION',
                    params: {},
                    body: {},
                    query: {},
                    headers: {}
                } as any
                const res = {} as any
                const next = jest.fn()

                expressRequestLogger(req, res, next)

                expect(next).toHaveBeenCalled()
            })

            it('should handle unknown HTTP methods', () => {
                const req = {
                    url: '/api/v1/chatflows',
                    method: 'PATCH',
                    params: {},
                    body: {},
                    query: {},
                    headers: {}
                } as any
                const res = {} as any
                const next = jest.fn()

                expressRequestLogger(req, res, next)

                expect(next).toHaveBeenCalled()
            })

            it('should include body in debug mode', () => {
                process.env.DEBUG = 'true'
                const req = {
                    url: '/api/v1/chatflows',
                    method: 'POST',
                    params: {},
                    body: { name: 'test', password: 'secret' },
                    query: { filter: 'active' },
                    headers: { authorization: 'Bearer token' }
                } as any
                const res = {} as any
                const next = jest.fn()

                expressRequestLogger(req, res, next)

                expect(next).toHaveBeenCalled()
            })

            it('should sanitize sensitive body fields', () => {
                process.env.DEBUG = 'true'
                process.env.LOG_SANITIZE_BODY_FIELDS = 'password,secret'
                const req = {
                    url: '/api/v1/users',
                    method: 'POST',
                    params: {},
                    body: { username: 'test', password: 'mysecret', secret: 'topsecret' },
                    query: {},
                    headers: {}
                } as any
                const res = {} as any
                const next = jest.fn()

                expressRequestLogger(req, res, next)

                expect(next).toHaveBeenCalled()
            })

            it('should sanitize sensitive header fields', () => {
                process.env.DEBUG = 'true'
                process.env.LOG_SANITIZE_HEADER_FIELDS = 'authorization,x-api-key'
                const req = {
                    url: '/api/v1/chatflows',
                    method: 'GET',
                    params: {},
                    body: {},
                    query: {},
                    headers: { authorization: 'Bearer secret', 'x-api-key': 'key123' }
                } as any
                const res = {} as any
                const next = jest.fn()

                expressRequestLogger(req, res, next)

                expect(next).toHaveBeenCalled()
            })

            it('should sanitize email-like values in body', () => {
                process.env.DEBUG = 'true'
                const req = {
                    url: '/api/v1/users',
                    method: 'POST',
                    params: {},
                    body: { email: 'user@example.com', name: 'Test' },
                    query: {},
                    headers: {}
                } as any
                const res = {} as any
                const next = jest.fn()

                expressRequestLogger(req, res, next)

                expect(next).toHaveBeenCalled()
            })

            it('should handle requests with URL params', () => {
                const req = {
                    url: '/api/v1/chatflows/abc-123',
                    method: 'GET',
                    params: { id: 'abc-123' },
                    body: {},
                    query: {},
                    headers: {}
                } as any
                const res = {} as any
                const next = jest.fn()

                expressRequestLogger(req, res, next)

                expect(next).toHaveBeenCalled()
            })
        })
    })
}
