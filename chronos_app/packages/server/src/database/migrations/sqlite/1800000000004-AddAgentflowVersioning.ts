import { randomUUID } from 'crypto'
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
            CREATE TABLE IF NOT EXISTS "agentflow_version" (
                "id" varchar PRIMARY KEY NOT NULL,
                "agentflowId" varchar NOT NULL,
                "version" integer NOT NULL,
                "flowData" text NOT NULL,
                "chatbotConfig" text,
                "apiConfig" text,
                "analytic" text,
                "speechToText" text,
                "textToSpeech" text,
                "followUpPrompts" text,
                "notes" text,
                "publishedBy" varchar,
                "createdDate" datetime NOT NULL DEFAULT (datetime('now'))
            );
        `)

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_agentflow_version_agentflowId" ON "agentflow_version" ("agentflowId");`)
        await queryRunner.query(
            `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_agentflow_version_agentflowId_version" ON "agentflow_version" ("agentflowId", "version");`
        )

        await queryRunner.query(`ALTER TABLE "agent_flow" ADD COLUMN "publishedFlowData" text;`)
        await queryRunner.query(`ALTER TABLE "agent_flow" ADD COLUMN "publishedVersionId" varchar;`)
        await queryRunner.query(`ALTER TABLE "agent_flow" ADD COLUMN "currentVersion" integer;`)

        const existing: Array<{
            id: string
            flowData: string
            chatbotConfig: string | null
            apiConfig: string | null
            analytic: string | null
            speechToText: string | null
            textToSpeech: string | null
            followUpPrompts: string | null
        }> = await queryRunner.query(
            `SELECT id, "flowData", "chatbotConfig", "apiConfig", "analytic", "speechToText", "textToSpeech", "followUpPrompts" FROM "agent_flow";`
        )

        for (const row of existing) {
            const versionId = randomUUID()
            await queryRunner.query(
                `INSERT INTO "agentflow_version"
                    ("id", "agentflowId", "version", "flowData", "chatbotConfig", "apiConfig", "analytic", "speechToText", "textToSpeech", "followUpPrompts", "notes", "publishedBy")
                 VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
                [
                    versionId,
                    row.id,
                    row.flowData,
                    row.chatbotConfig,
                    row.apiConfig,
                    row.analytic,
                    row.speechToText,
                    row.textToSpeech,
                    row.followUpPrompts,
                    'Initial version (auto-migrated)',
                    null
                ]
            )
            await queryRunner.query(
                `UPDATE "agent_flow" SET "publishedFlowData" = ?, "publishedVersionId" = ?, "currentVersion" = 1 WHERE "id" = ?;`,
                [row.flowData, versionId, row.id]
            )
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "agent_flow" DROP COLUMN "currentVersion";`)
        await queryRunner.query(`ALTER TABLE "agent_flow" DROP COLUMN "publishedVersionId";`)
        await queryRunner.query(`ALTER TABLE "agent_flow" DROP COLUMN "publishedFlowData";`)

        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_agentflow_version_agentflowId_version";`)
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_agentflow_version_agentflowId";`)
        await queryRunner.query(`DROP TABLE IF EXISTS "agentflow_version";`)
    }
}
