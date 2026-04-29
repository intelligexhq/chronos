import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * v1.5.0 — Agent Versioning & Draft/Publish.
 *
 * Adds an immutable `agentflow_version` snapshot table and three pointer
 * columns on `agent_flow` so that draft edits no longer affect production
 * traffic. Backfills a v1 entry for every existing agentflow so behavior
 * is preserved on upgrade.
 */
export class AddAgentflowVersioning1800000000004 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS agentflow_version (
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                "agentflowId" uuid NOT NULL,
                "version" int NOT NULL,
                "flowData" text NOT NULL,
                "chatbotConfig" text NULL,
                "apiConfig" text NULL,
                "analytic" text NULL,
                "speechToText" text NULL,
                "textToSpeech" text NULL,
                "followUpPrompts" text NULL,
                "notes" text NULL,
                "publishedBy" varchar NULL,
                "createdDate" timestamp NOT NULL DEFAULT now(),
                CONSTRAINT "PK_agentflow_version" PRIMARY KEY (id)
            );
        `)

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_agentflow_version_agentflowId" ON agentflow_version ("agentflowId");`)
        await queryRunner.query(
            `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_agentflow_version_agentflowId_version" ON agentflow_version ("agentflowId", "version");`
        )

        await queryRunner.query(`ALTER TABLE agent_flow ADD COLUMN IF NOT EXISTS "publishedFlowData" text NULL;`)
        await queryRunner.query(`ALTER TABLE agent_flow ADD COLUMN IF NOT EXISTS "publishedVersionId" uuid NULL;`)
        await queryRunner.query(`ALTER TABLE agent_flow ADD COLUMN IF NOT EXISTS "currentVersion" int NULL;`)

        // Backfill: every existing agentflow becomes v1, marked as the active published version.
        await queryRunner.query(`
            WITH inserted AS (
                INSERT INTO agentflow_version
                    ("agentflowId", "version", "flowData", "chatbotConfig", "apiConfig", "analytic", "speechToText", "textToSpeech", "followUpPrompts", "notes")
                SELECT id, 1, "flowData", "chatbotConfig", "apiConfig", "analytic", "speechToText", "textToSpeech", "followUpPrompts", 'Initial version (auto-migrated)'
                FROM agent_flow
                RETURNING id, "agentflowId", "flowData"
            )
            UPDATE agent_flow af
            SET "publishedFlowData" = inserted."flowData",
                "publishedVersionId" = inserted.id,
                "currentVersion" = 1
            FROM inserted
            WHERE af.id = inserted."agentflowId";
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE agent_flow DROP COLUMN IF EXISTS "currentVersion";`)
        await queryRunner.query(`ALTER TABLE agent_flow DROP COLUMN IF EXISTS "publishedVersionId";`)
        await queryRunner.query(`ALTER TABLE agent_flow DROP COLUMN IF EXISTS "publishedFlowData";`)

        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_agentflow_version_agentflowId_version";`)
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_agentflow_version_agentflowId";`)
        await queryRunner.query(`DROP TABLE IF EXISTS agentflow_version;`)
    }
}
