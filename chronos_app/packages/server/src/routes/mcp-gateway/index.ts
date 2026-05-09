import express from 'express'
import mcpGatewayController from '../../controllers/mcp-gateway'
import { mcpGatewayAuth } from '../../middlewares/mcpGatewayAuth'

const router = express.Router()

/**
 * MCP gateway callback surface. The agent's `mcpGatewayToken` is the auth —
 * no API key, no JWT. The path is whitelisted in `utils/constants.ts` so the
 * global API-key check skips it; `mcpGatewayAuth` enforces the bearer.
 */
router.post('/:agentId/tools/invoke', mcpGatewayAuth, mcpGatewayController.invokeTool)
router.get('/:agentId/tools', mcpGatewayAuth, mcpGatewayController.listTools)

export default router
