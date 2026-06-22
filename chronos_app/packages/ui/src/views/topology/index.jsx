import { useEffect, useMemo, useState } from 'react'
import { ReactFlowProvider } from 'reactflow'
import { useTheme } from '@mui/material/styles'
import { Box, Button, Chip, Grid, Skeleton, Stack, Tooltip, Typography } from '@mui/material'
import { IconInfoCircle, IconBroadcast } from '@tabler/icons-react'

import MainCard from '@/ui-component/cards/MainCard'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import ErrorBoundary from '@/ErrorBoundary'
import FilterSelect from '@/ui-component/filter/FilterSelect'
import MultiSelectFilter from '@/ui-component/filter/MultiSelectFilter'

import TopologyFlow from './TopologyFlow'
import EdgeDetailsDrawer from './EdgeDetailsDrawer'

import topologyApi from '@/api/topology'
import useApi from '@/hooks/useApi'
import { useTopologyStream } from '@/hooks/useTopologyStream'
import { useError } from '@/store/context/ErrorContext'
import topology_empty from '@/assets/images/executions_empty.svg'

const WINDOW_OPTIONS = [
    { key: '1m', label: 'Last 1m' },
    { key: '5m', label: 'Last 5m' },
    { key: '1h', label: 'Last 1h' }
]

/**
 * Live MCP topology / request-flow map. Renders the real wiring between agents,
 * the gateway's MCP servers, and their tools, with per-call volume and
 * success/error overlays sourced from the tool-invocation audit substrate.
 *
 * Data arrives over an SSE stream (full snapshots per tick); a one-shot REST
 * snapshot primes the first paint so the page is never blank while the stream
 * connects. Filtering (by agent, by MCP server) and the active time window are
 * pure client-side transforms over the latest snapshot.
 */
