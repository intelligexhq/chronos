import client from './client'

// Live MCP topology map. The snapshot is the initial-render / reconnect
// source-of-truth; the live stream (see hooks/useTopologyStream) pushes the
// same shape on every aggregator tick. Optionally scoped to one agent.
const getTopologySnapshot = (params) => client.get(`/topology/snapshot`, { params })

export default {
    getTopologySnapshot
}
