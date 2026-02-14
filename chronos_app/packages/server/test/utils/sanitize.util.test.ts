import { sanitizeNullBytes, sanitizeUser } from '../../src/utils/sanitize.util'

/**
 * Test suite for sanitize utility functions
 * Tests null byte removal and user data sanitization
 */
export function sanitizeUtilTest() {
    describe('Sanitize Utilities', () => {
        describe('sanitizeNullBytes', () => {
            it('should remove null bytes from a simple string value in object', () => {
                const input = { name: 'test\u0000value' }
                const result = sanitizeNullBytes(input)
                expect(result.name).toBe('testvalue')
            })

            it('should remove multiple null bytes from string', () => {
                const input = { text: '\u0000hello\u0000world\u0000' }
                const result = sanitizeNullBytes(input)
                expect(result.text).toBe('helloworld')
            })

            it('should handle nested objects', () => {
                const input = {
                    level1: {
                        level2: {
                            value: 'nested\u0000value'
                        }
                    }
                }
                const result = sanitizeNullBytes(input)
                expect(result.level1.level2.value).toBe('nestedvalue')
            })

            it('should handle arrays with strings', () => {
                const input = ['hello\u0000', 'world\u0000']
                const result = sanitizeNullBytes(input)
                expect(result[0]).toBe('hello')
                expect(result[1]).toBe('world')
            })

            it('should handle arrays of objects', () => {
                const input = [{ name: 'test\u0000' }, { name: 'value\u0000' }]
                const result = sanitizeNullBytes(input)
                expect(result[0].name).toBe('test')
                expect(result[1].name).toBe('value')
            })

            it('should handle mixed nested structures', () => {
                const input = {
                    users: [
                        { name: 'user\u0000one', tags: ['tag\u0000a'] },
                        { name: 'user\u0000two', tags: ['tag\u0000b'] }
                    ],
                    metadata: {
                        description: 'desc\u0000ription'
                    }
                }
                const result = sanitizeNullBytes(input)
                expect(result.users[0].name).toBe('userone')
                expect(result.users[0].tags[0]).toBe('taga')
                expect(result.users[1].name).toBe('usertwo')
                expect(result.metadata.description).toBe('description')
            })

            it('should preserve non-string values', () => {
                const input = {
                    number: 42,
                    boolean: true,
                    nullVal: null,
                    string: 'test\u0000'
                }
                const result = sanitizeNullBytes(input)
                expect(result.number).toBe(42)
                expect(result.boolean).toBe(true)
                expect(result.nullVal).toBeNull()
                expect(result.string).toBe('test')
            })

            it('should handle empty object', () => {
                const input = {}
                const result = sanitizeNullBytes(input)
                expect(result).toEqual({})
            })

            it('should handle empty array', () => {
                const input: string[] = []
                const result = sanitizeNullBytes(input)
                expect(result).toEqual([])
            })

            it('should return the same object reference (mutates in place)', () => {
                const input = { name: 'test\u0000' }
                const result = sanitizeNullBytes(input)
                expect(result).toBe(input)
            })

            it('should handle strings without null bytes', () => {
                const input = { name: 'normal string' }
                const result = sanitizeNullBytes(input)
                expect(result.name).toBe('normal string')
            })

            it('should handle deeply nested arrays', () => {
                const input = [[['deep\u0000value']]]
                const result = sanitizeNullBytes(input)
                expect(result[0][0][0]).toBe('deepvalue')
            })
        })

        describe('sanitizeUser', () => {
            it('should remove password field from user object', () => {
                const user = {
                    id: '123',
                    email: 'test@example.com',
                    password: 'secret123'
                }
                const result = sanitizeUser(user)
                expect(result.password).toBeUndefined()
                expect(result.id).toBe('123')
                expect(result.email).toBe('test@example.com')
            })

            it('should handle user without password field', () => {
                const user = {
                    id: '123',
                    email: 'test@example.com'
                }
                const result = sanitizeUser(user)
                expect(result.password).toBeUndefined()
                expect(result.id).toBe('123')
            })

            it('should return the same object reference (mutates in place)', () => {
                const user = {
                    id: '123',
                    password: 'secret'
                }
                const result = sanitizeUser(user)
                expect(result).toBe(user)
            })

            it('should handle empty user object', () => {
                const user = {}
                const result = sanitizeUser(user)
                expect(result).toEqual({})
            })

            it('should preserve all other user fields', () => {
                const user = {
                    id: '123',
                    email: 'test@example.com',
                    name: 'Test User',
                    createdDate: new Date('2024-01-01'),
                    password: 'secret'
                }
                const result = sanitizeUser(user)
                expect(result.id).toBe('123')
                expect(result.email).toBe('test@example.com')
                expect(result.name).toBe('Test User')
                expect(result.createdDate).toEqual(new Date('2024-01-01'))
                expect(result.password).toBeUndefined()
            })
        })
    })
}
