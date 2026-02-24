import { StatusCodes } from 'http-status-codes'
import {
    ENTERPRISE_FEATURE_FLAGS,
    getCurrentUsage,
    checkUsageLimit,
    updatePredictionsUsage,
    checkPredictions,
    updateStorageUsage,
    checkStorage
} from '../../src/utils/quotaUsage'
import { LICENSE_QUOTAS } from '../../src/utils/constants'

/**
 * Creates a mock UsageCacheManager for testing
 * @param overrides - Optional method overrides
 * @returns Mocked UsageCacheManager
 */
function createMockCacheManager(overrides: Record<string, any> = {}) {
    return {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn(),
        getTTL: jest.fn().mockResolvedValue(null),
        getQuotas: jest.fn().mockResolvedValue({
            [LICENSE_QUOTAS.PREDICTIONS_LIMIT]: -1,
            [LICENSE_QUOTAS.STORAGE_LIMIT]: -1,
            [LICENSE_QUOTAS.FLOWS_LIMIT]: -1,
            [LICENSE_QUOTAS.USERS_LIMIT]: -1,
            [LICENSE_QUOTAS.ADDITIONAL_SEATS_LIMIT]: -1
        }),
        getSubscriptionDetails: jest.fn().mockResolvedValue(null),
        ...overrides
    } as any
}

/**
 * Test suite for quota usage utility functions
 * Tests usage tracking, limit checking, and feature flags
 */
