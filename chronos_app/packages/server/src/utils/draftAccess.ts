import { Request } from 'express'
import { StatusCodes } from 'http-status-codes'
import { AgentFlow } from '../database/entities/AgentFlow'
import { InternalChronosError } from '../errors/internalChronosError'
import { validateAPIKey } from './validateKey'

/**
 * Header used to opt into the draft (canvas-time) flowData instead of the
 * published snapshot. Default is published; the header must equal "true"
 * (case-insensitive) to flip the switch.
 */
export const DRAFT_HEADER = 'x-chronos-draft'

export const isDraftRequested = (req: Request): boolean => {
    const raw = req.headers[DRAFT_HEADER]
    if (!raw) return false
    const value = Array.isArray(raw) ? raw[0] : raw
    return String(value).toLowerCase() === 'true'
}

/**
 * Gate access to draft flowData on prediction calls.
 *
 * - Internal requests (UI, x-request-from: internal) are already JWT-verified
 *   by the global middleware, so we only need to check that the caller
 *   owns the agentflow or is an admin.
 * - External requests must supply a valid platform API key. A flow-bound
 *   "execute" API key is intentionally not enough — drafts are not for
 *   read-only consumers.
 */
export const assertDraftAccess = async (req: Request, agentflow: AgentFlow, isInternal: boolean): Promise<void> => {
    if (isInternal) {
        if (req.userId && (req.userRole === 'admin' || agentflow.userId === req.userId)) {
            return
        }
        throw new InternalChronosError(StatusCodes.FORBIDDEN, 'Draft access requires owner or admin')
    }

    const { isValid } = await validateAPIKey(req)
    if (isValid) return

    throw new InternalChronosError(StatusCodes.UNAUTHORIZED, 'Draft access requires authentication')
}
