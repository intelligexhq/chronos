import express from 'express'
import mcpServersController from '../../controllers/mcp-servers'
import { checkPermission } from '../../utils/openSourceStubs'

const router = express.Router()

router.post('/', checkPermission('mcp-servers:create'), mcpServersController.createMCPServer)

router.get('/', checkPermission('mcp-servers:view'), mcpServersController.getAllMCPServers)
router.get('/:id', checkPermission('mcp-servers:view'), mcpServersController.getMCPServerById)

router.put('/:id', checkPermission('mcp-servers:update'), mcpServersController.updateMCPServer)
router.patch('/:id/toggle', checkPermission('mcp-servers:update'), mcpServersController.toggleMCPServer)

router.delete('/:id', checkPermission('mcp-servers:delete'), mcpServersController.deleteMCPServer)

router.post('/:id/test-connection', checkPermission('mcp-servers:update'), mcpServersController.testMCPServerConnection)

export default router
