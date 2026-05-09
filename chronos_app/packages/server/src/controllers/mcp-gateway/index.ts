import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { InternalChronosError } from '../../errors/internalChronosError'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'

const requireAgent = (req: Request) => {
    const agent = req.gatewayAgent
    if (!agent) {
        throw new InternalChronosError(StatusCodes.UNAUTHORIZED, 'Gateway agent not attached to request')
    }
    return agent
}

const requireGateway = () => {
    const app = getRunningExpressApp()
    if (!app.mcpGateway) {
        throw new InternalChronosError(
            StatusCodes.SERVICE_UNAVAILABLE,
            'MCP gateway is not enabled. Set ENABLE_MCP_SERVERS=true to enable it.'
        )
    }
    return app.mcpGateway
}

const invokeTool = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const agent = requireAgent(req)
        const { tool, params, callId } = req.body ?? {}
        if (!tool || typeof tool !== 'string') {
            throw new InternalChronosError(StatusCodes.BAD_REQUEST, 'tool (string) is required in request body')
        }

        const gateway = requireGateway()
        const result = await gateway.invoke(agent, tool, params, { callId: typeof callId === 'string' ? callId : undefined })
        return res.json({ success: true, result })
    } catch (error) {
        next(error)
    }
}

const listTools = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const agent = requireAgent(req)
        const gateway = requireGateway()
        const tools = await gateway.listAllowedTools(agent)
        return res.json({ tools })
    } catch (error) {
        next(error)
    }
}

/**
 * Per-agent gateway health probe. Returns 200 once the request has cleared
 * the same `mcpGatewayAuth` middleware that gates `/tools/invoke`, meaning:
 * the supplied bearer matches the agent's `mcpGatewayToken`, the agent is
 * enabled, and the runtime type is HTTP. Also requires the gateway service
 * itself to be wired (ENABLE_MCP_SERVERS=true) so a 200 is a real proof of
 * end-to-end reachability, not just an auth result.
 *
 * Echoes the canonical `gatewayUrl` Chronos derives from the inbound `Host`
 * — agents that follow the recommended pattern of holding their own
 * `MCP_GATEWAY_URL` config can compare what they have against what Chronos
 * thinks the URL is, and fail loud on mismatch.
 */
const health = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const agent = requireAgent(req)
        requireGateway()
        const httpProtocol = req.get('x-forwarded-proto') || req.protocol
        const baseURL = `${httpProtocol}://${req.get('host')}`
        return res.json({
            ok: true,
            agentId: agent.id,
            agentEnabled: agent.enabled,
            gatewayUrl: `${baseURL}/api/v1/mcp-gateway/${agent.id}/tools/invoke`
        })
    } catch (error) {
        next(error)
    }
}

export default {
    invokeTool,
    listTools,
    health
}
