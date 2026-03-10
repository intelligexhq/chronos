import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm'
import { IOAuthClient } from '../../Interface'

@Entity('oauth_client')
export class OAuthClient implements IOAuthClient {
    @PrimaryColumn({ type: 'varchar', length: 36 })
    id: string

    @Column({ type: 'varchar', unique: true })
    clientId: string

    @Column({ type: 'text' })
    clientSecret: string

    @Column({ type: 'text' })
    clientName: string

    @Column({ type: 'text', nullable: true })
    scopes: string | null

    @CreateDateColumn()
    createdDate: Date

    @UpdateDateColumn()
    updatedDate: Date
}
