import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * v1.6.0 — MCP Server Registry.
 *
 * Adds an `mcp_server` table for registering MCP servers reachable by the
 * platform's MCP gateway. Agents address tools as `<slug>.<tool>`; the gateway
 * resolves the namespace and proxies the call. v1.6.0 supports
 * `streamable-http` and `sse` transports; `stdio` is reserved in the schema
 * but rejected at the service layer until v1.8 ships the connection-pool
 * model it needs. No backfill — there are no pre-existing MCP servers.
 */
export class AddMCPServerRegistry1800000000006 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "mcp_server" (
                "id" varchar PRIMARY KEY NOT NULL,
                "name" varchar NOT NULL,
                "slug" varchar NOT NULL,
                "description" text,
                "transport" varchar(20) NOT NULL,
                "url" varchar,
                "command" text,
                "outboundAuth" text,
                "allowedTools" text,
                "requestHeaders" text,
                "timeoutMs" integer,
                "status" varchar(20) NOT NULL DEFAULT 'UNKNOWN',
                "enabled" boolean NOT NULL DEFAULT 1,
                "lastHealthCheckAt" datetime,
                "lastHealthError" text,
                "userId" varchar,
                "createdDate" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedDate" datetime NOT NULL DEFAULT (datetime('now'))
            );
        `)

        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_mcp_server_slug" ON "mcp_server" ("slug");`)
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_mcp_server_transport" ON "mcp_server" ("transport");`)
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_mcp_server_enabled" ON "mcp_server" ("enabled");`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_mcp_server_enabled";`)
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_mcp_server_transport";`)
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_mcp_server_slug";`)
        await queryRunner.query(`DROP TABLE IF EXISTS "mcp_server";`)
    }
}
