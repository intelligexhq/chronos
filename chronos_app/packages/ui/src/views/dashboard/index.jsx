import { useEffect, useState, useCallback } from 'react'
import PropTypes from 'prop-types'
import {
    Box,
    Card,
    CardContent,
    Grid,
    Typography,
    Skeleton,
    ToggleButton,
    ToggleButtonGroup,
    Autocomplete,
    TextField,
    Tooltip,
    IconButton,
    Chip,
    useTheme,
    alpha
} from '@mui/material'
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    AreaChart,
    Area,
    ComposedChart,
    XAxis,
    YAxis,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Legend
} from 'recharts'
import { IconRefresh, IconDownload } from '@tabler/icons-react'
import MainCard from '@/ui-component/cards/MainCard'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import ErrorBoundary from '@/ErrorBoundary'
import dashboardApi from '@/api/dashboard'
import agentflowsApi from '@/api/agentflows'
import useApi from '@/hooks/useApi'

const DATE_RANGES = {
    today: {
        label: 'Today',
        getDates: () => {
            const d = formatDate(new Date())
            return { start: d, end: d }
        }
    },
    '7d': {
        label: '7 Days',
        getDates: () => {
            const e = new Date()
            const s = new Date()
            s.setDate(s.getDate() - 6)
            return { start: formatDate(s), end: formatDate(e) }
        }
    },
    '30d': {
        label: '30 Days',
        getDates: () => {
            const e = new Date()
            const s = new Date()
            s.setDate(s.getDate() - 29)
            return { start: formatDate(s), end: formatDate(e) }
        }
    },
    '90d': {
        label: '90 Days',
        getDates: () => {
            const e = new Date()
            const s = new Date()
            s.setDate(s.getDate() - 89)
            return { start: formatDate(s), end: formatDate(e) }
        }
    }
}

/** Formats Date to YYYY-MM-DD */
const formatDate = (d) => d.toISOString().split('T')[0]

/** Formats milliseconds to human-readable */
const formatDuration = (ms) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
}

/** Formats cost with currency */
const formatCost = (cost, currency = 'USD') => {
    if (cost === 0) return `${currency} 0.00`
    if (cost < 0.01) return `${currency} <0.01`
    return `${currency} ${cost.toFixed(2)}`
}

/** Formats large numbers */
const formatNumber = (n) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return String(n)
}

