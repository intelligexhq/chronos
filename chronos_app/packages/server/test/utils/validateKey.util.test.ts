import { validateFlowAPIKey, validateAPIKey } from '../../src/utils/validateKey'

/**
 * Test suite for validateKey utility
 * Tests API key validation branch coverage
 */
export function validateKeyUtilTest() {
    describe('ValidateKey Utilities', () => {
        describe('validateFlowAPIKey', () => {
            it('should return true when chatflow has no apikeyid', async () => {
                const req = { headers: {} } as any
                const chatflow = { apikeyid: null } as any

                const result = await validateFlowAPIKey(req, chatflow)

                expect(result).toBe(true)
            })

            it('should return true when chatflow apikeyid is undefined', async () => {
                const req = { headers: {} } as any
                const chatflow = {} as any

                const result = await validateFlowAPIKey(req, chatflow)

                expect(result).toBe(true)
            })

            it('should return false when chatflow has apikeyid but no authorization header', async () => {
                const req = { headers: {} } as any
                const chatflow = { apikeyid: 'key-123' } as any

                const result = await validateFlowAPIKey(req, chatflow)

                expect(result).toBe(false)
            })

            it('should return false when authorization header is empty', async () => {
                const req = { headers: { authorization: '' } } as any
                const chatflow = { apikeyid: 'key-123' } as any

                const result = await validateFlowAPIKey(req, chatflow)

                expect(result).toBe(false)
            })

            it('should return false when supplied key is empty after Bearer split', async () => {
                const req = { headers: { authorization: 'Bearer ' } } as any
                const chatflow = { apikeyid: 'key-123' } as any

                const result = await validateFlowAPIKey(req, chatflow)

                expect(result).toBe(false)
            })

            it('should return false for non-existent api key id', async () => {
                const req = { headers: { authorization: 'Bearer some-invalid-key' } } as any
                const chatflow = { apikeyid: 'non-existent-key-id' } as any

                const result = await validateFlowAPIKey(req, chatflow)

                expect(result).toBe(false)
            })
        })

        describe('validateAPIKey', () => {
            it('should return isValid false when no authorization header', async () => {
                const req = { headers: {} } as any

                const result = await validateAPIKey(req)

                expect(result).toEqual({ isValid: false })
            })

            it('should return isValid false when authorization header is empty', async () => {
                const req = { headers: { authorization: '' } } as any

                const result = await validateAPIKey(req)

                expect(result).toEqual({ isValid: false })
            })

            it('should return isValid false when supplied key is empty', async () => {
                const req = { headers: { authorization: 'Bearer ' } } as any

                const result = await validateAPIKey(req)

                expect(result).toEqual({ isValid: false })
            })

            it('should return isValid false for non-existent api key', async () => {
                const req = { headers: { authorization: 'Bearer non-existent-key' } } as any

                const result = await validateAPIKey(req)

                expect(result).toEqual({ isValid: false })
            })

            it('should handle lowercase authorization header', async () => {
                const req = { headers: { authorization: 'Bearer some-key' } } as any

                const result = await validateAPIKey(req)

                // Result depends on whether key exists in DB
                expect(result).toHaveProperty('isValid')
            })

            it('should handle uppercase Authorization header', async () => {
                const req = { headers: { Authorization: 'Bearer some-key' } } as any

                const result = await validateAPIKey(req)

                // Result depends on whether key exists in DB
                expect(result).toHaveProperty('isValid')
            })
        })
    })
}
