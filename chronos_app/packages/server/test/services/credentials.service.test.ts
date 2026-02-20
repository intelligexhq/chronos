import { createMockRepository } from '../mocks/appServer.mock'

/**
 * Test suite for Credentials service
 * Tests CRUD operations with mocked database
 */
export function credentialsServiceTest() {
    describe('Credentials Service', () => {
        let credentialsService: any
        let mockRepository: ReturnType<typeof createMockRepository>
        let mockNodesPool: any
        let mockAppServer: any

        beforeAll(() => {
            // Reset modules to ensure clean state
            jest.resetModules()

            // Create fresh mocks
            mockRepository = createMockRepository()
            mockNodesPool = {
                componentCredentials: {}
            }
            mockAppServer = {
                AppDataSource: {
                    getRepository: jest.fn().mockReturnValue(mockRepository)
                },
                nodesPool: mockNodesPool
            }

            // Setup mocks before importing service
            jest.doMock('../../src/utils/getRunningExpressApp', () => ({
                getRunningExpressApp: jest.fn(() => mockAppServer)
            }))

            jest.doMock('../../src/utils', () => ({
                transformToCredentialEntity: jest.fn((body: any) => Promise.resolve(body)),
                decryptCredentialData: jest.fn().mockResolvedValue({ apiKey: 'decrypted-key' })
            }))

            // Import service after mocks are set up
            credentialsService = require('../../src/services/credentials').default
        })

        afterAll(() => {
            jest.resetModules()
        })

        beforeEach(() => {
            jest.clearAllMocks()
            // Re-setup mock return values after clearAllMocks
            mockAppServer.AppDataSource.getRepository.mockReturnValue(mockRepository)
        })

        describe('createCredential', () => {
            it('should create a new credential', async () => {
                const credentialData = {
                    name: 'Test Credential',
                    credentialName: 'openAIApi',
                    plainDataObj: { apiKey: 'test-key' }
                }
                const savedCredential = { id: 'cred-1', ...credentialData }

                mockRepository.create.mockReturnValue(savedCredential)
                mockRepository.save.mockResolvedValue(savedCredential)

                const result = await credentialsService.createCredential(credentialData)

                expect(mockRepository.create).toHaveBeenCalled()
                expect(mockRepository.save).toHaveBeenCalled()
                expect(result).toEqual(savedCredential)
            })

            it('should use provided ID if specified', async () => {
                const credentialData = {
                    id: 'custom-id',
                    name: 'Custom ID Credential',
                    credentialName: 'openAIApi'
                }
                const savedCredential = { ...credentialData }

                mockRepository.create.mockReturnValue(savedCredential)
                mockRepository.save.mockResolvedValue(savedCredential)

                const result = await credentialsService.createCredential(credentialData)

                expect(result.id).toBe('custom-id')
            })

            it('should throw error on database failure', async () => {
                mockRepository.create.mockImplementation(() => {
                    throw new Error('Database error')
                })

                await expect(credentialsService.createCredential({})).rejects.toThrow()
            })
        })

        describe('deleteCredentials', () => {
            it('should delete credential by ID', async () => {
                mockRepository.delete.mockResolvedValue({ affected: 1 })

                const result = await credentialsService.deleteCredentials('cred-1')

                expect(mockRepository.delete).toHaveBeenCalledWith({ id: 'cred-1' })
                expect(result).toEqual({ affected: 1 })
            })

            it('should throw NOT_FOUND error when credential not found', async () => {
                mockRepository.delete.mockResolvedValue(null)

                await expect(credentialsService.deleteCredentials('non-existent')).rejects.toThrow()
            })

            it('should throw error on database failure', async () => {
                mockRepository.delete.mockRejectedValue(new Error('Database error'))

                await expect(credentialsService.deleteCredentials('cred-1')).rejects.toThrow()
            })
        })

        describe('getAllCredentials', () => {
            it('should return all credentials without param', async () => {
                const mockCredentials = [
                    { id: '1', name: 'Cred 1', encryptedData: 'encrypted' },
                    { id: '2', name: 'Cred 2', encryptedData: 'encrypted' }
                ]
                mockRepository.find.mockResolvedValue(mockCredentials)

                const result = await credentialsService.getAllCredentials(undefined)

                expect(mockRepository.find).toHaveBeenCalled()
                // Should omit encryptedData
                expect(result).toHaveLength(2)
                result.forEach((cred: any) => {
                    expect(cred.encryptedData).toBeUndefined()
                })
            })

            it('should filter by single credential name', async () => {
                const mockCredentials = [{ id: '1', name: 'OpenAI Cred', credentialName: 'openAIApi' }]
                mockRepository.findBy.mockResolvedValue(mockCredentials)

                const result = await credentialsService.getAllCredentials('openAIApi')

                expect(mockRepository.findBy).toHaveBeenCalledWith({ credentialName: 'openAIApi' })
                expect(result).toEqual(mockCredentials)
            })

            it('should filter by array of credential names', async () => {
                const mockCredentials1 = [{ id: '1', credentialName: 'openAIApi' }]
                const mockCredentials2 = [{ id: '2', credentialName: 'anthropicApi' }]

                mockRepository.findBy.mockResolvedValueOnce(mockCredentials1).mockResolvedValueOnce(mockCredentials2)

                const result = await credentialsService.getAllCredentials(['openAIApi', 'anthropicApi'])

                expect(mockRepository.findBy).toHaveBeenCalledTimes(2)
                expect(result).toHaveLength(2)
            })

            it('should throw error on database failure', async () => {
                mockRepository.find.mockRejectedValue(new Error('Database error'))

                await expect(credentialsService.getAllCredentials(undefined)).rejects.toThrow()
            })
        })

        describe('getCredentialById', () => {
            it('should return credential by ID with decrypted data', async () => {
                const mockCredential = {
                    id: 'cred-1',
                    name: 'Test Credential',
                    credentialName: 'openAIApi',
                    encryptedData: 'encrypted-data'
                }
                mockRepository.findOneBy.mockResolvedValue(mockCredential)

                const result = await credentialsService.getCredentialById('cred-1')

                expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 'cred-1' })
                expect(result.plainDataObj).toBeDefined()
                expect(result.encryptedData).toBeUndefined()
            })

            it('should throw NOT_FOUND error for non-existent credential', async () => {
                mockRepository.findOneBy.mockResolvedValue(null)

                await expect(credentialsService.getCredentialById('non-existent')).rejects.toThrow('not found')
            })

            it('should throw error on database failure', async () => {
                mockRepository.findOneBy.mockRejectedValue(new Error('Database error'))

                await expect(credentialsService.getCredentialById('cred-1')).rejects.toThrow()
            })
        })

        describe('updateCredential', () => {
            it('should update existing credential', async () => {
                const existingCredential = {
                    id: 'cred-1',
                    name: 'Old Name',
                    encryptedData: 'old-encrypted'
                }
                const updatedCredential = {
                    id: 'cred-1',
                    name: 'New Name'
                }

                mockRepository.findOneBy.mockResolvedValue(existingCredential)
                mockRepository.save.mockResolvedValue(updatedCredential)

                const result = await credentialsService.updateCredential('cred-1', { name: 'New Name', plainDataObj: {} })

                expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 'cred-1' })
                expect(mockRepository.merge).toHaveBeenCalled()
                expect(mockRepository.save).toHaveBeenCalled()
                expect(result).toEqual(updatedCredential)
            })

            it('should throw NOT_FOUND error for non-existent credential', async () => {
                mockRepository.findOneBy.mockResolvedValue(null)

                await expect(credentialsService.updateCredential('non-existent', { name: 'Updated' })).rejects.toThrow('not found')
            })

            it('should merge existing and new plainDataObj', async () => {
                const existingCredential = {
                    id: 'cred-1',
                    encryptedData: 'encrypted'
                }

                mockRepository.findOneBy.mockResolvedValue(existingCredential)
                mockRepository.save.mockImplementation((cred: any) => Promise.resolve(cred))

                await credentialsService.updateCredential('cred-1', {
                    plainDataObj: { newKey: 'new-value' }
                })

                expect(mockRepository.save).toHaveBeenCalled()
            })

            it('should throw error on database failure', async () => {
                mockRepository.findOneBy.mockResolvedValue({ id: 'cred-1', encryptedData: 'data' })
                mockRepository.save.mockRejectedValue(new Error('Database error'))

                await expect(credentialsService.updateCredential('cred-1', { name: 'Updated' })).rejects.toThrow()
            })
        })
    })
}
