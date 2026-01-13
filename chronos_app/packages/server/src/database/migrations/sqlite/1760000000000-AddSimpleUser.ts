import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddSimpleUser1760000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "user" (
                id varchar(36) NOT NULL PRIMARY KEY,
                email varchar NOT NULL UNIQUE,
                password text NOT NULL,
                name varchar,
                status varchar NOT NULL DEFAULT 'unverified',
                createdDate datetime NOT NULL DEFAULT (datetime('now')),
                updatedDate datetime NOT NULL DEFAULT (datetime('now'))
            );`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "user"`)
    }
}
