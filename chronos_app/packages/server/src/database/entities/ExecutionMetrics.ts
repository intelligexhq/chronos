import { Entity, Column, Index, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm'

/**
 * Stores per-execution performance and cost metrics.
 * One row per completed execution, written by MetricsCollector.
 */
@Entity()
export class ExecutionMetrics {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Index()
    @Column({ type: 'uuid' })
    agentflowId: string

    @Index({ unique: true })
    @Column({ type: 'uuid' })
    executionId: string

    @Column({ type: 'varchar' })
    state: string

    @Column({ type: 'int', default: 0 })
    durationMs: number

    @Column({ type: 'int', default: 0 })
    totalTokens: number

    @Column({ type: 'int', default: 0 })
    inputTokens: number

    @Column({ type: 'int', default: 0 })
    outputTokens: number

    @Column({ type: 'decimal', precision: 12, scale: 6, default: 0 })
    estimatedCostUsd: number

    @Column({ type: 'boolean', default: true })
    hasPricing: boolean

    @Column({ type: 'int', default: 0 })
    nodeCount: number

    @Column({ type: 'int', default: 0 })
    llmCallCount: number

    @Column({ nullable: true, type: 'text' })
    modelBreakdown: string | null

    @Column({ type: 'varchar', default: 'manual' })
    triggerType: string

    @Column({ type: 'timestamp' })
    @CreateDateColumn()
    createdDate: Date
}