/** Formats date label for chart X-axis */
const formatDateLabel = (dateStr) => {
    if (dateStr.includes('T')) {
        // Hourly: "2026-03-21T14:00" -> "14:00"
        return dateStr.split('T')[1]
    }
    // Daily: "2026-03-21" -> "Mar 21"
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const CostDashboard = () => {
    const theme = useTheme()
    const [dateRange, setDateRange] = useState('7d')
    const [selectedAgent, setSelectedAgent] = useState(null)
    const [summary, setSummary] = useState(null)
    const [timeseries, setTimeseries] = useState(null)
    const [agents, setAgents] = useState(null)
    const [agentOptions, setAgentOptions] = useState([])
    const [loading, setLoading] = useState(true)

    const getAllAgentflowsApi = useApi(agentflowsApi.getAllAgentflows)

    // Load agentflow options for the filter dropdown
    useEffect(() => {
        getAllAgentflowsApi.request('AGENTFLOW')
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (getAllAgentflowsApi.data?.data) {
            setAgentOptions(getAllAgentflowsApi.data.data.map((af) => ({ id: af.id, label: af.name })))
        }
    }, [getAllAgentflowsApi.data])

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const { start, end } = DATE_RANGES[dateRange].getDates()
            const agentflowId = selectedAgent?.id
            const granularity = dateRange === 'today' ? 'hourly' : 'daily'

            const [summaryRes, timeseriesRes, agentsRes] = await Promise.all([
                dashboardApi.getSummary(start, end, agentflowId),
                dashboardApi.getTimeseries(start, end, granularity, agentflowId),
                dashboardApi.getAgents(start, end, 'executionCount', 'DESC', 1, 20)
            ])

            setSummary(summaryRes.data)
            setTimeseries(timeseriesRes.data)
            setAgents(agentsRes.data)
        } catch (error) {
            console.error('Dashboard fetch error:', error)
        } finally {
            setLoading(false)
        }
    }, [dateRange, selectedAgent])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleExport = async () => {
        try {
            const { start, end } = DATE_RANGES[dateRange].getDates()
            const res = await dashboardApi.getExport(start, end, selectedAgent?.id, 'csv')
            const blob = new Blob([res.data], { type: 'text/csv' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `execution_metrics_${start}_${end}.csv`
            a.click()
            window.URL.revokeObjectURL(url)
        } catch (error) {
            console.error('Export error:', error)
        }
    }

    const chartColors = {
        success: theme.palette.success.main,
        error: theme.palette.error.main,
        cost: theme.palette.primary.main,
        inputTokens: theme.palette.primary.main,
        outputTokens: theme.palette.secondary.main,
        avgLatency: theme.palette.info.main,
        p95Latency: alpha(theme.palette.warning.main, 0.3)
    }

    return (
        <>
            <ViewHeader title='Cost & Performance Dashboard' />
            <ErrorBoundary>
                <MainCard sx={{ p: 0 }}>
                    {/* Filters Row */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                        <ToggleButtonGroup value={dateRange} exclusive onChange={(_, val) => val && setDateRange(val)} size='small'>
                            {Object.entries(DATE_RANGES).map(([key, { label }]) => (
                                <ToggleButton key={key} value={key} sx={{ textTransform: 'none', px: 2 }}>
                                    {label}
                                </ToggleButton>
                            ))}
                        </ToggleButtonGroup>

                        <Autocomplete
                            size='small'
                            options={agentOptions}
                            value={selectedAgent}
                            onChange={(_, val) => setSelectedAgent(val)}
                            isOptionEqualToValue={(opt, val) => opt.id === val.id}
                            renderInput={(params) => <TextField {...params} placeholder='All Agents' />}
                            sx={{ minWidth: 250 }}
                        />

                        <Box sx={{ flex: 1 }} />

                        <Tooltip title='Refresh'>
                            <IconButton onClick={fetchData} size='small'>
                                <IconRefresh size={18} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title='Export CSV'>
                            <IconButton onClick={handleExport} size='small'>
                                <IconDownload size={18} />
                            </IconButton>
                        </Tooltip>
                    </Box>

                    {/* Summary Cards */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <SummaryCard
                            title='Executions'
                            value={loading ? null : formatNumber(summary?.totalExecutions || 0)}
                            loading={loading}
                        />
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
                        <SummaryCard
                            title='Avg Latency'
                            value={loading ? null : formatDuration(summary?.avgDurationMs || 0)}
                            loading={loading}
                        />
                        <SummaryCard
                            title='Total Tokens'
                            value={loading ? null : formatNumber(summary?.totalTokens || 0)}
                            loading={loading}
                        />
                    </Grid>

                    {/* Executions Over Time Chart */}
                    <ChartCard title='Executions Over Time' loading={loading}>
                        <ResponsiveContainer width='100%' height={280}>
                            <BarChart data={timeseries?.series || []} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                                <XAxis dataKey='date' tickFormatter={formatDateLabel} tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                <RechartsTooltip
                                    labelFormatter={formatDateLabel}
                                    contentStyle={{
                                        background: theme.palette.background.paper,
                                        border: `1px solid ${theme.palette.divider}`,
                                        borderRadius: 8,
                                        fontSize: 12
                                    }}
                                />
                                <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                                <Bar dataKey='successes' name='Success' fill={chartColors.success} stackId='exec' radius={[2, 2, 0, 0]} />
                                <Bar dataKey='errors' name='Error' fill={chartColors.error} stackId='exec' radius={[2, 2, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    {/* Cost + Token Usage Row */}
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid item xs={12} md={6}>
                            <ChartCard title={`Cost Over Time (${summary?.currency || 'USD'})`} loading={loading}>
                                <ResponsiveContainer width='100%' height={240}>
                                    <LineChart data={timeseries?.series || []} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                                        <XAxis dataKey='date' tickFormatter={formatDateLabel} tick={{ fontSize: 11 }} />
                                        <YAxis tick={{ fontSize: 11 }} />
                                        <RechartsTooltip
                                            labelFormatter={formatDateLabel}
                                            formatter={(val) => [formatCost(val, summary?.currency), 'Cost']}
                                            contentStyle={{
                                                background: theme.palette.background.paper,
                                                border: `1px solid ${theme.palette.divider}`,
                                                borderRadius: 8,
                                                fontSize: 12
                                            }}
                                        />
                                        <Line type='monotone' dataKey='cost' stroke={chartColors.cost} strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </ChartCard>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <ChartCard title='Token Usage Over Time' loading={loading}>
                                <ResponsiveContainer width='100%' height={240}>
                                    <AreaChart data={timeseries?.series || []} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                                        <XAxis dataKey='date' tickFormatter={formatDateLabel} tick={{ fontSize: 11 }} />
                                        <YAxis tick={{ fontSize: 11 }} tickFormatter={formatNumber} />
                                        <RechartsTooltip
                                            labelFormatter={formatDateLabel}
                                            formatter={(val) => [formatNumber(val)]}
                                            contentStyle={{
                                                background: theme.palette.background.paper,
                                                border: `1px solid ${theme.palette.divider}`,
                                                borderRadius: 8,
                                                fontSize: 12
                                            }}
                                        />
                                        <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                                        <Area
                                            type='monotone'
                                            dataKey='inputTokens'
                                            name='Input'
                                            fill={alpha(chartColors.inputTokens, 0.2)}
                                            stroke={chartColors.inputTokens}
                                            strokeWidth={1.5}
                                            stackId='tokens'
                                        />
                                        <Area
                                            type='monotone'
                                            dataKey='outputTokens'
                                            name='Output'
                                            fill={alpha(chartColors.outputTokens, 0.2)}
                                            stroke={chartColors.outputTokens}
                                            strokeWidth={1.5}
                                            stackId='tokens'
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </ChartCard>
                        </Grid>
                    </Grid>

                    {/* Latency Chart */}
                    <ChartCard title='Latency Over Time' loading={loading}>
                        <ResponsiveContainer width='100%' height={240}>
                            <ComposedChart data={timeseries?.series || []} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                                <XAxis dataKey='date' tickFormatter={formatDateLabel} tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} tickFormatter={formatDuration} />
                                <RechartsTooltip
                                    labelFormatter={formatDateLabel}
                                    formatter={(val, name) => [formatDuration(val), name]}
                                    contentStyle={{
                                        background: theme.palette.background.paper,
                                        border: `1px solid ${theme.palette.divider}`,
                                        borderRadius: 8,
                                        fontSize: 12
                                    }}
                                />
                                <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                                <Area type='monotone' dataKey='p95DurationMs' name='p95' fill={chartColors.p95Latency} stroke='none' />
                                <Line
                                    type='monotone'
                                    dataKey='avgDurationMs'
                                    name='Avg'
                                    stroke={chartColors.avgLatency}
                                    strokeWidth={2}
                                    dot={false}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    {/* Top Agents Table */}
                    <ChartCard title='Top Agents' loading={loading}>
                        {agents?.agents?.length > 0 ? (
                            <Box sx={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead>
                                        <tr style={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
                                            <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>Agent</th>
                                            <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 600 }}>Executions</th>
                                            <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 600 }}>Success Rate</th>
                                            <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 600 }}>Cost</th>
                                            <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 600 }}>Avg Latency</th>
                                            <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 600 }}>Tokens</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {agents.agents.map((agent) => (
                                            <tr
                                                key={agent.agentflowId}
                                                style={{ borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}` }}
                                            >
                                                <td style={{ padding: '8px 12px' }}>{agent.agentflowName}</td>
                                                <td style={{ textAlign: 'right', padding: '8px 12px' }}>
                                                    {formatNumber(agent.executionCount)}
                                                </td>
                                                <td style={{ textAlign: 'right', padding: '8px 12px' }}>
                                                    <Chip
                                                        label={`${agent.successRate}%`}
                                                        size='small'
                                                        color={
                                                            agent.successRate >= 95
                                                                ? 'success'
                                                                : agent.successRate >= 80
                                                                ? 'warning'
                                                                : 'error'
                                                        }
                                                        variant='outlined'
                                                        sx={{ fontWeight: 500 }}
                                                    />
                                                </td>
                                                <td style={{ textAlign: 'right', padding: '8px 12px' }}>
                                                    {formatCost(agent.totalCost, agents.currency)}
                                                </td>
                                                <td style={{ textAlign: 'right', padding: '8px 12px' }}>
                                                    {formatDuration(agent.avgDurationMs)}
                                                </td>
                                                <td style={{ textAlign: 'right', padding: '8px 12px' }}>
                                                    {formatNumber(agent.totalTokens)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </Box>
                        ) : (
                            <Box sx={{ py: 4, textAlign: 'center' }}>
                                <Typography variant='body2' color='text.secondary'>
                                    No execution data available for the selected period.
                                </Typography>
                            </Box>
                        )}
                    </ChartCard>
                </MainCard>
            </ErrorBoundary>
        </>
    )
}

/** Summary card component */
const SummaryCard = ({ title, value, loading, color }) => {
    const theme = useTheme()
    const colorMap = {
        success: theme.palette.success.main,
        warning: theme.palette.warning.main,
        error: theme.palette.error.main
    }

    return (
        <Grid item xs={6} sm={4} md={2.4}>
            <Card variant='outlined' sx={{ height: '100%' }}>
                <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                    <Typography
                        variant='caption'
                        color='text.secondary'
                        sx={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}
                    >
                        {title}
                    </Typography>
                    {loading ? (
                        <Skeleton width='60%' height={32} />
                    ) : (
                        <Typography variant='h5' sx={{ mt: 0.5, fontWeight: 600, color: color ? colorMap[color] : 'text.primary' }}>
                            {value}
                        </Typography>
                    )}
                </CardContent>
            </Card>
        </Grid>
    )
}

SummaryCard.propTypes = {
    title: PropTypes.string,
    value: PropTypes.string,
    loading: PropTypes.bool,
    color: PropTypes.string
}

/** Chart container card */
const ChartCard = ({ title, loading, children }) => {
    return (
        <Card variant='outlined' sx={{ mb: 2 }}>
            <CardContent sx={{ py: 2, px: 2, '&:last-child': { pb: 2 } }}>
                <Typography variant='subtitle2' sx={{ mb: 1.5, fontWeight: 600 }}>
                    {title}
                </Typography>
                {loading ? <Skeleton variant='rectangular' height={200} sx={{ borderRadius: 1 }} /> : children}
            </CardContent>
        </Card>
    )
}

ChartCard.propTypes = {
    title: PropTypes.string,
    loading: PropTypes.bool,
    children: PropTypes.node
}

export default CostDashboard