export function quotaUsageUtilTest() {
    describe('Quota Usage Utilities', () => {
        describe('ENTERPRISE_FEATURE_FLAGS', () => {
            it('should export an array of feature flags', () => {
                expect(Array.isArray(ENTERPRISE_FEATURE_FLAGS)).toBe(true)
                expect(ENTERPRISE_FEATURE_FLAGS.length).toBeGreaterThan(0)
            })

            it('should contain expected feature flags', () => {
                expect(ENTERPRISE_FEATURE_FLAGS).toContain('feat:datasets')
                expect(ENTERPRISE_FEATURE_FLAGS).toContain('feat:evaluations')
                expect(ENTERPRISE_FEATURE_FLAGS).toContain('feat:files')
                expect(ENTERPRISE_FEATURE_FLAGS).toContain('feat:users')
                expect(ENTERPRISE_FEATURE_FLAGS).toContain('feat:workspaces')
            })

            it('should have all entries prefixed with feat:', () => {
                ENTERPRISE_FEATURE_FLAGS.forEach((flag) => {
                    expect(flag).toMatch(/^feat:/)
                })
            })
        })

        describe('getCurrentUsage', () => {
            it('should return undefined when usageCacheManager is falsy', async () => {
                const result = await getCurrentUsage('org1', 'sub1', null as any)
                expect(result).toBeUndefined()
            })

            it('should return undefined when subscriptionId is empty', async () => {
                const mock = createMockCacheManager()
                const result = await getCurrentUsage('org1', '', mock)
                expect(result).toBeUndefined()
            })

            it('should return undefined when orgId is empty', async () => {
                const mock = createMockCacheManager()
                const result = await getCurrentUsage('', 'sub1', mock)
                expect(result).toBeUndefined()
            })

            it('should return usage and limits', async () => {
                const mock = createMockCacheManager({
                    get: jest.fn().mockImplementation((key: string) => {
                        if (key === 'storage:org1') return Promise.resolve(500)
                        if (key === 'predictions:org1') return Promise.resolve(100)
                        return Promise.resolve(null)
                    }),
                    getQuotas: jest.fn().mockResolvedValue({
                        [LICENSE_QUOTAS.STORAGE_LIMIT]: 1000,
                        [LICENSE_QUOTAS.PREDICTIONS_LIMIT]: 500
                    })
                })

                const result = await getCurrentUsage('org1', 'sub1', mock)
                expect(result).toEqual({
                    predictions: { usage: 100, limit: 500 },
                    storage: { usage: 500, limit: 1000 }
                })
            })

            it('should default to 0 when cache returns null', async () => {
                const mock = createMockCacheManager({
                    get: jest.fn().mockResolvedValue(null),
                    getQuotas: jest.fn().mockResolvedValue({
                        [LICENSE_QUOTAS.STORAGE_LIMIT]: 1000,
                        [LICENSE_QUOTAS.PREDICTIONS_LIMIT]: 500
                    })
                })

                const result = await getCurrentUsage('org1', 'sub1', mock)
                expect(result!.predictions.usage).toBe(0)
                expect(result!.storage.usage).toBe(0)
            })

            it('should throw when cache manager throws', async () => {
                const mock = createMockCacheManager({
                    get: jest.fn().mockRejectedValue(new Error('Cache error'))
                })

                await expect(getCurrentUsage('org1', 'sub1', mock)).rejects.toThrow('Cache error')
            })
        })

        describe('checkUsageLimit', () => {
            it('should return undefined when usageCacheManager is falsy', async () => {
                const result = await checkUsageLimit('flows', 'sub1', null as any, 5)
                expect(result).toBeUndefined()
            })

            it('should return undefined when subscriptionId is empty', async () => {
                const mock = createMockCacheManager()
                const result = await checkUsageLimit('flows', '', mock, 5)
                expect(result).toBeUndefined()
            })

            it('should not throw when flows usage is within limit', async () => {
                const mock = createMockCacheManager({
                    getQuotas: jest.fn().mockResolvedValue({
                        [LICENSE_QUOTAS.FLOWS_LIMIT]: 10,
                        [LICENSE_QUOTAS.USERS_LIMIT]: -1,
                        [LICENSE_QUOTAS.ADDITIONAL_SEATS_LIMIT]: -1
                    })
                })

                await expect(checkUsageLimit('flows', 'sub1', mock, 5)).resolves.not.toThrow()
            })

            it('should throw when flows usage exceeds limit', async () => {
                const mock = createMockCacheManager({
                    getQuotas: jest.fn().mockResolvedValue({
                        [LICENSE_QUOTAS.FLOWS_LIMIT]: 5,
                        [LICENSE_QUOTAS.USERS_LIMIT]: -1,
                        [LICENSE_QUOTAS.ADDITIONAL_SEATS_LIMIT]: -1
                    })
                })

                await expect(checkUsageLimit('flows', 'sub1', mock, 10)).rejects.toMatchObject({
                    statusCode: StatusCodes.PAYMENT_REQUIRED
                })
            })

            it('should check users limit with additional seats', async () => {
                const mock = createMockCacheManager({
                    getQuotas: jest.fn().mockResolvedValue({
                        [LICENSE_QUOTAS.FLOWS_LIMIT]: -1,
                        [LICENSE_QUOTAS.USERS_LIMIT]: 5,
                        [LICENSE_QUOTAS.ADDITIONAL_SEATS_LIMIT]: 3
                    })
                })

                // Total limit = 5 + 3 = 8, usage is 7, should pass
                await expect(checkUsageLimit('users', 'sub1', mock, 7)).resolves.not.toThrow()
            })

            it('should throw when users usage exceeds limit plus additional seats', async () => {
                const mock = createMockCacheManager({
                    getQuotas: jest.fn().mockResolvedValue({
                        [LICENSE_QUOTAS.FLOWS_LIMIT]: -1,
                        [LICENSE_QUOTAS.USERS_LIMIT]: 5,
                        [LICENSE_QUOTAS.ADDITIONAL_SEATS_LIMIT]: 3
                    })
                })

                // Total limit = 5 + 3 = 8, usage is 9, should throw
                await expect(checkUsageLimit('users', 'sub1', mock, 9)).rejects.toMatchObject({
                    statusCode: StatusCodes.PAYMENT_REQUIRED
                })
            })

            it('should return undefined when limit is -1 (unlimited)', async () => {
                const mock = createMockCacheManager()
                const result = await checkUsageLimit('flows', 'sub1', mock, 9999)
                expect(result).toBeUndefined()
            })
        })

        describe('updatePredictionsUsage', () => {
            it('should return undefined when usageCacheManager is falsy', async () => {
                const result = await updatePredictionsUsage('org1', 'sub1', '', undefined)
                expect(result).toBeUndefined()
            })

            it('should set predictions to 1 when no existing predictions', async () => {
                const mock = createMockCacheManager({
                    get: jest.fn().mockResolvedValue(null),
                    getTTL: jest.fn().mockResolvedValue(null),
                    getSubscriptionDetails: jest.fn().mockResolvedValue(null),
                    getQuotas: jest.fn().mockResolvedValue({
                        [LICENSE_QUOTAS.PREDICTIONS_LIMIT]: 100
                    })
                })

                await updatePredictionsUsage('org1', 'sub1', '', mock)
                // Should set with ~30 day TTL
                expect(mock.set).toHaveBeenCalledWith('predictions:org1', 1, expect.any(Number))
            })

            it('should increment existing predictions', async () => {
                const mock = createMockCacheManager({
                    get: jest.fn().mockResolvedValue(5),
                    getTTL: jest.fn().mockResolvedValue(Date.now() + 100000),
                    getQuotas: jest.fn().mockResolvedValue({
                        [LICENSE_QUOTAS.PREDICTIONS_LIMIT]: 100
                    })
                })

                await updatePredictionsUsage('org1', 'sub1', '', mock)
                expect(mock.set).toHaveBeenCalledWith('predictions:org1', 6, expect.any(Number))
            })

            it('should use subscription creation date for TTL when no existing TTL', async () => {
                const createdTimestamp = Math.floor(Date.now() / 1000) - 86400 // 1 day ago in seconds
                const mock = createMockCacheManager({
                    get: jest.fn().mockResolvedValue(null),
                    getTTL: jest.fn().mockResolvedValue(null),
                    getSubscriptionDetails: jest.fn().mockResolvedValue({ created: createdTimestamp }),
                    getQuotas: jest.fn().mockResolvedValue({
                        [LICENSE_QUOTAS.PREDICTIONS_LIMIT]: 100
                    })
                })

                await updatePredictionsUsage('org1', 'sub1', '', mock)
                expect(mock.set).toHaveBeenCalledWith('predictions:org1', 1, expect.any(Number))
            })

            it('should use existing TTL when available', async () => {
                const futureTTL = Date.now() + 500000
                const mock = createMockCacheManager({
                    get: jest.fn().mockResolvedValue(3),
                    getTTL: jest.fn().mockResolvedValue(futureTTL),
                    getQuotas: jest.fn().mockResolvedValue({
                        [LICENSE_QUOTAS.PREDICTIONS_LIMIT]: 100
                    })
                })

                await updatePredictionsUsage('org1', 'sub1', '', mock)
                expect(mock.set).toHaveBeenCalledWith('predictions:org1', 4, expect.any(Number))
            })

            it('should cap predictions at the limit', async () => {
                const mock = createMockCacheManager({
                    get: jest.fn().mockResolvedValue(99),
                    getTTL: jest.fn().mockResolvedValue(Date.now() + 100000),
                    getQuotas: jest.fn().mockResolvedValue({
                        [LICENSE_QUOTAS.PREDICTIONS_LIMIT]: 100
                    })
                })

                await updatePredictionsUsage('org1', 'sub1', '', mock)
                expect(mock.set).toHaveBeenCalledWith('predictions:org1', 100, expect.any(Number))
            })
        })

        describe('checkPredictions', () => {
            it('should return undefined when usageCacheManager is falsy', async () => {
                const result = await checkPredictions('org1', 'sub1', null as any)
                expect(result).toBeUndefined()
            })

            it('should return undefined when subscriptionId is empty', async () => {
                const mock = createMockCacheManager()
                const result = await checkPredictions('org1', '', mock)
                expect(result).toBeUndefined()
            })

            it('should return undefined when limit is -1 (unlimited)', async () => {
                const mock = createMockCacheManager({
                    get: jest.fn().mockResolvedValue(100)
                })
                const result = await checkPredictions('org1', 'sub1', mock)
                expect(result).toBeUndefined()
            })

            it('should return usage when within limit', async () => {
                const mock = createMockCacheManager({
                    get: jest.fn().mockResolvedValue(50),
                    getQuotas: jest.fn().mockResolvedValue({
                        [LICENSE_QUOTAS.PREDICTIONS_LIMIT]: 100
                    })
                })

                const result = await checkPredictions('org1', 'sub1', mock)
                expect(result).toEqual({ usage: 50, limit: 100 })
            })

            it('should throw when predictions at limit', async () => {
                const mock = createMockCacheManager({
                    get: jest.fn().mockResolvedValue(100),
                    getQuotas: jest.fn().mockResolvedValue({
                        [LICENSE_QUOTAS.PREDICTIONS_LIMIT]: 100
                    })
                })

                await expect(checkPredictions('org1', 'sub1', mock)).rejects.toMatchObject({
                    statusCode: StatusCodes.PAYMENT_REQUIRED
                })
            })

            it('should throw when predictions exceed limit', async () => {
                const mock = createMockCacheManager({
                    get: jest.fn().mockResolvedValue(150),
                    getQuotas: jest.fn().mockResolvedValue({
                        [LICENSE_QUOTAS.PREDICTIONS_LIMIT]: 100
                    })
                })

                await expect(checkPredictions('org1', 'sub1', mock)).rejects.toMatchObject({
                    statusCode: StatusCodes.PAYMENT_REQUIRED
                })
            })

            it('should default to 0 predictions when cache returns null', async () => {
                const mock = createMockCacheManager({
                    get: jest.fn().mockResolvedValue(null),
                    getQuotas: jest.fn().mockResolvedValue({
                        [LICENSE_QUOTAS.PREDICTIONS_LIMIT]: 100
                    })
                })

                const result = await checkPredictions('org1', 'sub1', mock)
                expect(result).toEqual({ usage: 0, limit: 100 })
            })
        })

        describe('updateStorageUsage', () => {
            it('should return undefined when usageCacheManager is falsy', () => {
                const result = updateStorageUsage('org1', '', 1000, undefined)
                expect(result).toBeUndefined()
            })

            it('should set storage usage in cache', () => {
                const mock = createMockCacheManager()
                updateStorageUsage('org1', '', 5000, mock)
                expect(mock.set).toHaveBeenCalledWith('storage:org1', 5000)
            })

            it('should update with zero size', () => {
                const mock = createMockCacheManager()
                updateStorageUsage('org1', '', 0, mock)
                expect(mock.set).toHaveBeenCalledWith('storage:org1', 0)
            })
        })

        describe('checkStorage', () => {
            it('should return undefined when usageCacheManager is falsy', async () => {
                const result = await checkStorage('org1', 'sub1', null as any)
                expect(result).toBeUndefined()
            })

            it('should return undefined when subscriptionId is empty', async () => {
                const mock = createMockCacheManager()
                const result = await checkStorage('org1', '', mock)
                expect(result).toBeUndefined()
            })

            it('should return undefined when limit is -1 (unlimited)', async () => {
                const mock = createMockCacheManager({
                    get: jest.fn().mockResolvedValue(9999)
                })
                const result = await checkStorage('org1', 'sub1', mock)
                expect(result).toBeUndefined()
            })

            it('should return usage when within limit', async () => {
                const mock = createMockCacheManager({
                    get: jest.fn().mockResolvedValue(500),
                    getQuotas: jest.fn().mockResolvedValue({
                        [LICENSE_QUOTAS.STORAGE_LIMIT]: 1000
                    })
                })

                const result = await checkStorage('org1', 'sub1', mock)
                expect(result).toEqual({ usage: 500, limit: 1000 })
            })

            it('should throw when storage at limit', async () => {
                const mock = createMockCacheManager({
                    get: jest.fn().mockResolvedValue(1000),
                    getQuotas: jest.fn().mockResolvedValue({
                        [LICENSE_QUOTAS.STORAGE_LIMIT]: 1000
                    })
                })

                await expect(checkStorage('org1', 'sub1', mock)).rejects.toMatchObject({
                    statusCode: StatusCodes.PAYMENT_REQUIRED
                })
            })

            it('should throw when storage exceeds limit', async () => {
                const mock = createMockCacheManager({
                    get: jest.fn().mockResolvedValue(1500),
                    getQuotas: jest.fn().mockResolvedValue({
                        [LICENSE_QUOTAS.STORAGE_LIMIT]: 1000
                    })
                })

                await expect(checkStorage('org1', 'sub1', mock)).rejects.toMatchObject({
                    statusCode: StatusCodes.PAYMENT_REQUIRED
                })
            })

            it('should default to 0 storage when cache returns null', async () => {
                const mock = createMockCacheManager({
                    get: jest.fn().mockResolvedValue(null),
                    getQuotas: jest.fn().mockResolvedValue({
                        [LICENSE_QUOTAS.STORAGE_LIMIT]: 1000
                    })
                })

                const result = await checkStorage('org1', 'sub1', mock)
                expect(result).toEqual({ usage: 0, limit: 1000 })
            })
        })
    })
}
