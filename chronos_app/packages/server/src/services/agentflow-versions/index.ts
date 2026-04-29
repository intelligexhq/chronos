import { StatusCodes } from 'http-status-codes'
import { AgentFlow } from '../../database/entities/AgentFlow'
import { AgentflowVersion } from '../../database/entities/AgentflowVersion'
import { InternalChronosError } from '../../errors/internalChronosError'
import { getErrorMessage } from '../../errors/utils'
import { UserContext } from '../../Interface.Auth'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import logger from '../../utils/logger'

const NOTES_MAX_LENGTH = 1000

export const enum AgentflowVersionErrorMessage {
    NOTES_TOO_LONG = `notes must be ${NOTES_MAX_LENGTH} characters or fewer`,
    INVALID_FLOW_DATA = 'Cannot publish: draft flowData is empty or not valid JSON',
    INVALID_VERSION = 'version must be a positive integer',
    ROLLBACK_TO_CURRENT = 'Cannot rollback to the currently published version'
}

/**
 * Ownership check shared by all version operations.
 *
 * Admins can act on any agentflow; everyone else can only act on flows
 * they own. Returns the agentflow on success, throws otherwise.
 */
const loadAgentflowForUser = async (agentflowId: string, userContext?: UserContext): Promise<AgentFlow> => {
    const appServer = getRunningExpressApp()
    const agentflow = await appServer.AppDataSource.getRepository(AgentFlow).findOneBy({ id: agentflowId })
    if (!agentflow) {
        throw new InternalChronosError(StatusCodes.NOT_FOUND, `Agentflow ${agentflowId} not found`)
    }
    if (userContext && userContext.role !== 'admin' && agentflow.userId !== userContext.userId) {
        throw new InternalChronosError(StatusCodes.FORBIDDEN, 'You do not have permission to access this agentflow')
    }
    return agentflow
}

/**
 * Snapshot the draft into a new immutable version row and re-point the
 * agentflow's "live" pointer at it.
 *
 * Wrapped in a transaction so we never end up with a dangling
 * publishedVersionId or a half-incremented currentVersion counter.
 */
const publishAgentflow = async (
    agentflowId: string,
    body: { notes?: string } = {},
    userContext?: UserContext
): Promise<AgentflowVersion> => {
    try {
        const appServer = getRunningExpressApp()
        const agentflow = await loadAgentflowForUser(agentflowId, userContext)

        if (body.notes && body.notes.length > NOTES_MAX_LENGTH) {
            throw new InternalChronosError(StatusCodes.BAD_REQUEST, AgentflowVersionErrorMessage.NOTES_TOO_LONG)
        }

        if (!agentflow.flowData) {
            throw new InternalChronosError(StatusCodes.BAD_REQUEST, AgentflowVersionErrorMessage.INVALID_FLOW_DATA)
        }
        try {
            JSON.parse(agentflow.flowData)
        } catch {
            throw new InternalChronosError(StatusCodes.BAD_REQUEST, AgentflowVersionErrorMessage.INVALID_FLOW_DATA)
        }

        const nextVersion = (agentflow.currentVersion ?? 0) + 1

        const savedVersion = await appServer.AppDataSource.transaction(async (manager) => {
            const versionRow = manager.getRepository(AgentflowVersion).create({
                agentflowId: agentflow.id,
                version: nextVersion,
                flowData: agentflow.flowData,
                chatbotConfig: agentflow.chatbotConfig,
                apiConfig: agentflow.apiConfig,
                analytic: agentflow.analytic,
                speechToText: agentflow.speechToText,
                textToSpeech: agentflow.textToSpeech,
                followUpPrompts: agentflow.followUpPrompts,
                notes: body.notes,
                publishedBy: userContext?.userId
            })
            const insertedVersion = await manager.getRepository(AgentflowVersion).save(versionRow)

            await manager.getRepository(AgentFlow).update(
                { id: agentflow.id },
                {
                    publishedFlowData: agentflow.flowData,
                    publishedVersionId: insertedVersion.id,
                    currentVersion: nextVersion
                }
            )

            return insertedVersion
        })

        try {
            await appServer.telemetry?.sendTelemetry(
                'agentflow_published',
                { agentflowId: agentflow.id, version: nextVersion },
                userContext?.userId ?? ''
            )
        } catch (e) {
            logger.warn(`[server]: telemetry agentflow_published failed: ${getErrorMessage(e)}`)
        }

        return savedVersion
    } catch (error) {
        if (error instanceof InternalChronosError) throw error
        throw new InternalChronosError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: agentflowVersionsService.publishAgentflow - ${getErrorMessage(error)}`
        )
    }
}

/**
 * Re-point the live pointer at a previously-published version.
 *
 * `currentVersion` (the high-water mark) is intentionally not changed —
 * the next publish will still be `currentVersion + 1`, preserving the
 * full forward history.
 */
const rollbackAgentflow = async (agentflowId: string, version: number, userContext?: UserContext): Promise<AgentFlow> => {
    try {
        const appServer = getRunningExpressApp()
        if (!Number.isInteger(version) || version < 1) {
            throw new InternalChronosError(StatusCodes.BAD_REQUEST, AgentflowVersionErrorMessage.INVALID_VERSION)
        }

        const agentflow = await loadAgentflowForUser(agentflowId, userContext)

        const target = await appServer.AppDataSource.getRepository(AgentflowVersion).findOneBy({
            agentflowId,
            version
        })
        if (!target) {
            throw new InternalChronosError(StatusCodes.NOT_FOUND, `Agentflow ${agentflowId} has no version ${version}`)
        }

        if (agentflow.publishedVersionId === target.id) {
            throw new InternalChronosError(StatusCodes.BAD_REQUEST, AgentflowVersionErrorMessage.ROLLBACK_TO_CURRENT)
        }

        await appServer.AppDataSource.getRepository(AgentFlow).update(
            { id: agentflow.id },
            {
                publishedFlowData: target.flowData,
                publishedVersionId: target.id
            }
        )

        try {
            await appServer.telemetry?.sendTelemetry(
                'agentflow_rolled_back',
                { agentflowId: agentflow.id, version: target.version },
                userContext?.userId ?? ''
            )
        } catch (e) {
            logger.warn(`[server]: telemetry agentflow_rolled_back failed: ${getErrorMessage(e)}`)
        }

        const refreshed = await appServer.AppDataSource.getRepository(AgentFlow).findOneBy({ id: agentflow.id })
        return refreshed as AgentFlow
    } catch (error) {
        if (error instanceof InternalChronosError) throw error
        throw new InternalChronosError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: agentflowVersionsService.rollbackAgentflow - ${getErrorMessage(error)}`
        )
    }
}

