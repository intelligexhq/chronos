import { Request, Response, NextFunction } from 'express'
import loadPromptsService from '../../services/load-prompts'
import { InternalChronosError } from '../../errors/internalChronosError'
import { StatusCodes } from 'http-status-codes'

const createPrompt = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.body === 'undefined' || !req.body.promptName) {
            throw new InternalChronosError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: loadPromptsController.createPrompt - promptName not provided!`
            )
        }
        const apiResponse = await loadPromptsService.createPrompt(req.body.promptName as string)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    createPrompt
}
