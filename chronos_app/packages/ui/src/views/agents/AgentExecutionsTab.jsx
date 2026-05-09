import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { omit } from 'lodash'
import { Box, Stack, Typography } from '@mui/material'

import useApi from '@/hooks/useApi'
import executionsApi from '@/api/executions'
import { ExecutionsListTable } from '@/ui-component/table/ExecutionsListTable'
import { ExecutionDetails } from '@/views/agentexecutions/ExecutionDetails'
import TablePagination, { DEFAULT_ITEMS_PER_PAGE } from '@/ui-component/pagination/TablePagination'
import execution_empty from '@/assets/images/executions_empty.svg'

/**
 * Per-agent Executions tab. Reuses the same `ExecutionsListTable` +
 * `ExecutionDetails` drawer pattern as the global `/executions` page,
 * scoped to the current agent's executions.
 *
 * The Execution table's `agentflowId` column is dual-purpose by design
 * (services/executions/index.ts): HTTP-runtime executions write
 * `agentflowId = Agent.id`, while BUILT_IN executions write
 * `agentflowId = AgentFlow.id`. We resolve the right filter value once
 * via `agent.runtimeType` and pass it to the existing API.
 */
const AgentExecutionsTab = ({ agent }) => {
    const filterId = agent.runtimeType === 'HTTP' ? agent.id : agent.builtinAgentflowId

    const getAllExecutions = useApi(executionsApi.getAllExecutions)
    const getExecutionByIdApi = useApi(executionsApi.getExecutionById)

    const [executions, setExecutions] = useState([])
    const [total, setTotal] = useState(0)
    const [currentPage, setCurrentPage] = useState(1)
    const [pageLimit, setPageLimit] = useState(DEFAULT_ITEMS_PER_PAGE)
    const [openDrawer, setOpenDrawer] = useState(false)
    const [selectedExecutionData, setSelectedExecutionData] = useState([])
    const [selectedMetadata, setSelectedMetadata] = useState({})

    const refresh = (page = currentPage, limit = pageLimit) => {
        if (!filterId) return
        getAllExecutions.request({ agentflowId: filterId, page, limit })
    }

    useEffect(() => {
        refresh(currentPage, pageLimit)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterId, currentPage, pageLimit])

    useEffect(() => {
        if (getAllExecutions.data) {
            setExecutions(getAllExecutions.data.data || [])
            setTotal(getAllExecutions.data.total || 0)
        }
    }, [getAllExecutions.data])

    useEffect(() => {
        if (getExecutionByIdApi.data) {
            const execution = getExecutionByIdApi.data
            const executionDetails =
                typeof execution.executionData === 'string' ? JSON.parse(execution.executionData) : execution.executionData
            setSelectedExecutionData(executionDetails)
            setSelectedMetadata((prev) => ({
                ...omit(execution, ['executionData']),
                agentflow: { ...prev.agentflow }
            }))
        }
    }, [getExecutionByIdApi.data])

    const onPageChange = (page, limit) => {
        setCurrentPage(page)
        setPageLimit(limit)
    }

    const onRowClick = (execution) => {
        const executionDetails = typeof execution.executionData === 'string' ? JSON.parse(execution.executionData) : execution.executionData
        setSelectedExecutionData(executionDetails)
        setSelectedMetadata(omit(execution, ['executionData']))
        setOpenDrawer(true)
    }

    const isLoading = getAllExecutions.loading
    const showEmptyState = !isLoading && executions.length === 0

    if (!filterId) {
        return (
            <EmptyExecutionsState
                title='No executions to show'
                detail='This agent has no associated runtime, so no executions can be linked here.'
            />
        )
    }

    return (
        <Stack flexDirection='column' sx={{ gap: 2 }}>
            {executions.length > 0 && (
                <>
                    <ExecutionsListTable data={executions} isLoading={isLoading} onExecutionRowClick={onRowClick} />
                    {!isLoading && total > 0 && (
                        <TablePagination currentPage={currentPage} limit={pageLimit} total={total} onChange={onPageChange} />
                    )}
                    <ExecutionDetails
                        open={openDrawer}
                        execution={selectedExecutionData}
                        metadata={selectedMetadata}
                        onClose={() => setOpenDrawer(false)}
                        onProceedSuccess={() => {
                            setOpenDrawer(false)
                            refresh()
                        }}
                        onUpdateSharing={() => refresh()}
                        onRefresh={(executionId) => {
                            refresh()
                            getExecutionByIdApi.request(executionId)
                        }}
                    />
                </>
            )}

            {showEmptyState && (
                <EmptyExecutionsState
                    title='No executions yet'
                    detail='Invoke this agent to see runs here. Recent executions appear newest first.'
                />
            )}
        </Stack>
    )
}

const EmptyExecutionsState = ({ title, detail }) => (
    <Stack sx={{ alignItems: 'center', justifyContent: 'center', py: 6 }} flexDirection='column'>
        <Box sx={{ p: 2 }}>
            <img style={{ objectFit: 'cover', height: '20vh', width: 'auto' }} src={execution_empty} alt='no executions' />
        </Box>
        <Typography variant='subtitle1'>{title}</Typography>
        <Typography variant='body2' sx={{ color: 'text.secondary', mt: 0.5, textAlign: 'center', maxWidth: 420 }}>
            {detail}
        </Typography>
    </Stack>
)

EmptyExecutionsState.propTypes = {
    title: PropTypes.string.isRequired,
    detail: PropTypes.string.isRequired
}

AgentExecutionsTab.propTypes = {
    agent: PropTypes.shape({
        id: PropTypes.string.isRequired,
        runtimeType: PropTypes.string.isRequired,
        builtinAgentflowId: PropTypes.string
    }).isRequired
}

export default AgentExecutionsTab
