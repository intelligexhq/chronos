import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddDashboardMetrics1800000000002 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "execution_metrics" (
                "id" varchar PRIMARY KEY NOT NULL,
                "agentflowId" varchar NOT NULL,
                "executionId" varchar NOT NULL,
                "state" varchar NOT NULL,
                "durationMs" integer NOT NULL DEFAULT 0,
                "totalTokens" integer NOT NULL DEFAULT 0,
                "inputTokens" integer NOT NULL DEFAULT 0,
                "outputTokens" integer NOT NULL DEFAULT 0,
                "estimatedCostUsd" decimal(12,6) NOT NULL DEFAULT 0,
                "hasPricing" boolean NOT NULL DEFAULT 1,
                "nodeCount" integer NOT NULL DEFAULT 0,
                "llmCallCount" integer NOT NULL DEFAULT 0,
                "modelBreakdown" text,
                "triggerType" varchar NOT NULL DEFAULT 'manual',
                "createdDate" datetime NOT NULL DEFAULT (datetime('now'))
            );
        `)

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_execution_metrics_agentflowId" ON "execution_metrics" ("agentflowId");`)
        await queryRunner.query(
            `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_execution_metrics_executionId" ON "execution_metrics" ("executionId");`
        )
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_execution_metrics_createdDate" ON "execution_metrics" ("createdDate");`)

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "daily_metrics" (
                "id" varchar PRIMARY KEY NOT NULL,
                "agentflowId" varchar NOT NULL,
                "date" varchar(10) NOT NULL,
                "executionCount" integer NOT NULL DEFAULT 0,
                "successCount" integer NOT NULL DEFAULT 0,
                "errorCount" integer NOT NULL DEFAULT 0,
                "timeoutCount" integer NOT NULL DEFAULT 0,
                "totalTokens" bigint NOT NULL DEFAULT 0,
                "inputTokens" bigint NOT NULL DEFAULT 0,
                "outputTokens" bigint NOT NULL DEFAULT 0,
                "totalCostUsd" decimal(12,6) NOT NULL DEFAULT 0,
                "avgDurationMs" integer NOT NULL DEFAULT 0,
                "p50DurationMs" integer NOT NULL DEFAULT 0,
                "p95DurationMs" integer NOT NULL DEFAULT 0,
                "maxDurationMs" integer NOT NULL DEFAULT 0
            );
        `)

        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_daily_metrics_agentflowId" ON "daily_metrics" ("agentflowId");`)
        await queryRunner.query(
            `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_daily_metrics_agentflow_date" ON "daily_metrics" ("agentflowId", "date");`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_daily_metrics_agentflow_date";`)
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_daily_metrics_agentflowId";`)
        await queryRunner.query(`DROP TABLE IF EXISTS "daily_metrics";`)
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_execution_metrics_createdDate";`)
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_execution_metrics_executionId";`)
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_execution_metrics_agentflowId";`)
        await queryRunner.query(`DROP TABLE IF EXISTS "execution_metrics";`)
    }
}
