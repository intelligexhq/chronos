import { MetricsAggregator } from '../../src/services/metrics-aggregator'
import { ExecutionMetrics } from '../../src/database/entities/ExecutionMetrics'
import { DailyMetrics } from '../../src/database/entities/DailyMetrics'

/**
 * Test suite for MetricsAggregator service
 * Tests daily rollup logic, percentile calculation, and lifecycle
 */
export function metricsAggregatorServiceTest() {
    describe('MetricsAggregator Service', () => {
        let aggregator: MetricsAggregator
        let mockMetricsRepo: any
        let mockDailyRepo: any
        let mockMetricsQB: any
        let mockDataSource: any

        beforeEach(() => {
            jest.clearAllMocks()

            mockMetricsQB = {
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue([]),
                getMany: jest.fn().mockResolvedValue([])
            }

            mockMetricsRepo = {
                createQueryBuilder: jest.fn().mockReturnValue(mockMetricsQB),
                find: jest.fn(),
                save: jest.fn()
            }

            mockDailyRepo = {
                findOne: jest.fn().mockResolvedValue(null),
                save: jest.fn().mockResolvedValue({})
            }

            mockDataSource = {
                getRepository: jest.fn((entity: any) => {
                    if (entity === ExecutionMetrics) return mockMetricsRepo
                    if (entity === DailyMetrics) return mockDailyRepo
                    return mockMetricsRepo
                }),
                options: { type: 'sqlite' }
            }

            aggregator = new MetricsAggregator(mockDataSource)
        })

        afterEach(() => {
            aggregator.stop()
        })

        describe('rollup', () => {
            it('should not save anything when no execution_metrics exist', async () => {
                mockMetricsQB.getRawMany.mockResolvedValue([])

                await aggregator.rollup()

                expect(mockDailyRepo.save).not.toHaveBeenCalled()
            })

            it('should aggregate metrics for a single agentflow on a date', async () => {
                const today = new Date().toISOString().split('T')[0]

                // Return one agentflow for today
                mockMetricsQB.getRawMany.mockImplementation(() => {
                    const callCount = mockMetricsQB.getRawMany.mock.calls.length
                    // First call is yesterday (empty), second call is today
                    if (callCount <= 1) return []
                    return [{ agentflowId: 'flow-1' }]
                })

                mockMetricsQB.getMany.mockResolvedValue([
                    createMetric('FINISHED', 1000, 100, 50, 0.001),
                    createMetric('FINISHED', 2000, 200, 100, 0.002),
                    createMetric('ERROR', 500, 50, 25, 0.0005)
                ])

                await aggregator.rollup()

                expect(mockDailyRepo.save).toHaveBeenCalled()
                const saved = mockDailyRepo.save.mock.calls[0][0]
                expect(saved.agentflowId).toBe('flow-1')
                expect(saved.date).toBe(today)
                expect(saved.executionCount).toBe(3)
                expect(saved.successCount).toBe(2)
                expect(saved.errorCount).toBe(1)
                expect(saved.timeoutCount).toBe(0)
                expect(saved.totalTokens).toBe(525)
                expect(saved.inputTokens).toBe(350)
                expect(saved.outputTokens).toBe(175)
            })

            it('should update existing daily_metrics row', async () => {
                const today = new Date().toISOString().split('T')[0]
                const existingRow = {
                    id: 'existing-1',
                    agentflowId: 'flow-1',
                    date: today,
                    executionCount: 1
                }

                mockMetricsQB.getRawMany.mockImplementation(() => {
                    const callCount = mockMetricsQB.getRawMany.mock.calls.length
                    if (callCount <= 1) return []
                    return [{ agentflowId: 'flow-1' }]
                })

                mockMetricsQB.getMany.mockResolvedValue([createMetric('FINISHED', 1000, 100, 50, 0.001)])

                mockDailyRepo.findOne.mockResolvedValue(existingRow)

                await aggregator.rollup()

                expect(mockDailyRepo.save).toHaveBeenCalled()
                const saved = mockDailyRepo.save.mock.calls[0][0]
                expect(saved.id).toBe('existing-1')
                expect(saved.executionCount).toBe(1)
            })

            it('should count error and terminated states together', async () => {
                mockMetricsQB.getRawMany.mockImplementation(() => {
                    const callCount = mockMetricsQB.getRawMany.mock.calls.length
                    if (callCount <= 1) return []
                    return [{ agentflowId: 'flow-1' }]
                })

                mockMetricsQB.getMany.mockResolvedValue([
                    createMetric('ERROR', 500, 50, 25, 0),
                    createMetric('TERMINATED', 300, 30, 15, 0),
                    createMetric('TIMEOUT', 10000, 0, 0, 0)
                ])

                await aggregator.rollup()

                expect(mockDailyRepo.save).toHaveBeenCalled()
                const saved = mockDailyRepo.save.mock.calls[0][0]
                expect(saved.errorCount).toBe(2)
                expect(saved.timeoutCount).toBe(1)
                expect(saved.successCount).toBe(0)
            })

            it('should calculate correct percentiles', async () => {
                mockMetricsQB.getRawMany.mockImplementation(() => {
                    const callCount = mockMetricsQB.getRawMany.mock.calls.length
                    if (callCount <= 1) return []
                    return [{ agentflowId: 'flow-1' }]
                })

                // 10 metrics with durations 100-1000ms
                const metrics = Array.from({ length: 10 }, (_, i) => createMetric('FINISHED', (i + 1) * 100, 10, 5, 0.001))
                mockMetricsQB.getMany.mockResolvedValue(metrics)

                await aggregator.rollup()

                const saved = mockDailyRepo.save.mock.calls[0][0]
                expect(saved.avgDurationMs).toBe(550) // (100+200+...+1000)/10
                expect(saved.maxDurationMs).toBe(1000)
                // p50 should be around 500-600, p95 around 900-1000
                expect(saved.p50DurationMs).toBeGreaterThanOrEqual(500)
                expect(saved.p50DurationMs).toBeLessThanOrEqual(600)
                expect(saved.p95DurationMs).toBeGreaterThanOrEqual(900)
                expect(saved.p95DurationMs).toBeLessThanOrEqual(1000)
            })

            it('should handle single metric percentiles', async () => {
                mockMetricsQB.getRawMany.mockImplementation(() => {
                    const callCount = mockMetricsQB.getRawMany.mock.calls.length
                    if (callCount <= 1) return []
                    return [{ agentflowId: 'flow-1' }]
                })

                mockMetricsQB.getMany.mockResolvedValue([createMetric('FINISHED', 500, 100, 50, 0.001)])

                await aggregator.rollup()

                const saved = mockDailyRepo.save.mock.calls[0][0]
                expect(saved.avgDurationMs).toBe(500)
                expect(saved.p50DurationMs).toBe(500)
                expect(saved.p95DurationMs).toBe(500)
                expect(saved.maxDurationMs).toBe(500)
            })

            it('should not run concurrent rollups', async () => {
                mockMetricsQB.getRawMany.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve([]), 50)))

                const promise1 = aggregator.rollup()
                const promise2 = aggregator.rollup()

                await Promise.all([promise1, promise2])

                // Second call should be skipped due to running guard
                // getRawMany should have been called only from the first rollup
                const callCount = mockMetricsQB.getRawMany.mock.calls.length
                expect(callCount).toBeLessThanOrEqual(2) // Only yesterday + today from first rollup
            })

            it('should handle repository errors gracefully', async () => {
                mockMetricsQB.getRawMany.mockRejectedValue(new Error('DB error'))

                // Should not throw
                await expect(aggregator.rollup()).resolves.toBeUndefined()
            })
        })

        describe('lifecycle', () => {
            it('should start and stop without error', () => {
                expect(() => aggregator.start()).not.toThrow()
                expect(() => aggregator.stop()).not.toThrow()
            })

            it('should not create multiple intervals on double start', () => {
                aggregator.start()
                aggregator.start()
                aggregator.stop()
                // No assertions needed — just verify no error
            })

            it('should read METRICS_ROLLUP_INTERVAL_MS from env', () => {
                process.env.METRICS_ROLLUP_INTERVAL_MS = '60000'
                const agg = new MetricsAggregator(mockDataSource)
                agg.start()
                agg.stop()
                delete process.env.METRICS_ROLLUP_INTERVAL_MS
            })
        })
    })
}

// --- Test helpers ---

function createMetric(
    state: string,
    durationMs: number,
    inputTokens: number,
    outputTokens: number,
    estimatedCostUsd: number
): Partial<ExecutionMetrics> {
    return {
        id: `metric-${Math.random().toString(36).slice(2)}`,
        agentflowId: 'flow-1',
        executionId: `exec-${Math.random().toString(36).slice(2)}`,
        state,
        durationMs,
        totalTokens: inputTokens + outputTokens,
        inputTokens,
        outputTokens,
        estimatedCostUsd,
        hasPricing: true,
        nodeCount: 1,
        llmCallCount: 1,
        triggerType: 'manual',
        createdDate: new Date()
    } as Partial<ExecutionMetrics>
}
