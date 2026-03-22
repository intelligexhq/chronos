import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddDashboardMetrics1800000000002 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`execution_metrics\` (
                \`id\` varchar(36) NOT NULL,
                \`agentflowId\` varchar(36) NOT NULL,
                \`executionId\` varchar(36) NOT NULL,
                \`state\` varchar(255) NOT NULL,
                \`durationMs\` int NOT NULL DEFAULT 0,
                \`totalTokens\` int NOT NULL DEFAULT 0,
                \`inputTokens\` int NOT NULL DEFAULT 0,
                \`outputTokens\` int NOT NULL DEFAULT 0,
                \`estimatedCostUsd\` decimal(12,6) NOT NULL DEFAULT 0,
                \`hasPricing\` tinyint NOT NULL DEFAULT 1,
                \`nodeCount\` int NOT NULL DEFAULT 0,
                \`llmCallCount\` int NOT NULL DEFAULT 0,
                \`modelBreakdown\` text DEFAULT NULL,
                \`triggerType\` varchar(255) NOT NULL DEFAULT 'manual',
                \`createdDate\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
        `)

        await queryRunner.query(`CREATE INDEX \`IDX_execution_metrics_agentflowId\` ON \`execution_metrics\` (\`agentflowId\`);`)
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_execution_metrics_executionId\` ON \`execution_metrics\` (\`executionId\`);`)
        await queryRunner.query(`CREATE INDEX \`IDX_execution_metrics_createdDate\` ON \`execution_metrics\` (\`createdDate\`);`)

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`daily_metrics\` (
                \`id\` varchar(36) NOT NULL,
                \`agentflowId\` varchar(36) NOT NULL,
                \`date\` varchar(10) NOT NULL,
                \`executionCount\` int NOT NULL DEFAULT 0,
                \`successCount\` int NOT NULL DEFAULT 0,
                \`errorCount\` int NOT NULL DEFAULT 0,
                \`timeoutCount\` int NOT NULL DEFAULT 0,
                \`totalTokens\` bigint NOT NULL DEFAULT 0,
                \`inputTokens\` bigint NOT NULL DEFAULT 0,
                \`outputTokens\` bigint NOT NULL DEFAULT 0,
                \`totalCostUsd\` decimal(12,6) NOT NULL DEFAULT 0,
                \`avgDurationMs\` int NOT NULL DEFAULT 0,
                \`p50DurationMs\` int NOT NULL DEFAULT 0,
                \`p95DurationMs\` int NOT NULL DEFAULT 0,
                \`maxDurationMs\` int NOT NULL DEFAULT 0,
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;
        `)

        await queryRunner.query(`CREATE INDEX \`IDX_daily_metrics_agentflowId\` ON \`daily_metrics\` (\`agentflowId\`);`)
        await queryRunner.query(
            `CREATE UNIQUE INDEX \`IDX_daily_metrics_agentflow_date\` ON \`daily_metrics\` (\`agentflowId\`, \`date\`);`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_daily_metrics_agentflow_date\` ON \`daily_metrics\`;`)
        await queryRunner.query(`DROP INDEX \`IDX_daily_metrics_agentflowId\` ON \`daily_metrics\`;`)
        await queryRunner.query(`DROP TABLE IF EXISTS \`daily_metrics\`;`)
        await queryRunner.query(`DROP INDEX \`IDX_execution_metrics_createdDate\` ON \`execution_metrics\`;`)
        await queryRunner.query(`DROP INDEX \`IDX_execution_metrics_executionId\` ON \`execution_metrics\`;`)
        await queryRunner.query(`DROP INDEX \`IDX_execution_metrics_agentflowId\` ON \`execution_metrics\`;`)
        await queryRunner.query(`DROP TABLE IF EXISTS \`execution_metrics\`;`)
    }
}
