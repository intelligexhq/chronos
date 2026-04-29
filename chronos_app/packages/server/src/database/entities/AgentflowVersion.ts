/* eslint-disable */
import { Entity, Column, Index, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { IAgentflowVersion } from '../../Interface'
import { AgentFlow } from './AgentFlow'

/**
 * Immutable snapshot of an agentflow at the moment it was published.
 *
 * One row is created per publish action. Rollback re-points
 * AgentFlow.publishedVersionId at an existing row but never mutates it.
 */
@Entity()
@Index('IDX_agentflow_version_agentflowId_version', ['agentflowId', 'version'], { unique: true })
export class AgentflowVersion implements IAgentflowVersion {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Index()
    @Column({ type: 'uuid' })
    agentflowId: string

    @Column({ type: 'int' })
    version: number

    @Column({ type: 'text' })
    flowData: string

    @Column({ nullable: true, type: 'text' })
    chatbotConfig?: string

    @Column({ nullable: true, type: 'text' })
    apiConfig?: string

    @Column({ nullable: true, type: 'text' })
    analytic?: string

    @Column({ nullable: true, type: 'text' })
    speechToText?: string

    @Column({ nullable: true, type: 'text' })
    textToSpeech?: string

    @Column({ nullable: true, type: 'text' })
    followUpPrompts?: string

    @Column({ nullable: true, type: 'text' })
    notes?: string

    @Column({ nullable: true, type: 'varchar' })
    publishedBy?: string

    @Column({ type: 'timestamp' })
    @CreateDateColumn()
    createdDate: Date

    @ManyToOne(() => AgentFlow)
    @JoinColumn({ name: 'agentflowId' })
    agentflow: AgentFlow
}
