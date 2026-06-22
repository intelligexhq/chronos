import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { InternalChronosError } from '../../errors/internalChronosError'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'

/**
 * Read surface for the live MCP topology / request-flow map.
 *
 * Both endpoints are served by the running topology service, which only exists
 * when the feature is enabled (`ENABLE_MCP_TOPOLOGY`, default-on when
 * `ENABLE_MCP_SERVERS=true`). When the service is absent the feature is off, so
 * we answer with a clear 404 rather than computing an on-demand snapshot.
 */
const requireTopologyService = () => {
    const service = getRunningExpressApp().topologyService
    if (!service) {
        throw new InternalChronosError(
            StatusCodes.NOT_FOUND,
            'Error: topologyController - the live topology map is disabled (set ENABLE_MCP_TOPOLOGY=true with ENABLE_MCP_SERVERS=true to enable it)'
        )
    }
    return service
}

/**
 * Full current snapshot — the initial-render and reconnect source-of-truth the
 * SSE stream then patches. Optionally scoped to a single agent via `?agentId=`.
 */
const getSnapshot = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const service = requireTopologyService()
        const agentId = typeof req.query.agentId === 'string' && req.query.agentId ? req.query.agentId : undefined
        const snapshot = await service.getSnapshot({ agentId })
        return res.json(snapshot)
    } catch (error) {
        next(error)
    }
}

/**
 * Long-lived Server-Sent-Events stream. The service primes the freshly-opened
 * connection with the last broadcast snapshot, then pushes a new one whenever the
 * poll loop detects a change (idle ticks send a comment heartbeat). The response
 * is owned by the broadcaster for the life of the connection — no `next()` here.
 */
const streamSnapshots = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const service = requireTopologyService()
        service.subscribe(res)
    } catch (error) {
        next(error)
    }
}

export default {
    getSnapshot,
    streamSnapshots
}
