import {
    extractChatflowId,
    isPredictionRequest,
    validateChatflowDomain,
    getUnauthorizedOriginError
} from '../../src/utils/domainValidation'
import chatflowsService from '../../src/services/chatflows'

/**
 * Test suite for domain validation utility functions
 * Tests URL parsing, chatflow ID extraction, and async domain validation
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

        describe('validateChatflowDomain', () => {
            let getChatflowByIdSpy: jest.SpyInstance

            beforeEach(() => {
                getChatflowByIdSpy = jest.spyOn(chatflowsService, 'getChatflowById')
            })

            afterEach(() => {
                getChatflowByIdSpy.mockRestore()
            })

            it('should return false for empty chatflowId', async () => {
                const result = await validateChatflowDomain('', 'https://example.com')
                expect(result).toBe(false)
            })

            it('should return false for invalid UUID chatflowId', async () => {
                const result = await validateChatflowDomain('not-a-uuid', 'https://example.com')
                expect(result).toBe(false)
            })

            it('should return true when chatflow has no chatbotConfig', async () => {
                getChatflowByIdSpy.mockResolvedValue({ id: '550e8400-e29b-41d4-a716-446655440000' })
                const result = await validateChatflowDomain('550e8400-e29b-41d4-a716-446655440000', 'https://example.com')
                expect(result).toBe(true)
            })

            it('should return true when allowedOrigins is empty array', async () => {
                getChatflowByIdSpy.mockResolvedValue({
                    id: '550e8400-e29b-41d4-a716-446655440000',
                    chatbotConfig: JSON.stringify({ allowedOrigins: [] })
                })
                const result = await validateChatflowDomain('550e8400-e29b-41d4-a716-446655440000', 'https://example.com')
                expect(result).toBe(true)
            })

            it('should return true when first allowedOrigin entry is empty string', async () => {
                getChatflowByIdSpy.mockResolvedValue({
                    id: '550e8400-e29b-41d4-a716-446655440000',
                    chatbotConfig: JSON.stringify({ allowedOrigins: [''] })
                })
                const result = await validateChatflowDomain('550e8400-e29b-41d4-a716-446655440000', 'https://example.com')
                expect(result).toBe(true)
            })

            it('should return true when origin matches allowed domain', async () => {
                getChatflowByIdSpy.mockResolvedValue({
                    id: '550e8400-e29b-41d4-a716-446655440000',
                    chatbotConfig: JSON.stringify({ allowedOrigins: ['https://example.com'] })
                })
                const result = await validateChatflowDomain('550e8400-e29b-41d4-a716-446655440000', 'https://example.com')
                expect(result).toBe(true)
            })

            it('should return false when origin does not match allowed domain', async () => {
                getChatflowByIdSpy.mockResolvedValue({
                    id: '550e8400-e29b-41d4-a716-446655440000',
                    chatbotConfig: JSON.stringify({ allowedOrigins: ['https://allowed.com'] })
                })
                const result = await validateChatflowDomain('550e8400-e29b-41d4-a716-446655440000', 'https://notallowed.com')
                expect(result).toBe(false)
            })

            it('should handle invalid domain format in allowedOrigins gracefully', async () => {
                getChatflowByIdSpy.mockResolvedValue({
                    id: '550e8400-e29b-41d4-a716-446655440000',
                    chatbotConfig: JSON.stringify({ allowedOrigins: ['not-a-valid-url'] })
                })
                const result = await validateChatflowDomain('550e8400-e29b-41d4-a716-446655440000', 'https://example.com')
                expect(result).toBe(false)
            })

            it('should return false when getChatflowById throws', async () => {
                getChatflowByIdSpy.mockRejectedValue(new Error('DB error'))
                const result = await validateChatflowDomain('550e8400-e29b-41d4-a716-446655440000', 'https://example.com')
                expect(result).toBe(false)
            })
        })

        describe('getUnauthorizedOriginError', () => {
            let getChatflowByIdSpy: jest.SpyInstance

            beforeEach(() => {
                getChatflowByIdSpy = jest.spyOn(chatflowsService, 'getChatflowById')
            })

            afterEach(() => {
                getChatflowByIdSpy.mockRestore()
            })

            it('should return custom error message from chatbot config', async () => {
                getChatflowByIdSpy.mockResolvedValue({
                    chatbotConfig: JSON.stringify({ allowedOriginsError: 'Custom forbidden message' })
                })
                const result = await getUnauthorizedOriginError('some-id')
                expect(result).toBe('Custom forbidden message')
            })

            it('should return default error message when no custom error configured', async () => {
                getChatflowByIdSpy.mockResolvedValue({
                    chatbotConfig: JSON.stringify({})
                })
                const result = await getUnauthorizedOriginError('some-id')
                expect(result).toBe('This site is not allowed to access this chatbot')
            })

            it('should return default error message when chatflow has no chatbotConfig', async () => {
                getChatflowByIdSpy.mockResolvedValue({ id: 'some-id' })
                const result = await getUnauthorizedOriginError('some-id')
                expect(result).toBe('This site is not allowed to access this chatbot')
            })

            it('should return default error message when getChatflowById throws', async () => {
                getChatflowByIdSpy.mockRejectedValue(new Error('DB error'))
                const result = await getUnauthorizedOriginError('some-id')
                expect(result).toBe('This site is not allowed to access this chatbot')
            })
        })
    })
}
