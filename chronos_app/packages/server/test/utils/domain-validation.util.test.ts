import { extractChatflowId, isPredictionRequest } from '../../src/utils/domainValidation'

/**
 * Test suite for domain validation utility functions
 * Tests URL parsing and chatflow ID extraction
 */
export function domainValidationUtilTest() {
    describe('Domain Validation Utilities', () => {
        describe('isPredictionRequest', () => {
            it('should return true for prediction URLs', () => {
                expect(isPredictionRequest('/api/v1/prediction/abc123')).toBe(true)
            })

            it('should return true for prediction URLs with query params', () => {
                expect(isPredictionRequest('/api/v1/prediction/abc123?streaming=true')).toBe(true)
            })

            it('should return false for non-prediction URLs', () => {
                expect(isPredictionRequest('/api/v1/chatflows')).toBe(false)
            })

            it('should return false for URLs containing prediction as substring', () => {
                expect(isPredictionRequest('/api/v1/predictions-list')).toBe(false)
            })

            it('should return false for internal-prediction URLs (different from /prediction/)', () => {
                expect(isPredictionRequest('/api/v1/internal-prediction/abc123')).toBe(false)
            })

            it('should return false for empty string', () => {
                expect(isPredictionRequest('')).toBe(false)
            })

            it('should return false for root URL', () => {
                expect(isPredictionRequest('/')).toBe(false)
            })

            it('should handle URLs with multiple slashes', () => {
                expect(isPredictionRequest('//api//v1//prediction//abc')).toBe(true)
            })
        })

        describe('extractChatflowId', () => {
            it('should extract chatflow ID from prediction URL', () => {
                const result = extractChatflowId('/api/v1/prediction/abc123-def456')
                expect(result).toBe('abc123-def456')
            })

            it('should extract chatflow ID and remove query params', () => {
                const result = extractChatflowId('/api/v1/prediction/abc123?streaming=true&format=json')
                expect(result).toBe('abc123')
            })

            it('should return null for non-prediction URLs', () => {
                const result = extractChatflowId('/api/v1/chatflows/abc123')
                expect(result).toBeNull()
            })

            it('should return null for URLs without ID after prediction', () => {
                const result = extractChatflowId('/api/v1/prediction/')
                expect(result).toBe('')
            })

            it('should return null for prediction URL without trailing segment', () => {
                const result = extractChatflowId('/api/v1/prediction')
                expect(result).toBeNull()
            })

            it('should handle UUID-formatted chatflow IDs', () => {
                const uuid = '550e8400-e29b-41d4-a716-446655440000'
                const result = extractChatflowId(`/api/v1/prediction/${uuid}`)
                expect(result).toBe(uuid)
            })

            it('should return null for empty string', () => {
                const result = extractChatflowId('')
                expect(result).toBeNull()
            })

            it('should return null for internal-prediction URLs (not matching /prediction/)', () => {
                const result = extractChatflowId('/api/v1/internal-prediction/xyz789')
                expect(result).toBeNull()
            })

            it('should extract only the first segment after prediction', () => {
                const result = extractChatflowId('/api/v1/prediction/chatflow123/extra/path')
                expect(result).toBe('chatflow123')
            })

            it('should handle URLs with encoded characters', () => {
                const result = extractChatflowId('/api/v1/prediction/abc%20123')
                expect(result).toBe('abc%20123')
            })
        })
    })
}
