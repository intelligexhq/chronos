import { DataSource } from 'typeorm'
import { ToolInvocationAudit } from '../../database/entities/ToolInvocationAudit'
import { CredentialAccessAudit } from '../../database/entities/CredentialAccessAudit'
import { getErrorMessage } from '../../errors/utils'
import { createModuleLogger } from '../../utils/logger'

const logger = createModuleLogger('AuditLogRetention')

const MS_PER_DAY = 86_400_000

export interface LogRetentionSweepInput {
    appDataSource: DataSource
    retentionDays: number
}

export interface LogRetentionSweepResult {
    cutoff: Date
    toolInvocationRowsDeleted: number
    credentialAccessRowsDeleted: number
}

/**
 * Single-pass sweep that hard-deletes audit rows older than `retentionDays`
 * from both `tool_invocation_audit` and `credential_access_audit`. Unlike
 * the v1.8.2 payload-retention sweeper — which only NULLs payload columns
 * and preserves metadata — this sweep removes the row entirely.
 *
 * Distinction:
 * - `AUDIT_PAYLOAD_RETENTION_DAYS` (v1.8.2): payload NULL, row preserved.
 * - `AUDIT_LOG_RETENTION_DAYS`     (v1.9):   row deleted.
 *
 * If both retention windows are enabled the row-delete wins for rows past
 * the log cutoff — there is no point NULLing a payload on a row that is
 * about to be deleted. Operators set `AUDIT_LOG_RETENTION_DAYS` ≥
 * `AUDIT_PAYLOAD_RETENTION_DAYS` for the storage-tier "metadata kept
 * longer than payloads, then everything dropped" shape.
 *
 * Multi-instance: idempotent. Concurrent passes either delete the same
 * rows once (first pass wins) or find zero rows past cutoff (subsequent
 * passes). Duplicate DELETE work is accepted as a known limitation of
 * the single-instance v1.9 shape — to be revisited when worker-mode lands.
 */
export const runLogRetentionSweep = async (input: LogRetentionSweepInput): Promise<LogRetentionSweepResult> => {
    const { appDataSource, retentionDays } = input
    const safeRetentionDays = Number.isFinite(retentionDays) && retentionDays >= 1 ? Math.floor(retentionDays) : 1
    const cutoff = new Date(Date.now() - safeRetentionDays * MS_PER_DAY)

    const toolInvocationResult = await appDataSource
        .getRepository(ToolInvocationAudit)
        .createQueryBuilder()
        .delete()
        .from(ToolInvocationAudit)
        .where('createdDate < :cutoff', { cutoff })
        .execute()

    const credentialAccessResult = await appDataSource
        .getRepository(CredentialAccessAudit)
        .createQueryBuilder()
        .delete()
        .from(CredentialAccessAudit)
        .where('createdDate < :cutoff', { cutoff })
        .execute()

    const toolInvocationRowsDeleted = toolInvocationResult.affected ?? 0
    const credentialAccessRowsDeleted = credentialAccessResult.affected ?? 0
    const total = toolInvocationRowsDeleted + credentialAccessRowsDeleted

    if (total > 0) {
        logger.info(
            `Sweep complete — deleted ${toolInvocationRowsDeleted} tool_invocation_audit + ${credentialAccessRowsDeleted} credential_access_audit rows older than ${safeRetentionDays} days`
        )
    } else {
        logger.info(`Sweep complete — no audit rows older than ${safeRetentionDays} days`)
    }

    return { cutoff, toolInvocationRowsDeleted, credentialAccessRowsDeleted }
}

/**
 * Swallow-and-log wrapper for the scheduler. Returns the result on success or
 * `null` on failure — the scheduler keeps ticking either way.
 */
export const runLogRetentionSweepSafe = async (input: LogRetentionSweepInput): Promise<LogRetentionSweepResult | null> => {
    try {
        return await runLogRetentionSweep(input)
    } catch (error) {
        logger.error(`Sweep failed: ${getErrorMessage(error)}`)
        return null
    }
}
