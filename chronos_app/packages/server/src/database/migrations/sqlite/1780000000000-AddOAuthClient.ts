import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddOAuthClient1780000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "oauth_client" (
                id varchar(36) NOT NULL PRIMARY KEY,
                "clientId" varchar NOT NULL UNIQUE,
                "clientSecret" text NOT NULL,
                "clientName" text NOT NULL,
                scopes text,
                "createdDate" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedDate" datetime NOT NULL DEFAULT (datetime('now'))
            );`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "oauth_client"`)
    }
}
