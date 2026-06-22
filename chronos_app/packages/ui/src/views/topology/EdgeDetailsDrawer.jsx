import PropTypes from 'prop-types'
import { useNavigate } from 'react-router-dom'
import moment from 'moment'
import { useTheme } from '@mui/material/styles'
import {
    Box,
    Button,
    Chip,
    Divider,
    Drawer,
    IconButton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Tooltip,
    Typography
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import { IconExternalLink, IconX } from '@tabler/icons-react'

const WINDOW_LABELS = { '1m': 'Last 1m', '5m': 'Last 5m', '1h': 'Last 1h' }

/**
 * Right-hand drawer detailing a single topology edge: per-window request
 * counts and latency percentiles, plus the most recent invocations. Each
 * recent call deep-links into the Audit Log filtered to its callId.
 */
const EdgeDetailsDrawer = ({ open, edge, windows, nodeLabels, onClose }) => {
    const theme = useTheme()
    const navigate = useNavigate()

    const windowKeys = windows && windows.length ? windows : ['1m', '5m', '1h']
    const sourceLabel = edge ? nodeLabels[edge.source] || edge.source : ''
    const targetLabel = edge ? nodeLabels[edge.target] || edge.target : ''

    // Prefer an exact callId link, but most gateway rows don't carry one, so fall
    // back to filtering the Audit Log by the tool — always present and still a
    // useful jump from a specific invocation.
    const openInAuditLog = (inv) => {
        const params = new URLSearchParams()
        if (inv.callId) params.set('callId', inv.callId)
        else if (inv.namespacedTool) params.set('namespacedTool', inv.namespacedTool)
        if (![...params.keys()].length) return
        navigate(`/audit-log?${params.toString()}`)
    }

    return (
        <Drawer anchor='right' open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 460 } } }}>
            {edge && (
                <Box sx={{ p: 3 }}>
                    <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ mb: 2 }}>
                        <Typography variant='h4'>Connection details</Typography>
                        <IconButton onClick={onClose} size='small'>
                            <IconX size={18} />
                        </IconButton>
                    </Stack>

                    <Stack direction='row' alignItems='center' spacing={1} sx={{ flexWrap: 'wrap', mb: 3 }}>
                        <Chip label={sourceLabel} size='small' />
                        <Typography color='text.secondary'>→</Typography>
                        <Chip label={targetLabel} size='small' color='primary' variant='outlined' />
                    </Stack>

                    <Typography variant='overline' color='text.secondary'>
                        Request volume &amp; latency
                    </Typography>
                    <Table size='small' sx={{ mb: 3 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontSize: 12 }}>Window</TableCell>
                                <TableCell sx={{ fontSize: 12 }} align='right'>
                                    Reqs
                                </TableCell>
                                <TableCell sx={{ fontSize: 12 }} align='right'>
                                    Errors
                                </TableCell>
                                <TableCell sx={{ fontSize: 12 }} align='right'>
                                    p50
                                </TableCell>
                                <TableCell sx={{ fontSize: 12 }} align='right'>
                                    p95
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {windowKeys.map((key) => {
                                const s = (edge.stats && edge.stats[key]) || { count: 0, errorCount: 0, p50Ms: 0, p95Ms: 0 }
                                return (
                                    <TableRow key={key}>
                                        <TableCell sx={{ fontSize: 13 }}>{WINDOW_LABELS[key] || key}</TableCell>
                                        <TableCell sx={{ fontSize: 13 }} align='right'>
                                            {s.count}
                                        </TableCell>
                                        <TableCell
                                            sx={{ fontSize: 13, color: s.errorCount > 0 ? theme.palette.error.main : 'inherit' }}
                                            align='right'
                                        >
                                            {s.errorCount}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: 13 }} align='right'>
                                            {s.p50Ms}ms
                                        </TableCell>
                                        <TableCell sx={{ fontSize: 13 }} align='right'>
                                            {s.p95Ms}ms
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>

                    <Typography variant='overline' color='text.secondary'>
                        Recent invocations
                    </Typography>
                    {edge.recent && edge.recent.length > 0 ? (
                        <Stack divider={<Divider flexItem />} sx={{ mt: 1 }}>
                            {edge.recent.map((inv, idx) => (
                                <Stack
                                    key={`${inv.callId || 'call'}-${idx}`}
                                    direction='row'
                                    alignItems='center'
                                    justifyContent='space-between'
                                    sx={{ py: 1 }}
                                >
                                    <Box sx={{ minWidth: 0 }}>
                                        <Stack direction='row' alignItems='center' spacing={0.5}>
                                            {inv.success ? (
                                                <Box component={CheckCircleIcon} sx={{ fontSize: 16 }} color='success.dark' />
                                            ) : (
                                                <Box component={ErrorIcon} sx={{ fontSize: 16 }} color='error.main' />
                                            )}
                                            <Typography sx={{ fontSize: 13, fontWeight: 500 }}>{inv.toolName}</Typography>
                                        </Stack>
                                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                                            {moment(inv.createdDate).format('MMM D, h:mm:ss A')} · {inv.durationMs}ms
                                        </Typography>
                                    </Box>
                                    <Tooltip title={inv.callId ? 'View this call in Audit Log' : 'View this tool in Audit Log'}>
                                        <span>
                                            <Button
                                                size='small'
                                                variant='outlined'
                                                disabled={!inv.callId && !inv.namespacedTool}
                                                onClick={() => openInAuditLog(inv)}
                                                startIcon={<IconExternalLink size={14} />}
                                            >
                                                Audit
                                            </Button>
                                        </span>
                                    </Tooltip>
                                </Stack>
                            ))}
                        </Stack>
                    ) : (
                        <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 1 }}>No invocations in the last hour.</Typography>
                    )}
                </Box>
            )}
        </Drawer>
    )
}

EdgeDetailsDrawer.propTypes = {
    open: PropTypes.bool,
    edge: PropTypes.object,
    windows: PropTypes.array,
    nodeLabels: PropTypes.object,
    onClose: PropTypes.func
}

export default EdgeDetailsDrawer
