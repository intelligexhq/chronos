import { Entity, Column, Index, PrimaryGeneratedColumn } from 'typeorm'

/**
 * Pre-aggregated daily metrics per agentflow.
 * Populated by MetricsAggregator on a configurable interval.
 */
@Entity()
@Index(['agentflowId', 'date'], { unique: true })
export class DailyMetrics {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Index()
    @Column({ type: 'uuid' })
    agentflowId: string

    @Column({ type: 'varchar', length: 10 })
    date: string

    @Column({ type: 'int', default: 0 })
    executionCount: number

    @Column({ type: 'int', default: 0 })
    successCount: number

    @Column({ type: 'int', default: 0 })
    errorCount: number

    @Column({ type: 'int', default: 0 })
    timeoutCount: number

    @Column({ type: 'bigint', default: 0 })
    totalTokens: number

    @Column({ type: 'bigint', default: 0 })
    inputTokens: number

    @Column({ type: 'bigint', default: 0 })
    outputTokens: number

    @Column({ type: 'decimal', precision: 12, scale: 6, default: 0 })
    totalCostUsd: number

    @Column({ type: 'int', default: 0 })
    avgDurationMs: number

    @Column({ type: 'int', default: 0 })
    p50DurationMs: number

    @Column({ type: 'int', default: 0 })
    p95DurationMs: number

    @Column({ type: 'int', default: 0 })
    maxDurationMs: number
}
