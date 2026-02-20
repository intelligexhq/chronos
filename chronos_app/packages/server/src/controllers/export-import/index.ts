import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { InternalChronosError } from '../../errors/internalChronosError'
import exportImportService from '../../services/export-import'

const exportData = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // workspaceId is optional - only used in enterprise for workspace scoping
        const workspaceId = req.user?.activeWorkspaceId || ''
        const apiResponse = await exportImportService.exportData(exportImportService.convertExportInput(req.body), workspaceId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const importData = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // These are optional enterprise-only fields - quota checks will be skipped if not provided
        const orgId = req.user?.activeOrganizationId || ''
        const workspaceId = req.user?.activeWorkspaceId || ''
        const subscriptionId = req.user?.activeOrganizationSubscriptionId || ''

        const importDataBody = req.body
        if (!importDataBody) {
            throw new InternalChronosError(StatusCodes.BAD_REQUEST, 'Error: exportImportController.importData - importData is required!')
        }

        await exportImportService.importData(importDataBody, orgId, workspaceId, subscriptionId)
        return res.status(StatusCodes.OK).json({ message: 'success' })
    } catch (error) {
        next(error)
    }
}

export default {
    exportData,
    importData
}
