import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm'

export enum UserStatus {
    ACTIVE = 'active',
    UNVERIFIED = 'unverified',
    DELETED = 'deleted'
}

@Entity('user')
export class User {
    @PrimaryColumn({ type: 'varchar', length: 36 })
    id: string

    @Column({ type: 'varchar', unique: true })
    email: string

    @Column({ type: 'text' })
    password: string

    @Column({ type: 'varchar', nullable: true })
    name: string

    @Column({ type: 'varchar', default: UserStatus.UNVERIFIED })
    status: UserStatus

    @CreateDateColumn()
    createdDate: Date

    @UpdateDateColumn()
    updatedDate: Date
}
