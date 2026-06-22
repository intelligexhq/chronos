import dagre from 'dagre'

export const NODE_WIDTH = 200
export const NODE_HEIGHT = 56

/**
 * Deterministic left-to-right layered layout for the topology graph.
 *
 * The graph is a 3-rank DAG (agent → MCP server → tool), so dagre with
 * `rankdir: 'LR'` naturally lays it out in three columns. The layout is a pure
 * function of the node/edge ids, so it stays stable across live re-renders
 * unless the topology itself changes.
 */
export const layoutTopology = (nodes, edges) => {
    const g = new dagre.graphlib.Graph()
    g.setDefaultEdgeLabel(() => ({}))
    g.setGraph({ rankdir: 'LR', nodesep: 28, ranksep: 140, marginx: 24, marginy: 24 })

    nodes.forEach((node) => g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT }))
    edges.forEach((edge) => g.setEdge(edge.source, edge.target))

    dagre.layout(g)

    return nodes.map((node) => {
        const positioned = g.node(node.id)
        return {
            ...node,
            // dagre returns the node centre; React Flow positions by top-left.
            position: { x: positioned.x - NODE_WIDTH / 2, y: positioned.y - NODE_HEIGHT / 2 }
        }
    })
}
