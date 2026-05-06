import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { InternalChronosError } from '../../errors/internalChronosError'
import auditService from '../../services/audit'

const listToolInvocations = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const callId = typeof req.query.callId === 'string' ? req.query.callId : undefined
        if (!callId) {
            throw new InternalChronosError(
                StatusCodes.BAD_REQUEST,
                'Error: auditController.listToolInvocations - callId query parameter is required'
            )
        }
        const rows = await auditService.listByCallId(callId)
        return res.json({ rows })
    } catch (error) {
        next(error)
    }
}

export default {
    listToolInvocations
}
