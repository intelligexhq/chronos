/* eslint-disable */
import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn } from 'typeorm'
import { IAgentFlow } from '../../Interface'

@Entity()
export class AgentFlow implements IAgentFlow {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    name: string

    @Column({ type: 'text' })
    flowData: string

    @Column({ nullable: true })
    deployed?: boolean

    @Column({ nullable: true })
    isPublic?: boolean

    @Column({ nullable: true })
    apikeyid?: string

    @Column({ nullable: true, type: 'text' })
    chatbotConfig?: string

    @Column({ nullable: true, type: 'text' })
    apiConfig?: string

    @Column({ nullable: true, type: 'text' })
    analytic?: string

    @Column({ nullable: true, type: 'text' })
    followUpPrompts?: string

    @Column({ nullable: true, type: 'text' })
    category?: string

    @Column({ nullable: true })
    userId?: string

    @Column({ nullable: true, type: 'text' })
    publishedFlowData?: string

    @Column({ nullable: true, type: 'uuid' })
    publishedVersionId?: string

    @Column({ nullable: true, type: 'int' })
    currentVersion?: number

    @Column({ type: 'timestamp' })
    @CreateDateColumn()
    createdDate: Date

    @Column({ type: 'timestamp' })
    @UpdateDateColumn()
    updatedDate: Date
}
