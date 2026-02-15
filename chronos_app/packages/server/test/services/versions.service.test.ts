import * as fs from 'fs'

/**
 * Mock fs module for versions service tests
 */
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    existsSync: jest.fn(),
    promises: {
        readFile: jest.fn()
    }
}))

// Import the service after mocking
import versionsService from '../../src/services/versions'

/**
 * Test suite for Versions service
 * Tests version retrieval from package.json
 */
export function versionsServiceTest() {
    describe('Versions Service', () => {
        beforeEach(() => {
            jest.clearAllMocks()
        })

        describe('getVersion', () => {
            it('should return version from package.json', async () => {
                const mockPackageJson = JSON.stringify({ version: '1.2.3' })

                ;(fs.existsSync as jest.Mock).mockReturnValue(true)
                ;(fs.promises.readFile as jest.Mock).mockResolvedValue(mockPackageJson)

                const result = await versionsService.getVersion()

                expect(result).toEqual({ version: '1.2.3' })
            })

            it('should check multiple paths to find package.json', async () => {
                const mockPackageJson = JSON.stringify({ version: '2.0.0' })

                // First few paths don't exist, then one does
                ;(fs.existsSync as jest.Mock).mockReturnValueOnce(false).mockReturnValueOnce(false).mockReturnValueOnce(true)
                ;(fs.promises.readFile as jest.Mock).mockResolvedValue(mockPackageJson)

                const result = await versionsService.getVersion()

                expect(result).toEqual({ version: '2.0.0' })
                expect(fs.existsSync).toHaveBeenCalledTimes(3)
            })

            it('should throw error when package.json not found', async () => {
                ;(fs.existsSync as jest.Mock).mockReturnValue(false)

                await expect(versionsService.getVersion()).rejects.toThrow('Version not found')
            })

            it('should throw error when package.json cannot be read', async () => {
                ;(fs.existsSync as jest.Mock).mockReturnValue(true)
                ;(fs.promises.readFile as jest.Mock).mockRejectedValue(new Error('Read error'))

                await expect(versionsService.getVersion()).rejects.toThrow('Version not found')
            })

            it('should throw error when package.json has invalid JSON', async () => {
                ;(fs.existsSync as jest.Mock).mockReturnValue(true)
                ;(fs.promises.readFile as jest.Mock).mockResolvedValue('invalid json')

                await expect(versionsService.getVersion()).rejects.toThrow()
            })
        })
    })
}
