import express from 'express'
import agentsController from '../../controllers/agents'
import { checkPermission } from '../../utils/openSourceStubs'

const router = express.Router()

router.post('/', checkPermission('agents:create'), agentsController.createAgent)

router.get('/', checkPermission('agents:view'), agentsController.getAllAgents)
router.get('/:id', checkPermission('agents:view'), agentsController.getAgentById)

router.put('/:id', checkPermission('agents:update'), agentsController.updateAgent)
router.patch('/:id/toggle', checkPermission('agents:update'), agentsController.toggleAgent)

router.delete('/:id', checkPermission('agents:delete'), agentsController.deleteAgent)

router.post('/:id/regenerate-mcp-gateway-token', checkPermission('agents:update'), agentsController.regenerateMcpGatewayToken)
router.post('/:id/test-connection', checkPermission('agents:update'), agentsController.testAgentConnection)

router.post('/:id/invoke', checkPermission('agents:invoke'), agentsController.invokeAgent)
router.post('/:id/chat/completions', checkPermission('agents:invoke'), agentsController.chatCompletions)

export default router
