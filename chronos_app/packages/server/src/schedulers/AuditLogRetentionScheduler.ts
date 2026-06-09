import { DataSource } from 'typeorm'
import { runLogRetentionSweepSafe } from '../services/audit/log-retention'
import { createModuleLogger } from '../utils/logger'

const logger = createModuleLogger('AuditLogRetentionScheduler')

const DEFAULT_SWEEP_INTERVAL_MS = 86_400_000 // 24h

interface AuditLogRetentionSchedulerOptions {
    appDataSource: DataSource
    retentionDays: number
}

/**
 * Periodically hard-deletes `tool_invocation_audit` + `credential_access_audit`
 * rows older than `AUDIT_LOG_RETENTION_DAYS`. Whole rows are removed —
 * metadata is not preserved.
 *
 * Distinct from `AuditPayloadRetentionScheduler`, which NULLs payload columns
 * but keeps the row. Both schedulers can run concurrently; if both retention
 * windows are configured the log-retention delete wins for rows past its
 * cutoff (there is no point NULLing a payload on a row that is about to be
 * deleted). Operators typically set `AUDIT_LOG_RETENTION_DAYS` ≥
 * `AUDIT_PAYLOAD_RETENTION_DAYS` for the "metadata kept longer than payloads,
 * then everything dropped" tiered-storage shape.
 *
 * Lifecycle:
 * - First sweep fires one interval after `start()` (not immediately) so
 *   container boot is never blocked by a large DELETE. With the 24h default
 *   there is no operational reason to sweep on startup.
 * - Non-overlapping poll guard: if a sweep is still running when the next
 *   tick fires, the new tick is skipped.
 * - Sweep failures are caught inside `runLogRetentionSweepSafe` and
 *   logged — the scheduler keeps ticking.
 *
 * Gating: this scheduler is only constructed when `AUDIT_LOG_RETENTION_DAYS`
 * is set to a positive integer at boot (see `packages/server/src/index.ts`).
 * When the env is unset no audit data is ever deleted — the v1.7 "forever"
 * default is preserved for upgrades.
 *
 * Multi-instance caveat: each Chronos instance polls independently. DELETE
 * is idempotent across instances (the second pass finds zero rows past
 * cutoff) but duplicate work is performed. Acceptable for the v1.9
 * single-instance posture; revisit when worker-mode lands.
 */
export class AuditLogRetentionScheduler {
    private appDataSource: DataSource
    private retentionDays: number
    private intervalId: ReturnType<typeof setInterval> | null = null
    private running = false

    constructor(options: AuditLogRetentionSchedulerOptions) {
        this.appDataSource = options.appDataSource
        this.retentionDays = options.retentionDays
    }

    public start(): void {
        if (this.intervalId) return

        const sweepIntervalMs = readEnvInt('AUDIT_LOG_RETENTION_SWEEP_INTERVAL_MS', DEFAULT_SWEEP_INTERVAL_MS)

        logger.info(
            `Started — retentionDays=${this.retentionDays}, sweepIntervalMs=${sweepIntervalMs} (${formatInterval(
                sweepIntervalMs
            )}). First sweep in ${formatInterval(sweepIntervalMs)}.`
        )

        this.intervalId = setInterval(() => {
            this.poll()
        }, sweepIntervalMs)
    }

    public stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId)
            this.intervalId = null
            logger.info('Stopped')
        }
    }

    /** Test seam — exposes the running flag for non-overlapping-poll assertions. */
    public isRunning(): boolean {
        return this.running
    }

    private async poll(): Promise<void> {
        if (this.running) return
        this.running = true

        try {
            await runLogRetentionSweepSafe({ appDataSource: this.appDataSource, retentionDays: this.retentionDays })
        } finally {
            this.running = false
        }
    }
}

const readEnvInt = (name: string, fallback: number): number => {
    const raw = process.env[name]
    if (!raw) return fallback
    const parsed = parseInt(raw, 10)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const formatInterval = (ms: number): string => {
    if (ms >= 3_600_000 && ms % 3_600_000 === 0) return `${ms / 3_600_000}h`
    if (ms >= 60_000 && ms % 60_000 === 0) return `${ms / 60_000}m`
    return `${ms}ms`
}
