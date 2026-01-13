import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddSimpleUser1760000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS \`user\` (
                id varchar(36) NOT NULL,
                email varchar(255) NOT NULL UNIQUE,
                password text NOT NULL,
                name varchar(255),
                status varchar(50) NOT NULL DEFAULT 'unverified',
                createdDate timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updatedDate timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (id)
            );`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS \`user\``)
    }
}
