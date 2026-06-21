import { DataSource } from 'typeorm'
import { ToolInvocationAudit } from '../../database/entities/ToolInvocationAudit'
import { Agent } from '../../database/entities/Agent'
import {
    ConfiguredButUnused,
    EdgeWindowStats,
    RecentInvocation,
    TopologyEdge,
    TopologyNode,
    TopologySnapshot,
    TopologyWindowKey,
    TOPOLOGY_MAX_WINDOW_MS,
    TOPOLOGY_WINDOWS
} from './types'

/**
 * Build the topology snapshot from the existing `tool_invocation_audit` substrate.
 *
 * No new schema: one indexed read over the last hour of audit rows, aggregated
 * in-process into agent → server → tool edges with per-window counts and latency
 * percentiles. The configured-vs-actual delta joins those actuals against each
 * enabled agent's `Agent.allowedTools`.
 *
 * Aggregation is in-process (not SQL) so latency percentiles stay portable across
 * sqlite + postgres and all three windows fall out of a single query. Volume is
 * bounded by the 1h window; a rollup table is a future option if this read shows
 * up under load.
 */
export const computeSnapshot = async (appDataSource: DataSource, filters: { agentId?: string } = {}): Promise<TopologySnapshot> => {
    const now = Date.now()
    const since = new Date(now - TOPOLOGY_MAX_WINDOW_MS)

    const auditRepo = appDataSource.getRepository(ToolInvocationAudit)
    const qb = auditRepo
        .createQueryBuilder('audit')
        .select([
            'audit.agentId',
            'audit.agentSlug',
            'audit.mcpServerId',
            'audit.mcpServerSlug',
            'audit.toolName',
            'audit.namespacedTool',
            'audit.success',
            'audit.durationMs',
            'audit.callId',
            'audit.createdDate'
        ])
        .where('audit.createdDate >= :since', { since })
        .orderBy('audit.createdDate', 'DESC')
    if (filters.agentId) qb.andWhere('audit.agentId = :agentId', { agentId: filters.agentId })
    const rows = await qb.getMany()

    const nodes = new Map<string, TopologyNode>()
    const ensureNode = (node: TopologyNode) => {
        if (!nodes.has(node.id)) nodes.set(node.id, node)
    }

    interface EdgeAccumulator {
        id: string
        source: string
        target: string
        kind: TopologyEdge['kind']
        samples: { ageMs: number; durationMs: number; success: boolean }[]
        recent: RecentInvocation[]
    }
    const edges = new Map<string, EdgeAccumulator>()
    const accumulate = (
        id: string,
        source: string,
        target: string,
        kind: TopologyEdge['kind'],
        ageMs: number,
        row: ToolInvocationAudit
    ) => {
        let acc = edges.get(id)
        if (!acc) {
            acc = { id, source, target, kind, samples: [], recent: [] }
            edges.set(id, acc)
        }
        acc.samples.push({ ageMs, durationMs: row.durationMs ?? 0, success: row.success })
        // rows arrive newest-first, so the first 3 we see are the most recent.
        if (acc.recent.length < 3) {
            acc.recent.push({
                callId: row.callId,
                namespacedTool: row.namespacedTool,
                toolName: row.toolName,
                success: row.success,
                durationMs: row.durationMs ?? 0,
                createdDate: new Date(row.createdDate).toISOString()
            })
        }
    }

    // actualToolsByAgent — namespaced tools each agent actually called in the window,
    // for the configured-vs-actual delta.
    const actualToolsByAgent = new Map<string, Set<string>>()

    for (const row of rows) {
        const serverKey = row.mcpServerId ?? row.mcpServerSlug
        const agentNodeId = `agent:${row.agentId}`
        const serverNodeId = `server:${serverKey}`
        const toolNodeId = `tool:${serverKey}:${row.namespacedTool}`

        ensureNode({ id: agentNodeId, type: 'agent', label: row.agentSlug })
        ensureNode({ id: serverNodeId, type: 'mcpServer', label: row.mcpServerSlug, mcpServerId: row.mcpServerId })
        ensureNode({ id: toolNodeId, type: 'tool', label: row.toolName, mcpServerId: row.mcpServerId })

        const ageMs = now - new Date(row.createdDate).getTime()
        accumulate(`as:${row.agentId}->${serverKey}`, agentNodeId, serverNodeId, 'agent-server', ageMs, row)
        accumulate(`st:${serverKey}->${row.namespacedTool}`, serverNodeId, toolNodeId, 'server-tool', ageMs, row)

        let actual = actualToolsByAgent.get(row.agentId)
        if (!actual) {
            actual = new Set<string>()
            actualToolsByAgent.set(row.agentId, actual)
        }
        actual.add(row.namespacedTool)
    }

    const builtEdges: TopologyEdge[] = Array.from(edges.values()).map((acc) => ({
        id: acc.id,
        source: acc.source,
        target: acc.target,
        kind: acc.kind,
        stats: buildWindowStats(acc.samples),
        recent: acc.recent
    }))

    const deltas = { configuredButUnused: await computeConfiguredButUnused(appDataSource, actualToolsByAgent, filters) }

    return {
        generatedAt: new Date(now).toISOString(),
        windows: TOPOLOGY_WINDOWS.map((w) => w.key),
        nodes: Array.from(nodes.values()),
        edges: builtEdges,
        deltas
    }
}

