import express from 'express'
import agentflowGeneratorController from '../../controllers/agentflow-generator'
const router = express.Router()

router.post('/generate', agentflowGeneratorController.generateAgentflow)

export default router
