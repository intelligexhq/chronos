import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * v1.6.0 follow-up — remove vestigial Assistant support.
 *
 * The Custom Assistant flow type was deprecated in v1.5.x (the runtime
 * now hard-rejects anything other than AGENTFLOW). The `assistant` table
 * and the `ASSISTANT` value of `agent_flow.type` are no longer reachable
 * from any code path. This migration:
 *  1. Coerces any lingering `agent_flow.type = 'ASSISTANT'` rows to
 *     'AGENTFLOW' so they continue to load (they wouldn't have run anyway).
 *  2. Drops the `assistant` table.
 */
export class RemoveAssistantSupport1800000000008 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE agent_flow SET type = 'AGENTFLOW' WHERE type = 'ASSISTANT';`)
        await queryRunner.query(`DROP TABLE IF EXISTS assistant;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Recreate an empty assistant table so a downgrade doesn't hard-fail.
        // The original baseline schema is reproduced here. Coerced rows in
        // agent_flow are not restored (they were already orphaned).
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS assistant (
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                "credential" uuid NOT NULL,
                "details" text NOT NULL,
                "type" text NULL,
                "iconSrc" varchar NULL,
                "createdDate" timestamp NOT NULL DEFAULT now(),
                "updatedDate" timestamp NOT NULL DEFAULT now(),
                CONSTRAINT "PK_3c7cea7a044ac4c92764576cdbf" PRIMARY KEY (id)
            );
        `)
    }
}
