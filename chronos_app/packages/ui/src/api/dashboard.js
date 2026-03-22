import client from './client'

const getSummary = (startDate, endDate, agentflowId) => {
    const params = { startDate, endDate }
    if (agentflowId) params.agentflowId = agentflowId
    return client.get('/dashboard/summary', { params })
}

const getTimeseries = (startDate, endDate, granularity = 'daily', agentflowId) => {
    const params = { startDate, endDate, granularity }
    if (agentflowId) params.agentflowId = agentflowId
    return client.get('/dashboard/timeseries', { params })
}

const getAgents = (startDate, endDate, sortBy, sortOrder, page, limit) => {
    return client.get('/dashboard/agents', {
        params: { startDate, endDate, sortBy, sortOrder, page, limit }
    })
}

const getExport = (startDate, endDate, agentflowId, format = 'json') => {
    const params = { startDate, endDate, format }
    if (agentflowId) params.agentflowId = agentflowId
    return client.get('/dashboard/export', { params })
}

export default {
    getSummary,
    getTimeseries,
    getAgents,
    getExport
}
