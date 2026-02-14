import { generateAPIKey, generateSecretHash, compareKeys, getAPIKeyPath } from '../../src/utils/apiKey'

/**
 * Test suite for API key utility functions
 * Tests key generation, hashing, and comparison operations
 */
export function apiKeyTest() {
    describe('Api Key Utilities', () => {
        describe('generateAPIKey', () => {
            it('should generate a valid API key string', () => {
                const apiKey = generateAPIKey()
                expect(typeof apiKey).toBe('string')
                expect(apiKey.length).toBeGreaterThan(0)
            })

            it('should generate unique API keys', () => {
                const apiKey1 = generateAPIKey()
                const apiKey2 = generateAPIKey()
                expect(apiKey1).not.toEqual(apiKey2)
            })

            it('should generate base64url encoded keys', () => {
                const apiKey = generateAPIKey()
                // base64url uses A-Z, a-z, 0-9, -, _ (no + or /)
                const base64urlRegex = /^[A-Za-z0-9_-]+$/
                expect(base64urlRegex.test(apiKey)).toBe(true)
            })

            it('should generate keys of consistent length', () => {
                const keys = Array.from({ length: 10 }, () => generateAPIKey())
                const lengths = keys.map((k) => k.length)
                // All keys should have same length (32 bytes = ~43 chars in base64url)
                expect(new Set(lengths).size).toBe(1)
            })
        })

        describe('generateSecretHash', () => {
            it('should generate a hash with salt separator', () => {
                const apiKey = generateAPIKey()
                const hash = generateSecretHash(apiKey)

                expect(typeof hash).toBe('string')
                expect(hash).toContain('.')
            })

            it('should generate unique hashes for same key due to random salt', () => {
                const apiKey = generateAPIKey()
                const hash1 = generateSecretHash(apiKey)
                const hash2 = generateSecretHash(apiKey)

                expect(hash1).not.toEqual(hash2)
            })

            it('should generate hash with correct format (hash.salt)', () => {
                const apiKey = generateAPIKey()
                const hash = generateSecretHash(apiKey)
                const parts = hash.split('.')

                expect(parts.length).toBe(2)
                // Hash part should be hex string (128 chars for 64 bytes)
                expect(parts[0].length).toBe(128)
                // Salt part should be hex string (16 chars for 8 bytes)
                expect(parts[1].length).toBe(16)
            })
        })

        describe('compareKeys', () => {
            it('should return true for matching keys', () => {
                const apiKey = generateAPIKey()
                const storedKey = generateSecretHash(apiKey)

                const result = compareKeys(storedKey, apiKey)
                expect(result).toBe(true)
            })

            it('should return false for non-matching keys', () => {
                const apiKey1 = generateAPIKey()
                const apiKey2 = generateAPIKey()
                const storedKey = generateSecretHash(apiKey1)

                const result = compareKeys(storedKey, apiKey2)
                expect(result).toBe(false)
            })

            it('should return false for modified key', () => {
                const apiKey = generateAPIKey()
                const storedKey = generateSecretHash(apiKey)
                const modifiedKey = apiKey + 'x'

                const result = compareKeys(storedKey, modifiedKey)
                expect(result).toBe(false)
            })

            it('should handle empty string comparison', () => {
                const apiKey = generateAPIKey()
                const storedKey = generateSecretHash(apiKey)

                const result = compareKeys(storedKey, '')
                expect(result).toBe(false)
            })
        })

        describe('getAPIKeyPath', () => {
            it('should return a string path', () => {
                const path = getAPIKeyPath()
                expect(typeof path).toBe('string')
            })

            it('should return path ending with api.json', () => {
                const path = getAPIKeyPath()
                expect(path.endsWith('api.json')).toBe(true)
            })

            it('should respect APIKEY_PATH environment variable when set', () => {
                const originalPath = process.env.APIKEY_PATH
                process.env.APIKEY_PATH = '/custom/path'

                const path = getAPIKeyPath()
                expect(path).toBe('/custom/path/api.json')

                // Restore original
                if (originalPath !== undefined) {
                    process.env.APIKEY_PATH = originalPath
                } else {
                    delete process.env.APIKEY_PATH
                }
            })
        })
    })
}
