import { createMockRepository } from '../mocks/appServer.mock'

const getRunningExpressAppExports = require('../../src/utils/getRunningExpressApp')
const bcrypt = require('bcryptjs')

export function oauthClientServiceTest() {
    describe('OAuth Client Service', () => {
        const mockRepository = createMockRepository()

        const mockAppServer = {
            AppDataSource: {
                getRepository: jest.fn().mockReturnValue(mockRepository)
            }
        }

        const origGetRunningExpressApp = getRunningExpressAppExports.getRunningExpressApp

        beforeEach(() => {
            getRunningExpressAppExports.getRunningExpressApp = jest.fn().mockReturnValue(mockAppServer)
            mockAppServer.AppDataSource.getRepository.mockReturnValue(mockRepository)
            mockRepository.find.mockReset()
            mockRepository.findOneBy.mockReset()
            mockRepository.create.mockReset()
            mockRepository.save.mockReset()
            mockRepository.delete.mockReset()
        })

        afterEach(() => {
            getRunningExpressAppExports.getRunningExpressApp = origGetRunningExpressApp
        })

        const oauthClientService = require('../../src/services/oauth-client').default

        describe('getAllOAuthClients', () => {
            it('should return all OAuth clients without secrets', async () => {
                const mockClients = [
                    {
                        id: '1',
                        clientId: 'cc_abc',
                        clientSecret: 'hashed',
                        clientName: 'Test Client',
                        scopes: '["admin:full"]',
                        createdDate: new Date(),
                        updatedDate: new Date()
                    }
                ]
                mockRepository.find.mockResolvedValueOnce(mockClients)

                const result = await oauthClientService.getAllOAuthClients()

                expect(result).toHaveLength(1)
                expect(result[0].clientId).toBe('cc_abc')
                expect(result[0]).not.toHaveProperty('clientSecret')
            })
        })

        describe('createOAuthClient', () => {
            it('should create a new OAuth client and return plain secret once', async () => {
                mockRepository.create.mockImplementation((entity: any) => entity)
                mockRepository.save.mockImplementation(async (entity: any) => ({
                    ...entity,
                    createdDate: new Date(),
                    updatedDate: new Date()
                }))

                const result = await oauthClientService.createOAuthClient('Test Client', ['admin:full'])

                expect(result.clientId).toMatch(/^cc_/)
                expect(result.clientSecret).toMatch(/^cs_/)
                expect(result.clientName).toBe('Test Client')
                expect(mockRepository.save).toHaveBeenCalled()
            })

            it('should throw when clientName is missing', async () => {
                await expect(oauthClientService.createOAuthClient('', ['admin:full'])).rejects.toThrow('clientName is required')
            })

            it('should throw when scopes is empty', async () => {
                await expect(oauthClientService.createOAuthClient('Test', [])).rejects.toThrow('At least one scope is required')
            })

            it('should throw when scopes are invalid', async () => {
                await expect(oauthClientService.createOAuthClient('Test', ['invalid:scope'])).rejects.toThrow('Invalid scopes')
            })
        })

        describe('verifyClientCredentials', () => {
            it('should return client when credentials are valid', async () => {
                const plainSecret = 'cs_test_secret'
                const hashedSecret = await bcrypt.hash(plainSecret, 10)
                const mockClient = {
                    id: '1',
                    clientId: 'cc_test',
                    clientSecret: hashedSecret,
                    clientName: 'Test',
                    scopes: '["admin:full"]'
                }
                mockRepository.findOneBy.mockResolvedValueOnce(mockClient)

                const result = await oauthClientService.verifyClientCredentials('cc_test', plainSecret)

                expect(result.clientId).toBe('cc_test')
            })

            it('should throw when client not found', async () => {
                mockRepository.findOneBy.mockResolvedValueOnce(null)

                await expect(oauthClientService.verifyClientCredentials('cc_invalid', 'secret')).rejects.toThrow(
                    'Invalid client credentials'
                )
            })

            it('should throw when secret is wrong', async () => {
                const hashedSecret = await bcrypt.hash('correct_secret', 10)
                const mockClient = {
                    id: '1',
                    clientId: 'cc_test',
                    clientSecret: hashedSecret
                }
                mockRepository.findOneBy.mockResolvedValueOnce(mockClient)

                await expect(oauthClientService.verifyClientCredentials('cc_test', 'wrong_secret')).rejects.toThrow(
                    'Invalid client credentials'
                )
            })
        })

        describe('deleteOAuthClient', () => {
            it('should delete an existing client', async () => {
                mockRepository.delete.mockResolvedValueOnce({ affected: 1 })

                const result = await oauthClientService.deleteOAuthClient('1')

                expect(result.affected).toBe(1)
            })

            it('should throw when client not found', async () => {
                mockRepository.delete.mockResolvedValueOnce({ affected: 0 })

                await expect(oauthClientService.deleteOAuthClient('nonexistent')).rejects.toThrow('not found')
            })
        })
    })
}
