import PropTypes from 'prop-types'
import { useEffect, useMemo } from 'react'
import ReactFlow, { Background, Controls, MarkerType, useEdgesState, useNodesState } from 'reactflow'
import 'reactflow/dist/style.css'
import { useTheme } from '@mui/material/styles'

import TopologyNode from './TopologyNode'
import TopologyEdge from './TopologyEdge'
import { layoutTopology } from './dagreLayout'
import { edgeColorForStats, edgeStrokeWidth } from './topologyVisuals'

// Must be module-level and stable, or React Flow re-registers every render.
const nodeTypes = { topology: TopologyNode }
const edgeTypes = { topology: TopologyEdge }

/**
 * The Reactflow surface for the topology map. Read-only: nodes aren't draggable
 * or connectable; the only interaction is clicking an edge to inspect it.
 *
 * Layout is recomputed only when the *topology* changes (the set of node/edge
 * ids), not on every stats tick — so the graph doesn't jiggle as live counts
 * update. Edge colour/width/label re-derive from the selected window each tick.
 */
const TopologyFlow = ({ nodes: domainNodes, edges: domainEdges, windowKey, onEdgeSelect }) => {
    const theme = useTheme()
    const [nodes, setNodes, onNodesChange] = useNodesState([])
    const [edges, setEdges, onEdgesChange] = useEdgesState([])

    // Stable signature of the topology shape — changes only when nodes/edges are
    // added or removed, which is when a relayout is actually warranted.
    const layoutKey = useMemo(
        () =>
            domainNodes
                .map((n) => n.id)
                .sort()
                .join('|') +
            '##' +
            domainEdges
                .map((e) => e.id)
                .sort()
                .join('|'),
        [domainNodes, domainEdges]
    )

    const positionedNodes = useMemo(() => {
        const rfNodes = domainNodes.map((n) => ({
            id: n.id,
            type: 'topology',
            data: { label: n.label, kind: n.type },
            position: { x: 0, y: 0 }
        }))
        return layoutTopology(rfNodes, domainEdges)
        // Intentionally keyed on layoutKey so positions stay put across stat-only updates.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [layoutKey])

    useEffect(() => {
        setNodes(positionedNodes)
    }, [positionedNodes, setNodes])

    useEffect(() => {
        const rfEdges = domainEdges.map((edge) => {
            const stats = (edge.stats && edge.stats[windowKey]) || { count: 0, successCount: 0, errorCount: 0 }
            const color = edgeColorForStats(stats, theme)
            const active = stats.count > 0
            return {
                id: edge.id,
                source: edge.source,
                target: edge.target,
                type: 'topology',
                animated: active,
                markerEnd: { type: MarkerType.ArrowClosed, color },
                data: {
                    domain: edge,
                    kind: edge.kind,
                    color,
                    width: edgeStrokeWidth(stats.count),
                    count: stats.count,
                    active,
                    onSelect: () => onEdgeSelect(edge)
                }
            }
        })
        setEdges(rfEdges)
    }, [domainEdges, windowKey, theme, setEdges, onEdgeSelect])

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.2}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            onEdgeClick={(_, edge) => onEdgeSelect(edge.data.domain)}
            proOptions={{ hideAttribution: true }}
        >
            <Background color={theme.palette.grey[500]} gap={16} />
            <Controls showInteractive={false} />
        </ReactFlow>
    )
}

TopologyFlow.propTypes = {
    nodes: PropTypes.array,
    edges: PropTypes.array,
    windowKey: PropTypes.string,
    onEdgeSelect: PropTypes.func
}

export default TopologyFlow
