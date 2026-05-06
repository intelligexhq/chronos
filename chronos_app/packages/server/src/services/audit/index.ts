import { ToolInvocationAudit } from '../../database/entities/ToolInvocationAudit'
import { getErrorMessage } from '../../errors/utils'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import logger from '../../utils/logger'

/**
 * Input shape for `recordToolInvocation`. Caller fills every field at the
 * gateway invoke site; the service does no enrichment.
 */
export interface ToolInvocationAuditInput {
    agentId: string
    agentSlug: string
    mcpServerId: string | null
    mcpServerSlug: string
    toolName: string
    namespacedTool: string
    success: boolean
    durationMs: number
    errorMessage: string | null
    callId: string | null
    userId: string | null
}

/**
 * Best-effort audit write. Inserts one row per MCP tool invocation. Failures
 * are swallowed and logged at WARN — never propagate to the caller, since the
 * structured `logger.info({ event: 'mcp.tool.invoke' })` line at the gateway
 * remains as the streaming / fallback record. Caller should fire-and-forget
 * (no `await`) to keep the gateway hot path off the DB write.
 */
const recordToolInvocation = async (input: ToolInvocationAuditInput): Promise<void> => {
    try {
        const repo = getRunningExpressApp().AppDataSource.getRepository(ToolInvocationAudit)
        await repo.insert(input)
    } catch (error) {
        logger.warn(`[auditService] recordToolInvocation failed: ${getErrorMessage(error)}`)
    }
}

/**
 * Read-side helper for the smoke test and § 6 (HTTP-agent execution viewer).
 * Returns every audit row for a given `callId` in chronological order. Empty
 * array if the callId is unknown.
 */
const listByCallId = async (callId: string): Promise<ToolInvocationAudit[]> => {
    const repo = getRunningExpressApp().AppDataSource.getRepository(ToolInvocationAudit)
    return repo.find({ where: { callId }, order: { createdDate: 'ASC' } })
}

export default {
    recordToolInvocation,
    listByCallId
}
