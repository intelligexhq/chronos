import client from './client'

const getAllTemplatesFromTemplates = () => client.get('/templates/templates')

const getAllCustomTemplates = () => client.get('/templates/custom')
const saveAsCustomTemplate = (body) => client.post('/templates/custom', body)
const deleteCustomTemplate = (id) => client.delete(`/templates/custom/${id}`)

export default {
    getAllTemplatesFromTemplates,

    getAllCustomTemplates,
    saveAsCustomTemplate,
    deleteCustomTemplate
}
