import { getAllowedCorsOrigins, getAllowedIframeOrigins } from '../../src/utils/XSS'

/**
 * Test suite for XSS/CORS utility functions
 * Tests origin configuration helpers
 */
export function xssUtilTest() {
    describe('XSS Utilities', () => {
        describe('getAllowedCorsOrigins', () => {
            const originalCorsOrigins = process.env.CORS_ORIGINS

            afterEach(() => {
                // Restore original value
                if (originalCorsOrigins !== undefined) {
                    process.env.CORS_ORIGINS = originalCorsOrigins
                } else {
                    delete process.env.CORS_ORIGINS
                }
            })

            it('should return empty string when CORS_ORIGINS is not set', () => {
                delete process.env.CORS_ORIGINS
                const result = getAllowedCorsOrigins()
                expect(result).toBe('')
            })

            it('should return CORS_ORIGINS value when set', () => {
                process.env.CORS_ORIGINS = 'https://example.com'
                const result = getAllowedCorsOrigins()
                expect(result).toBe('https://example.com')
            })

            it('should return wildcard when CORS_ORIGINS is *', () => {
                process.env.CORS_ORIGINS = '*'
                const result = getAllowedCorsOrigins()
                expect(result).toBe('*')
            })

            it('should return comma-separated origins', () => {
                process.env.CORS_ORIGINS = 'https://example.com,https://another.com'
                const result = getAllowedCorsOrigins()
                expect(result).toBe('https://example.com,https://another.com')
            })
        })

        describe('getAllowedIframeOrigins', () => {
            const originalIframeOrigins = process.env.IFRAME_ORIGINS

            afterEach(() => {
                // Restore original value
                if (originalIframeOrigins !== undefined) {
                    process.env.IFRAME_ORIGINS = originalIframeOrigins
                } else {
                    delete process.env.IFRAME_ORIGINS
                }
            })

            it('should return * when IFRAME_ORIGINS is not set', () => {
                delete process.env.IFRAME_ORIGINS
                const result = getAllowedIframeOrigins()
                expect(result).toBe('*')
            })

            it('should return IFRAME_ORIGINS value when set', () => {
                process.env.IFRAME_ORIGINS = 'https://example.com'
                const result = getAllowedIframeOrigins()
                expect(result).toBe('https://example.com')
            })

            it('should return self when set to self', () => {
                process.env.IFRAME_ORIGINS = 'self'
                const result = getAllowedIframeOrigins()
                expect(result).toBe('self')
            })

            it('should return none when set to none', () => {
                process.env.IFRAME_ORIGINS = 'none'
                const result = getAllowedIframeOrigins()
                expect(result).toBe('none')
            })

            it('should return comma-separated origins', () => {
                process.env.IFRAME_ORIGINS = 'https://example.com,https://another.com'
                const result = getAllowedIframeOrigins()
                expect(result).toBe('https://example.com,https://another.com')
            })
        })
    })
}
