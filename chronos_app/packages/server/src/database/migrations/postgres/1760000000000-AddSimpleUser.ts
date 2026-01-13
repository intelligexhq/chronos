import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddSimpleUser1760000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "user" (
                id varchar(36) NOT NULL,
                email varchar NOT NULL UNIQUE,
                password text NOT NULL,
                name varchar,
                status varchar NOT NULL DEFAULT 'unverified',
                "createdDate" timestamp NOT NULL DEFAULT now(),
                "updatedDate" timestamp NOT NULL DEFAULT now(),
                CONSTRAINT "PK_user_id" PRIMARY KEY (id)
            );`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "user"`)
    }
}
