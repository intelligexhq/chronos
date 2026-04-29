import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { InternalChronosError } from '../../errors/internalChronosError'
import { UserContext } from '../../Interface.Auth'
import agentflowVersionsService from '../../services/agentflow-versions'
import { getPageAndLimitParams } from '../../utils/pagination'

const getUserContext = (req: Request): UserContext | undefined => {
    if (!req.userId || !req.userRole) return undefined
    return { userId: req.userId, role: req.userRole }
}

const requireId = (req: Request, fnName: string): string => {
    if (!req.params?.id) {
        throw new InternalChronosError(StatusCodes.PRECONDITION_FAILED, `Error: agentflowVersionsController.${fnName} - id not provided!`)
    }
    return req.params.id
}

const parseVersion = (req: Request, fnName: string): number => {
    const raw = req.params?.version
    const version = Number(raw)
    if (!raw || !Number.isInteger(version) || version < 1) {
        throw new InternalChronosError(
            StatusCodes.BAD_REQUEST,
            `Error: agentflowVersionsController.${fnName} - version must be a positive integer`
        )
    }
    return version
}

const publishAgentflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = requireId(req, 'publishAgentflow')
        const apiResponse = await agentflowVersionsService.publishAgentflow(id, req.body || {}, getUserContext(req))
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const rollbackAgentflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = requireId(req, 'rollbackAgentflow')
        const version = parseVersion(req, 'rollbackAgentflow')
        const apiResponse = await agentflowVersionsService.rollbackAgentflow(id, version, getUserContext(req))
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getAgentflowVersions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = requireId(req, 'getAgentflowVersions')
        const { page, limit } = getPageAndLimitParams(req)
        const apiResponse = await agentflowVersionsService.getAgentflowVersions(id, page, limit, getUserContext(req))
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getAgentflowVersion = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = requireId(req, 'getAgentflowVersion')
        const version = parseVersion(req, 'getAgentflowVersion')
        const apiResponse = await agentflowVersionsService.getAgentflowVersion(id, version, getUserContext(req))
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    publishAgentflow,
    rollbackAgentflow,
    getAgentflowVersions,
    getAgentflowVersion
}
