import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * v1.9 — drop the single-valued `agent_flow.type` column (postgres).
 *
 * Mirrors the sqlite migration. The column has only ever held one
 * value ('AGENTFLOW') since v1.5 — the v1.6 0008 migration coerced any
 * lingering 'ASSISTANT' rows. With the entity, validator, and `?type=`
 * API filter removed in v1.9, the column carries no information.
 *
 * `down()` recreates the column with the historical default so a
 * downgrade keeps the schema loadable. Existing rows get the default;
 * the original type values are not preserved (they were all 'AGENTFLOW'
 * by v1.6).
 */
export class DropAgentflowTypeColumn1800000000018 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE agent_flow DROP COLUMN "type";`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE agent_flow ADD COLUMN "type" VARCHAR(20) NOT NULL DEFAULT 'AGENTFLOW';`)
    }
}
