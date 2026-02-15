import { createMockRepository, createMockQueryBuilder } from '../mocks/appServer.mock'

// Mock getRunningExpressApp before importing the service
const mockRepository = createMockRepository()
const mockQueryBuilder = createMockQueryBuilder()
mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)

const mockAppServer = {
    AppDataSource: {
        getRepository: jest.fn().mockReturnValue(mockRepository)
    }
}

jest.mock('../../src/utils/getRunningExpressApp', () => ({
    getRunningExpressApp: jest.fn(() => mockAppServer)
}))

// Mock addChatflowsCount to return the input with chatflowsCount added
jest.mock('../../src/utils/addChatflowsCount', () => ({
    addChatflowsCount: jest.fn((keys: any[]) => keys.map((k) => ({ ...k, chatflowsCount: 0 })))
}))

// Import the service after mocking
import apikeyService from '../../src/services/apikey'

/**
 * Test suite for API Key service
 * Tests CRUD operations with mocked database
 */
export function apikeyServiceTest() {
    describe('API Key Service', () => {
        beforeEach(() => {
            jest.clearAllMocks()
        })

        describe('getAllApiKeys', () => {
            it('should return all API keys', async () => {
                const mockKeys = [
                    { id: '1', keyName: 'Key1', apiKey: 'abc123' },
                    { id: '2', keyName: 'Key2', apiKey: 'def456' }
                ]
                mockQueryBuilder.getManyAndCount.mockResolvedValueOnce([mockKeys, 2])

                const result = await apikeyService.getAllApiKeys()

                expect(Array.isArray(result)).toBe(true)
                expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('api_key')
            })

            it('should return paginated results when page and limit provided', async () => {
                const mockKeys = [{ id: '1', keyName: 'Key1', apiKey: 'abc123' }]
                mockQueryBuilder.getManyAndCount.mockResolvedValueOnce([mockKeys, 10])

                const result = await apikeyService.getAllApiKeys(false, 1, 5)

                expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0)
                expect(mockQueryBuilder.take).toHaveBeenCalledWith(5)
                expect(result).toHaveProperty('total')
                expect(result).toHaveProperty('data')
            })

            it('should auto-create key when empty and autoCreateNewKey is true', async () => {
                // First call returns empty, second call returns the new key
                mockQueryBuilder.getManyAndCount
                    .mockResolvedValueOnce([[], 0])
                    .mockResolvedValueOnce([[{ id: '1', keyName: 'DefaultKey' }], 1])

                mockRepository.create.mockReturnValue({ id: '1', keyName: 'DefaultKey' })
                mockRepository.save.mockResolvedValue({ id: '1', keyName: 'DefaultKey' })

                const _result = await apikeyService.getAllApiKeys(true)

                expect(mockRepository.save).toHaveBeenCalled()
            })

            it('should not auto-create key when not empty', async () => {
                const mockKeys = [{ id: '1', keyName: 'ExistingKey' }]
                mockQueryBuilder.getManyAndCount.mockResolvedValueOnce([mockKeys, 1])

                await apikeyService.getAllApiKeys(true)

                // Save should not be called for creating new key
                expect(mockRepository.save).not.toHaveBeenCalled()
            })
        })

        describe('getApiKey', () => {
            it('should return API key by apiKey string', async () => {
                const mockKey = { id: '1', keyName: 'TestKey', apiKey: 'test-key-123' }
                mockRepository.findOneBy.mockResolvedValueOnce(mockKey)

                const result = await apikeyService.getApiKey('test-key-123')

                expect(result).toEqual(mockKey)
                expect(mockRepository.findOneBy).toHaveBeenCalledWith({ apiKey: 'test-key-123' })
            })

            it('should return undefined when key not found', async () => {
                mockRepository.findOneBy.mockResolvedValueOnce(null)

                const result = await apikeyService.getApiKey('non-existent')

                expect(result).toBeUndefined()
            })
        })

        describe('getApiKeyById', () => {
            it('should return API key by ID', async () => {
                const mockKey = { id: 'uuid-123', keyName: 'TestKey', apiKey: 'abc' }
                mockRepository.findOneBy.mockResolvedValueOnce(mockKey)

                const result = await apikeyService.getApiKeyById('uuid-123')

                expect(result).toEqual(mockKey)
                expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 'uuid-123' })
            })

            it('should return undefined when ID not found', async () => {
                mockRepository.findOneBy.mockResolvedValueOnce(null)

                const result = await apikeyService.getApiKeyById('non-existent-id')

                expect(result).toBeUndefined()
            })
        })

        describe('createApiKey', () => {
            it('should create a new API key', async () => {
                mockRepository.create.mockReturnValue({ keyName: 'NewKey' })
                mockRepository.save.mockResolvedValue({ id: '1', keyName: 'NewKey' })
                mockQueryBuilder.getManyAndCount.mockResolvedValueOnce([[{ id: '1', keyName: 'NewKey' }], 1])

                const _result = await apikeyService.createApiKey('NewKey')

                expect(mockRepository.create).toHaveBeenCalled()
                expect(mockRepository.save).toHaveBeenCalled()
            })

            it('should generate unique apiKey and apiSecret', async () => {
                let savedKey: any = null
                mockRepository.create.mockImplementation((key: any) => {
                    savedKey = key
                    return key
                })
                mockRepository.save.mockImplementation((key: any) => Promise.resolve(key))
                mockQueryBuilder.getManyAndCount.mockResolvedValueOnce([[], 0])

                await apikeyService.createApiKey('TestKey')

                expect(savedKey.apiKey).toBeDefined()
                expect(savedKey.apiSecret).toBeDefined()
                expect(savedKey.apiKey.length).toBeGreaterThan(0)
                expect(savedKey.apiSecret).toContain('.') // hash.salt format
            })
        })

        describe('updateApiKey', () => {
            it('should update key name', async () => {
                const existingKey = { id: '1', keyName: 'OldName', apiKey: 'abc' }
                mockRepository.findOneBy.mockResolvedValueOnce(existingKey)
                mockRepository.save.mockResolvedValue({ ...existingKey, keyName: 'NewName' })
                mockQueryBuilder.getManyAndCount.mockResolvedValueOnce([[{ ...existingKey, keyName: 'NewName' }], 1])

                const _result = await apikeyService.updateApiKey('1', 'NewName')

                expect(mockRepository.save).toHaveBeenCalled()
            })

            it('should throw error when key not found', async () => {
                mockRepository.findOneBy.mockResolvedValueOnce(null)

                await expect(apikeyService.updateApiKey('non-existent', 'NewName')).rejects.toThrow()
            })
        })

        describe('deleteApiKey', () => {
            it('should delete API key by ID', async () => {
                mockRepository.delete.mockResolvedValueOnce({ affected: 1 })

                const result = await apikeyService.deleteApiKey('1')

                expect(mockRepository.delete).toHaveBeenCalledWith({ id: '1' })
                expect(result).toEqual({ affected: 1 })
            })

            it('should throw error when delete fails', async () => {
                mockRepository.delete.mockResolvedValueOnce(null)

                await expect(apikeyService.deleteApiKey('non-existent')).rejects.toThrow()
            })
        })

        describe('verifyApiKey', () => {
            it('should return OK for valid API key', async () => {
                mockRepository.findOneBy.mockResolvedValueOnce({ id: '1', apiKey: 'valid-key' })

                const result = await apikeyService.verifyApiKey('valid-key')

                expect(result).toBe('OK')
            })

            it('should throw Unauthorized for invalid API key', async () => {
                mockRepository.findOneBy.mockResolvedValueOnce(null)

                await expect(apikeyService.verifyApiKey('invalid-key')).rejects.toThrow('Unauthorized')
            })
        })

        describe('importKeys', () => {
            const createValidBase64Keys = (keys: any) => {
                const json = JSON.stringify(keys)
                const base64 = Buffer.from(json).toString('base64')
                return `data:application/json;base64,${base64}`
            }

            it('should reject invalid data URI', async () => {
                const body = { jsonFile: 'invalid-data-uri' }

                await expect(apikeyService.importKeys(body)).rejects.toThrow('Invalid dataURI')
            })

            it('should reject non-array JSON', async () => {
                const body = {
                    jsonFile: createValidBase64Keys({ notAnArray: true })
                }

                await expect(apikeyService.importKeys(body)).rejects.toThrow('Expected an array')
            })

            it('should reject keys missing required fields', async () => {
                const body = {
                    jsonFile: createValidBase64Keys([{ keyName: 'Test' }]) // missing other fields
                }

                await expect(apikeyService.importKeys(body)).rejects.toThrow('missing required field')
            })

            it('should reject keys with empty field values', async () => {
                const body = {
                    jsonFile: createValidBase64Keys([
                        {
                            keyName: '',
                            apiKey: 'abc',
                            apiSecret: 'def',
                            createdAt: '2024-01-01',
                            id: '123'
                        }
                    ])
                }

                await expect(apikeyService.importKeys(body)).rejects.toThrow('cannot be empty')
            })

            it('should import valid keys with ignoreIfExist mode', async () => {
                const validKeys = [
                    {
                        keyName: 'ImportedKey',
                        apiKey: 'imported-api-key',
                        apiSecret: 'imported-secret.salt',
                        createdAt: '2024-01-01',
                        id: 'imported-id'
                    }
                ]
                const body = {
                    jsonFile: createValidBase64Keys(validKeys),
                    importMode: 'ignoreIfExist'
                }

                mockRepository.find.mockResolvedValueOnce([])
                mockRepository.create.mockImplementation((k: any) => k)
                mockRepository.save.mockImplementation((k: any) => Promise.resolve(k))
                mockQueryBuilder.getManyAndCount.mockResolvedValueOnce([validKeys, 1])

                const _result = await apikeyService.importKeys(body)

                expect(mockRepository.save).toHaveBeenCalled()
            })

            it('should handle replaceAll import mode', async () => {
                const validKeys = [
                    {
                        keyName: 'NewKey',
                        apiKey: 'new-key',
                        apiSecret: 'new-secret.salt',
                        createdAt: '2024-01-01',
                        id: 'new-id'
                    }
                ]
                const body = {
                    jsonFile: createValidBase64Keys(validKeys),
                    importMode: 'replaceAll'
                }

                mockRepository.find.mockResolvedValueOnce([{ id: 'old', keyName: 'OldKey' }])
                mockRepository.delete.mockResolvedValueOnce({ affected: 1 })
                mockRepository.create.mockImplementation((k: any) => k)
                mockRepository.save.mockImplementation((k: any) => Promise.resolve(k))
                mockQueryBuilder.getManyAndCount.mockResolvedValueOnce([validKeys, 1])

                await apikeyService.importKeys(body)

                expect(mockRepository.delete).toHaveBeenCalled()
            })

            it('should throw error in errorIfExist mode when key exists', async () => {
                const validKeys = [
                    {
                        keyName: 'ExistingKey',
                        apiKey: 'key',
                        apiSecret: 'secret.salt',
                        createdAt: '2024-01-01',
                        id: 'id'
                    }
                ]
                const body = {
                    jsonFile: createValidBase64Keys(validKeys),
                    importMode: 'errorIfExist'
                }

                mockRepository.find.mockResolvedValueOnce([{ id: 'existing', keyName: 'ExistingKey' }])

                await expect(apikeyService.importKeys(body)).rejects.toThrow('already exists')
            })
        })
    })
}