/** Per-window count/success/latency stats for one edge's samples. */
const buildWindowStats = (
    samples: { ageMs: number; durationMs: number; success: boolean }[]
): Record<TopologyWindowKey, EdgeWindowStats> => {
    const stats = {} as Record<TopologyWindowKey, EdgeWindowStats>
    for (const w of TOPOLOGY_WINDOWS) {
        const inWindow = samples.filter((s) => s.ageMs <= w.ms)
        const durations = inWindow.map((s) => s.durationMs).sort((a, b) => a - b)
        stats[w.key] = {
            count: inWindow.length,
            successCount: inWindow.filter((s) => s.success).length,
            errorCount: inWindow.filter((s) => !s.success).length,
            p50Ms: percentile(durations, 50),
            p95Ms: percentile(durations, 95)
        }
    }
    return stats
}

/** Nearest-rank percentile over a pre-sorted ascending array. Returns 0 for an empty set. */
const percentile = (sortedAsc: number[], p: number): number => {
    if (sortedAsc.length === 0) return 0
    const rank = Math.ceil((p / 100) * sortedAsc.length) - 1
    const idx = Math.min(Math.max(rank, 0), sortedAsc.length - 1)
    return sortedAsc[idx]
}

/**
 * Configured-but-unused delta: tools listed in an enabled agent's `allowedTools`
 * that saw zero calls in the window. When `filters.agentId` is set the delta is
 * scoped to that agent so the snapshot stays internally consistent.
 */
const computeConfiguredButUnused = async (
    appDataSource: DataSource,
    actualToolsByAgent: Map<string, Set<string>>,
    filters: { agentId?: string }
): Promise<ConfiguredButUnused[]> => {
    const agentRepo = appDataSource.getRepository(Agent)
    const where = filters.agentId ? { enabled: true, id: filters.agentId } : { enabled: true }
    const agents = await agentRepo.find({ where, select: ['id', 'slug', 'allowedTools'] })

    const out: ConfiguredButUnused[] = []
    for (const agent of agents) {
        const configured = parseAllowedTools(agent.allowedTools)
        if (configured.length === 0) continue
        const actual = actualToolsByAgent.get(agent.id) ?? new Set<string>()
        for (const namespacedTool of configured) {
            if (!actual.has(namespacedTool)) {
                out.push({ agentId: agent.id, agentSlug: agent.slug, namespacedTool })
            }
        }
    }
    return out
}

/** Local copy of the gateway's allowedTools parser (kept private to mcp-gateway). */
const parseAllowedTools = (raw?: string): string[] => {
    if (!raw) return []
    try {
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed.filter((s) => typeof s === 'string') : []
    } catch {
        return []
    }
}
