import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import dashboardService from '../../services/dashboard'
import { InternalChronosError } from '../../errors/internalChronosError'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'

/**
 * GET /api/v1/dashboard/summary
 * Returns summary statistics for the dashboard cards.
 */
const getSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { startDate, endDate, agentflowId } = parseDateParams(req)
        const appServer = getRunningExpressApp()
        const result = await dashboardService.getSummary(appServer.AppDataSource, startDate, endDate, agentflowId)
        return res.json(result)
    } catch (error) {
        next(error)
    }
}

/**
 * GET /api/v1/dashboard/timeseries
 * Returns time-series data for dashboard charts.
 */
const getTimeseries = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { startDate, endDate, agentflowId } = parseDateParams(req)
        const granularity = (req.query?.granularity as string) || 'daily'
        const appServer = getRunningExpressApp()
        const result = await dashboardService.getTimeseries(appServer.AppDataSource, startDate, endDate, granularity, agentflowId)
        return res.json(result)
    } catch (error) {
        next(error)
    }
}

/**
 * GET /api/v1/dashboard/agents
 * Returns per-agent statistics for the agents table.
 */
const getAgents = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { startDate, endDate } = parseDateParams(req)
        const sortBy = (req.query?.sortBy as string) || 'executionCount'
        const sortOrder = (req.query?.sortOrder as string) || 'DESC'
        const page = parseInt(req.query?.page as string, 10) || 1
        const limit = parseInt(req.query?.limit as string, 10) || 20
        const appServer = getRunningExpressApp()
        const result = await dashboardService.getAgents(appServer.AppDataSource, startDate, endDate, sortBy, sortOrder, page, limit)
        return res.json(result)
    } catch (error) {
        next(error)
    }
}

/**
 * GET /api/v1/dashboard/export
 * Exports raw execution metrics data.
 */
const getExport = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { startDate, endDate, agentflowId } = parseDateParams(req)
        const format = (req.query?.format as string) || 'json'
        const appServer = getRunningExpressApp()
        const data = await dashboardService.getExport(appServer.AppDataSource, startDate, endDate, agentflowId)

        if (format === 'csv') {
            const csv = convertToCSV(data)
            res.setHeader('Content-Type', 'text/csv')
            res.setHeader('Content-Disposition', 'attachment; filename=execution_metrics.csv')
            return res.send(csv)
        }

        return res.json(data)
    } catch (error) {
        next(error)
    }
}

/**
 * Parses and validates date query parameters.
 */
const parseDateParams = (req: Request): { startDate: string; endDate: string; agentflowId?: string } => {
    const startDate = req.query?.startDate as string
    const endDate = req.query?.endDate as string

    if (!startDate || !endDate) {
        throw new InternalChronosError(StatusCodes.BAD_REQUEST, 'startDate and endDate query parameters are required')
    }

    const agentflowId = req.query?.agentflowId as string | undefined

    return { startDate, endDate, agentflowId }
}

/**
 * Converts an array of objects to CSV format.
 */
const convertToCSV = (data: any[]): string => {
    if (data.length === 0) return ''
    const headers = Object.keys(data[0])
    const rows = data.map((row) => headers.map((h) => JSON.stringify(row[h] ?? '')).join(','))
    return [headers.join(','), ...rows].join('\n')
}

export default {
    getSummary,
    getTimeseries,
    getAgents,
    getExport
}
