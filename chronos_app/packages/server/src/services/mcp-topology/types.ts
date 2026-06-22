/**
 * Shared types for the live MCP topology / request-flow map.
 *
 * The snapshot is MCP-shaped, NOT OTel-shaped: the only nouns are agent,
 * MCP server, tool, request, and latency. No spans, services, traces, or
 * resources leak into this surface.
 */

/** UI-selectable aggregation windows. Fixed list — not env-driven, not arbitrary. */
export type TopologyWindowKey = '1m' | '5m' | '1h'

/** Window definitions, smallest first. `1h` is the cap the aggregator queries over. */
export const TOPOLOGY_WINDOWS: { key: TopologyWindowKey; ms: number }[] = [
    { key: '1m', ms: 60_000 },
    { key: '5m', ms: 300_000 },
    { key: '1h', ms: 3_600_000 }
]

/** Largest window — the lower bound on the single audit query each tick. */
export const TOPOLOGY_MAX_WINDOW_MS = 3_600_000

export type TopologyNodeType = 'agent' | 'mcpServer' | 'tool'

export interface TopologyNode {
    /** Stable id — `agent:<agentId>`, `server:<serverKey>`, or `tool:<serverKey>:<namespacedTool>`. */
    id: string
    type: TopologyNodeType
    /** Human label: agent slug, MCP server slug, or bare tool name. */
    label: string
    /** Present on `tool` and `mcpServer` nodes — the owning server id (may be null for orphaned stdio rows). */
    mcpServerId?: string | null
}

export type TopologyEdgeKind = 'agent-server' | 'server-tool'

/** Per-window aggregate for one edge. Latency percentiles are computed in-process (portable across sqlite/postgres). */
export interface EdgeWindowStats {
    count: number
    successCount: number
    errorCount: number
    p50Ms: number
    p95Ms: number
}

/** A recent invocation surfaced on an edge hover; `callId` deep-links to the audit-row drawer. */
export interface RecentInvocation {
    callId: string | null
    namespacedTool: string
    toolName: string
    success: boolean
    durationMs: number
    createdDate: string
}

export interface TopologyEdge {
    id: string
    source: string
    target: string
    kind: TopologyEdgeKind
    /** Stats for every window, so the UI window toggle is a pure client-side switch (no refetch). */
    stats: Record<TopologyWindowKey, EdgeWindowStats>
    /** Up to 3 most-recent invocations on this edge (newest first). */
    recent: RecentInvocation[]
}

/** A tool an agent is configured to reach (`Agent.allowedTools`) but did not call in the last hour. */
export interface ConfiguredButUnused {
    agentId: string
    agentSlug: string
    namespacedTool: string
}

export interface TopologySnapshot {
    /** ISO timestamp the snapshot was computed. */
    generatedAt: string
    /** Windows carried in every edge's `stats`, smallest first. */
    windows: TopologyWindowKey[]
    nodes: TopologyNode[]
    edges: TopologyEdge[]
    /** Configured-vs-actual delta surface. */
    deltas: {
        configuredButUnused: ConfiguredButUnused[]
    }
}
