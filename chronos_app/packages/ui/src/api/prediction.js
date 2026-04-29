import client from './client'

// Canvas chat tests the draft flowData (v1.5.0). External public traffic
// hits the published version unless the caller explicitly opts in.
const draftHeaders = { headers: { 'X-Chronos-Draft': 'true' } }

const sendMessageAndGetPrediction = (id, input) => client.post(`/internal-prediction/${id}`, input, draftHeaders)
const sendMessageAndStreamPrediction = (id, input) => client.post(`/internal-prediction/stream/${id}`, input, draftHeaders)
const sendMessageAndGetPredictionPublic = (id, input) => client.post(`/prediction/${id}`, input)

export default {
    sendMessageAndGetPrediction,
    sendMessageAndStreamPrediction,
    sendMessageAndGetPredictionPublic
}
