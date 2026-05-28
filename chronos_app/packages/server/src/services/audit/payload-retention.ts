import { DataSource } from 'typeorm'
import { ToolInvocationAudit } from '../../database/entities/ToolInvocationAudit'
import { getErrorMessage } from '../../errors/utils'
import { createModuleLogger } from '../../utils/logger'

const logger = createModuleLogger('AuditPayloadRetention')

const MS_PER_DAY = 86_400_000

export interface PayloadRetentionSweepInput {
    appDataSource: DataSource
    retentionDays: number
}

export interface PayloadRetentionSweepResult {
    cutoff: Date
    rowsAffected: number
}

/**
 * Single-pass sweep that NULLs `requestPayload` + `responsePayload` on
 * `tool_invocation_audit` rows older than `retentionDays`. Row metadata
 * (agent, tool, outcome, errorMessage, timestamps) is preserved — only
 * the heavy payload blobs age out.
 *
 * Non-goals:
 * - Does not delete rows.
 * - Does not touch `errorMessage` or any other column.
 * - Does not enforce per-server / per-agent retention policies.
 *
 * Multi-instance: idempotent. If two instances sweep concurrently the second
 * pass simply finds zero rows past cutoff with non-null payloads. Duplicate
 * UPDATE work is accepted as a known limitation of the single-instance v1.8.x
 * shape — to be revisited when worker-mode lands.
 */
export const runPayloadRetentionSweep = async (input: PayloadRetentionSweepInput): Promise<PayloadRetentionSweepResult> => {
    const { appDataSource, retentionDays } = input
    const safeRetentionDays = Number.isFinite(retentionDays) && retentionDays >= 1 ? Math.floor(retentionDays) : 1
    const cutoff = new Date(Date.now() - safeRetentionDays * MS_PER_DAY)

    const repo = appDataSource.getRepository(ToolInvocationAudit)
    // TypeORM's QueryDeepPartialEntity typing for `any`-typed columns rejects a
    // raw `null` literal. Function values are evaluated as SQL fragments — `NULL`
    // produces the literal we want and round-trips correctly through the entity's
    // jsonTransformer on subsequent reads.
    const result = await repo
        .createQueryBuilder()
        .update(ToolInvocationAudit)
        .set({ requestPayload: () => 'NULL', responsePayload: () => 'NULL' })
        .where('createdDate < :cutoff', { cutoff })
        .andWhere('(requestPayload IS NOT NULL OR responsePayload IS NOT NULL)')
        .execute()

    const rowsAffected = result.affected ?? 0
    if (rowsAffected > 0) {
        logger.info(`Sweep complete — nulled ${rowsAffected} payload pairs older than ${safeRetentionDays} days`)
    } else {
        logger.info(`Sweep complete — no payloads older than ${safeRetentionDays} days`)
    }

    return { cutoff, rowsAffected }
}

/**
 * Swallow-and-log wrapper for the scheduler. Returns the result on success or
 * `null` on failure — the scheduler keeps ticking either way.
 */
export const runPayloadRetentionSweepSafe = async (input: PayloadRetentionSweepInput): Promise<PayloadRetentionSweepResult | null> => {
    try {
        return await runPayloadRetentionSweep(input)
    } catch (error) {
        logger.error(`Sweep failed: ${getErrorMessage(error)}`)
        return null
    }
}