const Topology = () => {
    const theme = useTheme()
    const { error } = useError()

    const snapshotApi = useApi(topologyApi.getTopologySnapshot)
    const { snapshot: streamSnapshot, status } = useTopologyStream({ enabled: true })

    const [windowKey, setWindowKey] = useState('5m')
    const [selectedAgents, setSelectedAgents] = useState([])
    const [selectedServers, setSelectedServers] = useState([])
    const [selectedEdge, setSelectedEdge] = useState(null)
    const [drawerOpen, setDrawerOpen] = useState(false)

    useEffect(() => {
        snapshotApi.request()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Live stream is authoritative; the REST snapshot only covers the gap before
    // the first frame arrives.
    const snapshot = streamSnapshot || snapshotApi.data || null

    const agentOptions = useMemo(
        () => (snapshot?.nodes || []).filter((n) => n.type === 'agent').map((n) => ({ value: n.id, label: n.label })),
        [snapshot]
    )
    const serverOptions = useMemo(
        () => (snapshot?.nodes || []).filter((n) => n.type === 'mcpServer').map((n) => ({ value: n.id, label: n.label })),
        [snapshot]
    )

    const nodeLabels = useMemo(() => {
        const map = {}
        for (const n of snapshot?.nodes || []) map[n.id] = n.label
        return map
    }, [snapshot])

    // Resolve the filtered subgraph: pick visible agents, the servers reachable
    // from them (intersected with the server filter), then the tools under those
    // servers. An edge shows only when both endpoints survive.
    const { nodes, edges } = useMemo(() => {
        if (!snapshot) return { nodes: [], edges: [] }

        const allEdges = snapshot.edges || []
        const agentFilter = new Set(selectedAgents)
        const serverFilter = new Set(selectedServers)

        const visibleAgents = new Set(
            (snapshot.nodes || []).filter((n) => n.type === 'agent' && (agentFilter.size === 0 || agentFilter.has(n.id))).map((n) => n.id)
        )

        const visibleServers = new Set()
        for (const edge of allEdges) {
            if (edge.kind !== 'agent-server') continue
            if (visibleAgents.has(edge.source) && (serverFilter.size === 0 || serverFilter.has(edge.target))) {
                visibleServers.add(edge.target)
            }
        }

        const visibleTools = new Set()
        for (const edge of allEdges) {
            if (edge.kind !== 'server-tool') continue
            if (visibleServers.has(edge.source)) visibleTools.add(edge.target)
        }

        const visible = new Set([...visibleAgents, ...visibleServers, ...visibleTools])
        const filteredEdges = allEdges.filter((e) => visible.has(e.source) && visible.has(e.target))
        const filteredNodes = (snapshot.nodes || []).filter((n) => visible.has(n.id))
        return { nodes: filteredNodes, edges: filteredEdges }
    }, [snapshot, selectedAgents, selectedServers])

    const configuredButUnused = snapshot?.deltas?.configuredButUnused || []

    const onEdgeSelect = (edge) => {
        setSelectedEdge(edge)
        setDrawerOpen(true)
    }

    const resetFilters = () => {
        setSelectedAgents([])
        setSelectedServers([])
        setWindowKey('5m')
    }

    const loading = !snapshot
    const isEmpty = snapshot && nodes.length === 0

    return (
        <MainCard>
            {error ? (
                <ErrorBoundary error={error} />
            ) : (
                <Stack flexDirection='column' sx={{ gap: 3 }}>
                    <ViewHeader title='Topology' description='Live map of agents, MCP servers, and tools with per-call volume and outcomes'>
                        <Stack direction='row' spacing={1} alignItems='center'>
                            {configuredButUnused.length > 0 && (
                                <Tooltip
                                    title={
                                        <Box sx={{ maxWidth: 320 }}>
                                            <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 0.5 }}>
                                                Allowed but not called in the last hour
                                            </Typography>
                                            {configuredButUnused.slice(0, 12).map((d, i) => (
                                                <Typography key={`${d.agentId}-${d.namespacedTool}-${i}`} sx={{ fontSize: 12 }}>
                                                    {d.agentSlug} · {d.namespacedTool}
                                                </Typography>
                                            ))}
                                            {configuredButUnused.length > 12 && (
                                                <Typography sx={{ fontSize: 12, mt: 0.5 }}>
                                                    +{configuredButUnused.length - 12} more
                                                </Typography>
                                            )}
                                        </Box>
                                    }
                                >
                                    <Chip
                                        icon={<IconInfoCircle size={15} />}
                                        size='small'
                                        color='secondary'
                                        variant='filled'
                                        label={`${configuredButUnused.length} configured but unused`}
                                        sx={{ '& .MuiChip-icon': { mr: 0.2, ml: 1 } }}
                                    />
                                </Tooltip>
                            )}
                            <Tooltip title={status === 'open' ? 'Streaming live updates' : 'Reconnecting to the live stream'}>
                                <Chip
                                    icon={<IconBroadcast size={15} />}
                                    size='small'
                                    label={status === 'open' ? 'Live' : 'Reconnecting'}
                                    color={status === 'open' ? 'success' : 'default'}
                                    variant='filled'
                                    sx={{ '& .MuiChip-icon': { mr: 0.2, ml: 1 } }}
                                />
                            </Tooltip>
                        </Stack>
                    </ViewHeader>

                    {/* Filter Section — mirrors the Executions / Audit Log filter bar:
                        outlined, small Selects laid out in a Grid with a Reset action. */}
                    <Box sx={{ mb: 2, width: '100%' }}>
                        <Grid container spacing={2} alignItems='center'>
                            <Grid item xs={12} md={3}>
                                <MultiSelectFilter
                                    label='Agents'
                                    labelId='topology-agents-label'
                                    options={agentOptions}
                                    value={selectedAgents}
                                    onChange={setSelectedAgents}
                                />
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <MultiSelectFilter
                                    label='MCP servers'
                                    labelId='topology-servers-label'
                                    options={serverOptions}
                                    value={selectedServers}
                                    onChange={setSelectedServers}
                                />
                            </Grid>
                            <Grid item xs={12} md={2}>
                                <FilterSelect
                                    label='Window'
                                    labelId='topology-window-label'
                                    value={windowKey}
                                    onChange={setWindowKey}
                                    options={WINDOW_OPTIONS.map((w) => ({ value: w.key, label: w.label }))}
                                />
                            </Grid>
                            <Grid item xs={12} md={2}>
                                <Button variant='outlined' size='small' onClick={resetFilters}>
                                    Reset
                                </Button>
                            </Grid>
                        </Grid>
                    </Box>

                    {loading && <Skeleton variant='rounded' height={'calc(100vh - 320px)'} sx={{ minHeight: 420 }} />}

                    {!loading && isEmpty && (
                        <Stack sx={{ alignItems: 'center', justifyContent: 'center', py: 6 }} flexDirection='column'>
                            <Box sx={{ p: 2 }}>
                                <img
                                    style={{ objectFit: 'cover', height: '20vh', width: 'auto' }}
                                    src={topology_empty}
                                    alt='topology_empty'
                                />
                            </Box>
                            <Typography sx={{ fontWeight: 500 }}>No recent MCP traffic</Typography>
                            <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5, textAlign: 'center', maxWidth: 460 }}>
                                Once your agents start calling MCP tools through the gateway, the live map of agents, servers, and tools
                                will appear here.
                            </Typography>
                        </Stack>
                    )}

                    {!loading && !isEmpty && (
                        <Box
                            sx={{
                                height: 'calc(100vh - 320px)',
                                minHeight: 420,
                                border: `1px solid ${theme.palette.grey[900] + 25}`,
                                borderRadius: 2,
                                overflow: 'hidden'
                            }}
                        >
                            <ReactFlowProvider>
                                <TopologyFlow nodes={nodes} edges={edges} windowKey={windowKey} onEdgeSelect={onEdgeSelect} />
                            </ReactFlowProvider>
                        </Box>
                    )}
                </Stack>
            )}

            <EdgeDetailsDrawer
                open={drawerOpen}
                edge={selectedEdge}
                windows={snapshot?.windows}
                nodeLabels={nodeLabels}
                onClose={() => setDrawerOpen(false)}
            />
        </MainCard>
    )
}

export default Topology
