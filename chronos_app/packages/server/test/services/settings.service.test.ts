import { Platform } from '../../src/Interface'

/**
 * Mock setup for settings service tests
 */
const mockIdentityManager: any = {
    getPlatformType: jest.fn().mockReturnValue(Platform.OPEN_SOURCE),
    isLicenseValid: jest.fn().mockReturnValue(true)
}

const mockAppServer = {
    identityManager: mockIdentityManager
}

jest.mock('../../src/utils/getRunningExpressApp', () => ({
    getRunningExpressApp: jest.fn(() => mockAppServer)
}))

// Import the service after mocking
import settingsService from '../../src/services/settings'

/**
 * Test suite for Settings service
 * Tests platform-specific settings retrieval
 */
export function settingsServiceTest() {
    describe('Settings Service', () => {
        beforeEach(() => {
            jest.clearAllMocks()
        })

        describe('getSettings', () => {
            it('should return OPEN_SOURCE platform type for open source', async () => {
                mockIdentityManager.getPlatformType.mockReturnValue(Platform.OPEN_SOURCE)

                const result = await settingsService.getSettings()

                expect(result).toEqual({ PLATFORM_TYPE: Platform.OPEN_SOURCE })
            })

            it('should return CLOUD platform type for cloud', async () => {
                mockIdentityManager.getPlatformType.mockReturnValue(Platform.CLOUD)

                const result = await settingsService.getSettings()

                expect(result).toEqual({ PLATFORM_TYPE: Platform.CLOUD })
            })

            it('should return ENTERPRISE platform type for valid enterprise license', async () => {
                mockIdentityManager.getPlatformType.mockReturnValue(Platform.ENTERPRISE)
                mockIdentityManager.isLicenseValid = jest.fn().mockReturnValue(true)

                const result = await settingsService.getSettings()

                expect(result).toEqual({ PLATFORM_TYPE: Platform.ENTERPRISE })
            })

            it('should return empty object for invalid enterprise license', async () => {
                mockIdentityManager.getPlatformType.mockReturnValue(Platform.ENTERPRISE)
                mockIdentityManager.isLicenseValid = jest.fn().mockReturnValue(false)

                const result = await settingsService.getSettings()

                expect(result).toEqual({})
            })

            it('should return empty object on error', async () => {
                mockIdentityManager.getPlatformType.mockImplementation(() => {
                    throw new Error('Identity manager error')
                })

                const result = await settingsService.getSettings()

                expect(result).toEqual({})
            })
        })
    })
}
