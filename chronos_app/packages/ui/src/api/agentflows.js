import client from './client'

const getAllAgentflows = (params) => client.get(`/agentflows`, { params })

const getSpecificAgentflow = (id) => client.get(`/agentflows/${id}`)

const createNewAgentflow = (body) => client.post(`/agentflows`, body)

const updateAgentflow = (id, body) => client.put(`/agentflows/${id}`, body)

const deleteAgentflow = (id) => client.delete(`/agentflows/${id}`)

const getIsAgentflowStreaming = (id) => client.get(`/agentflows-streaming/${id}`)

const getAllowAgentflowUploads = (id) => client.get(`/agentflows-uploads/${id}`)

const getHasAgentflowChanged = (id, lastUpdatedDateTime) => client.get(`/agentflows/has-changed/${id}/${lastUpdatedDateTime}`)

const generateAgentflow = (body) => client.post(`/agentflow-generator/generate`, body)

export default {
    getAllAgentflows,
    getSpecificAgentflow,
    createNewAgentflow,
    updateAgentflow,
    deleteAgentflow,
    getIsAgentflowStreaming,
    getAllowAgentflowUploads,
    getHasAgentflowChanged,
    generateAgentflow
}
