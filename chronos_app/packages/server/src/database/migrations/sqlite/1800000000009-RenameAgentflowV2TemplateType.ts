import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * v1.6.0 follow-up — collapse vestigial "Agentflow v2" naming.
 *
 * The "v2" suffix was introduced to disambiguate a new visual editor from a
 * previous agentflow implementation that has since been removed. Only one
 * canvas / one runtime / one flow type now exists; the suffix is dead noise.
 *
 * User-saved custom templates store `type='AgentflowV2'`. Rewrite to
 * `type='Agentflow'` so the templates UI (which now filters by 'Agentflow')
 * continues to surface them.
 */
export class RenameAgentflowV2TemplateType1800000000009 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE "custom_template" SET "type" = 'Agentflow' WHERE "type" = 'AgentflowV2';`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE "custom_template" SET "type" = 'AgentflowV2' WHERE "type" = 'Agentflow';`)
    }
}
