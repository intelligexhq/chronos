import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import toolsService from '../../services/tools'
import { getPageAndLimitParams } from '../../utils/pagination'

const createTool = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: toolsController.createTool - body not provided!`)
        }
        const orgId = ''
        const body = req.body
        const apiResponse = await toolsService.createTool(body, orgId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const deleteTool = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: toolsController.deleteTool - id not provided!`)
        }
        const apiResponse = await toolsService.deleteTool(req.params.id)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getAllTools = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { page, limit } = getPageAndLimitParams(req)
        const apiResponse = await toolsService.getAllTools(page, limit)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getToolById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: toolsController.getToolById - id not provided!`)
        }
        const apiResponse = await toolsService.getToolById(req.params.id)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const updateTool = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: toolsController.updateTool - id not provided!`)
        }
        if (!req.body) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: toolsController.deleteTool - body not provided!`)
        }
        const apiResponse = await toolsService.updateTool(req.params.id, req.body)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    createTool,
    deleteTool,
    getAllTools,
    getToolById,
    updateTool
}
