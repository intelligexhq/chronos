import { Request, Response, NextFunction } from 'express'
import agentflowGeneratorService from '../../services/agentflow-generator'

const generateAgentflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body.question || !req.body.selectedChatModel) {
            throw new Error('Question and selectedChatModel are required')
        }
        const apiResponse = await agentflowGeneratorService.generateAgentflow(req.body.question, req.body.selectedChatModel)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    generateAgentflow
}
