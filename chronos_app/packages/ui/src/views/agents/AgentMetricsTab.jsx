import { useEffect, useState, useCallback } from 'react'
import PropTypes from 'prop-types'
import { Box, Grid, Stack, ToggleButton, ToggleButtonGroup, Typography, useTheme } from '@mui/material'
import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts'

import dashboardApi from '@/api/dashboard'
import SummaryCard from '@/ui-component/dashboard/SummaryCard'
import ChartCard from '@/ui-component/dashboard/ChartCard'
import { formatCost, formatDateLabel, formatDuration, formatNumber } from '@/ui-component/dashboard/formatters'

const WINDOW_OPTIONS = [
    { id: '7d', label: '7 days', days: 7 },
    { id: '14d', label: '14 days', days: 14 }
]

const isoDate = (d) => d.toISOString().slice(0, 10)

/**
 * Per-agent Metrics tab. Lighter than the global Cost Dashboard:
 * five summary cards + one Executions Over Time chart, with a 7-day /
 * 14-day window toggle. Same `agentflowId` dual-ID convention as the
 * Executions tab — HTTP agents filter by `Agent.id`, BUILT_IN by
 * `AgentFlow.id`.
 */
const AgentMetricsTab = ({ agent }) => {
    const theme = useTheme()
    const filterId = agent.runtimeType === 'HTTP' ? agent.id : agent.builtinAgentflowId

    const [windowDays, setWindowDays] = useState(7)
    const [summary, setSummary] = useState(null)
    const [series, setSeries] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchData = useCallback(async () => {
        if (!filterId) {
            setLoading(false)
            return
        }
        const now = new Date()
        const start = new Date(now)
        start.setDate(now.getDate() - (windowDays - 1))
        const startDate = isoDate(start)
        const endDate = isoDate(now)

        setLoading(true)
        try {
            const [sumResp, tsResp] = await Promise.all([
                dashboardApi.getSummary(startDate, endDate, filterId),
                dashboardApi.getTimeseries(startDate, endDate, 'daily', filterId)
            ])
            setSummary(sumResp?.data || null)
            setSeries(tsResp?.data?.series || [])
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('AgentMetricsTab fetch failed:', err)
            setSummary(null)
            setSeries([])
        } finally {
            setLoading(false)
        }
    }, [filterId, windowDays])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const tooltipStyle = {
        background: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 8,
        fontSize: 12
    }

    if (!filterId) {
        return <EmptyMetricsState detail='This agent has no associated runtime, so no metrics can be linked here.' />
    }

    return (
        <Stack flexDirection='column' sx={{ gap: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <ToggleButtonGroup
                    value={windowDays}
                    exclusive
                    size='small'
                    onChange={(_, val) => val && setWindowDays(val)}
                    aria-label='Metrics window'
                >
                    {WINDOW_OPTIONS.map((opt) => (
                        <ToggleButton key={opt.id} value={opt.days}>
                            {opt.label}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
            </Box>

            <Grid container spacing={2} sx={{ mb: '4px' }}>
                <SummaryCard title='Executions' value={loading ? null : formatNumber(summary?.totalExecutions || 0)} loading={loading} />
                <SummaryCard
                    title='Success Rate'
                    value={loading ? null : `${summary?.successRate || 0}%`}
                    loading={loading}
                    color={summary?.successRate >= 95 ? 'success' : summary?.successRate >= 80 ? 'warning' : 'error'}
                />
                <SummaryCard
                    title='Total Cost'
                    value={loading ? null : formatCost(summary?.totalCost || 0, summary?.currency)}
                    loading={loading}
                />
                <SummaryCard title='Avg Latency' value={loading ? null : formatDuration(summary?.avgDurationMs || 0)} loading={loading} />
                <SummaryCard title='Total Tokens' value={loading ? null : formatNumber(summary?.totalTokens || 0)} loading={loading} />
            </Grid>

            <ChartCard title='Executions Over Time' loading={loading}>
                {series.length > 0 ? (
                    <ResponsiveContainer width='100%' height={195}>
                        <BarChart data={series} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                            <XAxis dataKey='date' tickFormatter={formatDateLabel} tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                            <RechartsTooltip labelFormatter={formatDateLabel} contentStyle={tooltipStyle} />
                            <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                            <Bar
                                dataKey='successes'
                                name='Success'
                                fill={theme.palette.success.main}
                                stackId='exec'
                                radius={[2, 2, 0, 0]}
                            />
                            <Bar dataKey='errors' name='Error' fill={theme.palette.error.main} stackId='exec' radius={[2, 2, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                        <Typography variant='body2' color='text.secondary'>
                            No execution data for the selected window.
                        </Typography>
                    </Box>
                )}
            </ChartCard>
        </Stack>
    )
}

const EmptyMetricsState = ({ detail }) => (
    <Stack sx={{ alignItems: 'center', justifyContent: 'center', py: 6 }} flexDirection='column'>
        <Typography variant='subtitle1'>No metrics to show</Typography>
        <Typography variant='body2' sx={{ color: 'text.secondary', mt: 0.5, textAlign: 'center', maxWidth: 420 }}>
            {detail}
        </Typography>
    </Stack>
)

EmptyMetricsState.propTypes = {
    detail: PropTypes.string.isRequired
}

AgentMetricsTab.propTypes = {
    agent: PropTypes.shape({
        id: PropTypes.string.isRequired,
        runtimeType: PropTypes.string.isRequired,
        builtinAgentflowId: PropTypes.string
    }).isRequired
}

export default AgentMetricsTab
