import client from './client'

const publishAgentflow = (id, body = {}) => client.post(`/agentflows/${id}/publish`, body)

const rollbackAgentflow = (id, version) => client.post(`/agentflows/${id}/rollback/${version}`)

const listAgentflowVersions = (id, params) => client.get(`/agentflows/${id}/versions`, { params })

const getAgentflowVersion = (id, version) => client.get(`/agentflows/${id}/versions/${version}`)

export default {
    publishAgentflow,
    rollbackAgentflow,
    listAgentflowVersions,
    getAgentflowVersion
}
