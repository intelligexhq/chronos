import { DataSource } from 'typeorm'
import { Response } from 'express'
import { createModuleLogger } from '../../utils/logger'
import { getErrorMessage } from '../../errors/utils'
import { computeSnapshot } from './aggregator'
import { TopologyBroadcaster } from './broadcaster'
import { TopologySnapshot } from './types'

const logger = createModuleLogger('topologyService')

const DEFAULT_POLL_INTERVAL_MS = 2000
/** Floor so a misconfigured tiny interval can't hammer the DB. */
const MIN_POLL_INTERVAL_MS = 250

interface TopologyServiceOptions {
    appDataSource: DataSource
}

/**
 * Control-plane service backing the live topology map.
 *
 * On an interval it recomputes the global snapshot from the audit table and
 * fans it out to every connected SSE client. One DB poll feeds N browsers —
 * clients never poll the API directly. The gateway hot path is untouched
 * (no event emission); this trades sub-poll-interval latency for full decoupling
 * and worker-mode safety. True event-driven push is a deferred future option.
 *
 * Gated at construction on the topology flag (see `packages/server/src/index.ts`),
 * which defaults on when `ENABLE_MCP_SERVERS=true`.
 */
export class TopologyService {
    private appDataSource: DataSource
    private broadcaster = new TopologyBroadcaster()
    private intervalId: ReturnType<typeof setInterval> | null = null
    private running = false
    /** Last broadcast snapshot (serialized) — primes new subscribers and skips no-op broadcasts. */
    private lastSerialized: string | null = null

    constructor(options: TopologyServiceOptions) {
        this.appDataSource = options.appDataSource
    }

    public start(): void {
        if (this.intervalId) return
        const pollIntervalMs = readPollIntervalMs()
        logger.info(`Started — pollIntervalMs=${pollIntervalMs}`)
        this.intervalId = setInterval(() => {
            this.tick()
        }, pollIntervalMs)
        // Prime immediately so the snapshot endpoint + first subscriber aren't empty for a poll cycle.
        this.tick()
    }

    public stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId)
            this.intervalId = null
        }
        this.broadcaster.closeAll()
        logger.info('Stopped')
    }

    /**
     * Subscribe an SSE client. Primes it with the last broadcast snapshot so a
     * freshly-opened tab renders without waiting for the next tick.
     */
    public subscribe(res: Response): void {
        this.broadcaster.addClient(res, this.lastSerialized ?? undefined)
    }

    /** On-demand snapshot for the REST endpoint (optionally scoped to one agent). */
    public async getSnapshot(filters: { agentId?: string } = {}): Promise<TopologySnapshot> {
        return computeSnapshot(this.appDataSource, filters)
    }

    /** Non-overlapping poll: recompute the global snapshot, broadcast on change, else heartbeat. */
    private async tick(): Promise<void> {
        if (this.running) return
        this.running = true
        try {
            const snapshot = await computeSnapshot(this.appDataSource)
            const serialized = JSON.stringify(snapshot)
            if (serialized !== this.lastSerialized) {
                this.lastSerialized = serialized
                this.broadcaster.broadcast(serialized)
            } else {
                this.broadcaster.heartbeat()
            }
        } catch (error) {
            logger.warn(`topology poll failed: ${getErrorMessage(error)}`)
        } finally {
            this.running = false
        }
    }
}

const readPollIntervalMs = (): number => {
    const raw = process.env.MCP_TOPOLOGY_POLL_INTERVAL_MS
    if (!raw) return DEFAULT_POLL_INTERVAL_MS
    const parsed = parseInt(raw, 10)
    if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_POLL_INTERVAL_MS
    return Math.max(parsed, MIN_POLL_INTERVAL_MS)
}
