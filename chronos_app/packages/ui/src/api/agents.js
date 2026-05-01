import client from './client'

const getAllAgents = (page, limit, filters = {}) =>
    client.get('/agents', {
        params: {
            page,
            limit,
            ...(filters.runtimeType ? { runtimeType: filters.runtimeType } : {}),
            ...(filters.status ? { status: filters.status } : {}),
            ...(filters.agentflowId ? { agentflowId: filters.agentflowId } : {})
        }
    })

const getAgentById = (id) => client.get(`/agents/${id}`)

const createAgent = (body) => client.post('/agents', body)

const updateAgent = (id, body) => client.put(`/agents/${id}`, body)

const deleteAgent = (id) => client.delete(`/agents/${id}`)

const toggleAgent = (id, enabled) => client.patch(`/agents/${id}/toggle`, { enabled })

const regenerateCallbackToken = (id) => client.post(`/agents/${id}/regenerate-callback-token`)

const testAgentConnection = (id) => client.post(`/agents/${id}/test-connection`)

export default {
    getAllAgents,
    getAgentById,
    createAgent,
    updateAgent,
    deleteAgent,
    toggleAgent,
    regenerateCallbackToken,
    testAgentConnection
}