const getAgentflowVersions = async (
    agentflowId: string,
    page: number = -1,
    limit: number = -1,
    userContext?: UserContext
): Promise<AgentflowVersion[] | { data: AgentflowVersion[]; total: number }> => {
    try {
        const appServer = getRunningExpressApp()
        await loadAgentflowForUser(agentflowId, userContext)

        const queryBuilder = appServer.AppDataSource.getRepository(AgentflowVersion)
            .createQueryBuilder('agentflow_version')
            .where('agentflow_version.agentflowId = :agentflowId', { agentflowId })
            .orderBy('agentflow_version.version', 'DESC')

        if (page > 0 && limit > 0) {
            queryBuilder.skip((page - 1) * limit)
            queryBuilder.take(limit)
        }
        const [data, total] = await queryBuilder.getManyAndCount()
        return page > 0 && limit > 0 ? { data, total } : data
    } catch (error) {
        if (error instanceof InternalChronosError) throw error
        throw new InternalChronosError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: agentflowVersionsService.getAgentflowVersions - ${getErrorMessage(error)}`
        )
    }
}

const getAgentflowVersion = async (agentflowId: string, version: number, userContext?: UserContext): Promise<AgentflowVersion> => {
    try {
        const appServer = getRunningExpressApp()
        if (!Number.isInteger(version) || version < 1) {
            throw new InternalChronosError(StatusCodes.BAD_REQUEST, AgentflowVersionErrorMessage.INVALID_VERSION)
        }
        await loadAgentflowForUser(agentflowId, userContext)

        const target = await appServer.AppDataSource.getRepository(AgentflowVersion).findOneBy({
            agentflowId,
            version
        })
        if (!target) {
            throw new InternalChronosError(StatusCodes.NOT_FOUND, `Agentflow ${agentflowId} has no version ${version}`)
        }
        return target
    } catch (error) {
        if (error instanceof InternalChronosError) throw error
        throw new InternalChronosError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: agentflowVersionsService.getAgentflowVersion - ${getErrorMessage(error)}`
        )
    }
}

export default {
    publishAgentflow,
    rollbackAgentflow,
    getAgentflowVersions,
    getAgentflowVersion
}
