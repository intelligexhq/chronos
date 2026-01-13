import { MigrationInterface, QueryRunner } from 'typeorm'

export class RemoveWorkspaceForeignKey1768000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if the table has a foreign key to workspace by checking if saving fails
        // SQLite doesn't support dropping foreign keys, so we need to recreate the table

        // Create new table without foreign key
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "chat_flow_new" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar NOT NULL,
                "flowData" text NOT NULL,
                "deployed" boolean,
                "isPublic" boolean,
                "apikeyid" varchar,
                "chatbotConfig" text,
                "createdDate" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedDate" datetime NOT NULL DEFAULT (datetime('now')),
                "apiConfig" TEXT,
                "analytic" TEXT,
                "category" TEXT,
                "speechToText" TEXT,
                "textToSpeech" TEXT,
                "type" VARCHAR(20) NOT NULL DEFAULT 'CHATFLOW',
                "workspaceId" TEXT,
                "followUpPrompts" TEXT
            );
        `)

        // Copy data from old table
        await queryRunner.query(`
            INSERT INTO "chat_flow_new"
            SELECT "id", "name", "flowData", "deployed", "isPublic", "apikeyid", "chatbotConfig",
                   "createdDate", "updatedDate", "apiConfig", "analytic", "category", "speechToText",
                   "textToSpeech", "type", "workspaceId", "followUpPrompts"
            FROM "chat_flow";
        `)

        // Drop old table
        await queryRunner.query(`DROP TABLE "chat_flow";`)

        // Rename new table
        await queryRunner.query(`ALTER TABLE "chat_flow_new" RENAME TO "chat_flow";`)

        // Recreate index
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_chat_flow_name" ON "chat_flow" ("name");`)
    }

    public async down(): Promise<void> {
        // No rollback needed
    }
}
