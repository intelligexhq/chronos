import { DataSource } from 'typeorm'
import { runPayloadRetentionSweepSafe } from '../services/audit/payload-retention'
import { createModuleLogger } from '../utils/logger'

const logger = createModuleLogger('AuditPayloadRetentionScheduler')

const DEFAULT_RETENTION_DAYS = 90
const DEFAULT_SWEEP_INTERVAL_MS = 86_400_000 // 24h

interface AuditPayloadRetentionSchedulerOptions {
    appDataSource: DataSource
}

/**
 * Periodically NULLs `requestPayload` / `responsePayload` columns on
 * `tool_invocation_audit` rows older than `AUDIT_PAYLOAD_RETENTION_DAYS`.
 * Metadata (agent, tool, outcome, errorMessage, timestamps) is preserved
 * forever — only the heavy payload blobs age out.
 *
 * Lifecycle:
 * - First sweep fires one interval after `start()` (not immediately) so
 *   container boot is never blocked by a large UPDATE. With the 24h default
 *   there is no operational reason to sweep on startup.
 * - Non-overlapping poll guard: if a sweep is still running when the next
 *   tick fires, the new tick is skipped.
 * - Sweep failures are caught inside `runPayloadRetentionSweepSafe` and
 *   logged — the scheduler keeps ticking.
 *
 * Gating: this scheduler is only constructed when `ENABLE_AUDIT_PAYLOAD_RETENTION=true`
 * is set at boot (see `packages/server/src/index.ts`). When the flag is off
 * no payload data is ever deleted.
 *
 * Multi-instance caveat: each Chronos instance polls independently. The
 * UPDATE is idempotent (subsequent passes find zero rows past cutoff with
 * non-null payloads) but duplicate work is performed. Acceptable for the
 * v1.8.x single-instance posture; revisit when worker-mode lands.
 */
export class AuditPayloadRetentionScheduler {
    private appDataSource: DataSource
    private intervalId: ReturnType<typeof setInterval> | null = null
    private running = false

    constructor(options: AuditPayloadRetentionSchedulerOptions) {
        this.appDataSource = options.appDataSource
    }

    public start(): void {
        if (this.intervalId) return

        const retentionDays = readEnvInt('AUDIT_PAYLOAD_RETENTION_DAYS', DEFAULT_RETENTION_DAYS)
        const sweepIntervalMs = readEnvInt('AUDIT_PAYLOAD_RETENTION_SWEEP_INTERVAL_MS', DEFAULT_SWEEP_INTERVAL_MS)

        logger.info(
            `Started — retentionDays=${retentionDays}, sweepIntervalMs=${sweepIntervalMs} (${formatInterval(
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
            const retentionDays = readEnvInt('AUDIT_PAYLOAD_RETENTION_DAYS', DEFAULT_RETENTION_DAYS)
            await runPayloadRetentionSweepSafe({ appDataSource: this.appDataSource, retentionDays })
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
