import { Request, Response, NextFunction } from 'express'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import evaluationsService from '../../services/evaluations'
import { getPageAndLimitParams } from '../../utils/pagination'

const createEvaluation = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: evaluationsService.createEvaluation - body not provided!`
            )
        }
        const body = req.body
        const orgId = ''
        const httpProtocol = req.get('x-forwarded-proto') || req.get('X-Forwarded-Proto') || req.protocol
        const baseURL = `${httpProtocol}://${req.get('host')}`
        const apiResponse = await evaluationsService.createEvaluation(body, baseURL, orgId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const runAgain = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: evaluationsService.runAgain - id not provided!`)
        }
        const orgId = ''
        const httpProtocol = req.get('x-forwarded-proto') || req.get('X-Forwarded-Proto') || req.protocol
        const baseURL = `${httpProtocol}://${req.get('host')}`
        const apiResponse = await evaluationsService.runAgain(req.params.id, baseURL, orgId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getEvaluation = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: evaluationsService.getEvaluation - id not provided!`)
        }
        const apiResponse = await evaluationsService.getEvaluation(req.params.id)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const deleteEvaluation = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: evaluationsService.deleteEvaluation - id not provided!`)
        }
        const apiResponse = await evaluationsService.deleteEvaluation(req.params.id)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getAllEvaluations = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page, limit } = getPageAndLimitParams(req)
        const apiResponse = await evaluationsService.getAllEvaluations(page, limit)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const isOutdated = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: evaluationsService.isOutdated - id not provided!`)
        }
        const apiResponse = await evaluationsService.isOutdated(req.params.id)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getVersions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: evaluationsService.getVersions - id not provided!`)
        }
        const apiResponse = await evaluationsService.getVersions(req.params.id)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const patchDeleteEvaluations = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const ids = req.body.ids ?? []
        const isDeleteAllVersion = req.body.isDeleteAllVersion ?? false
        const apiResponse = await evaluationsService.patchDeleteEvaluations(ids, isDeleteAllVersion)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    createEvaluation,
    getEvaluation,
    deleteEvaluation,
    getAllEvaluations,
    isOutdated,
    runAgain,
    getVersions,
    patchDeleteEvaluations
}
