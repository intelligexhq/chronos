import client from './client'

const getAllOAuthClients = () => client.get('/oauth-clients')

const createOAuthClient = (body) => client.post('/oauth-clients', body)

const updateOAuthClient = (id, body) => client.put(`/oauth-clients/${id}`, body)

const deleteOAuthClient = (id) => client.delete(`/oauth-clients/${id}`)

export default {
    getAllOAuthClients,
    createOAuthClient,
    updateOAuthClient,
    deleteOAuthClient
}
