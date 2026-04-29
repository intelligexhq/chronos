import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'

import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
    CircularProgress
} from '@mui/material'
import ReactJson from 'flowise-react-json-view'

import agentflowVersionsApi from '@/api/agentflowVersions'
import { StyledButton } from '@/ui-component/button/StyledButton'

const formatDate = (date) => {
    if (!date) return ''
    try {
        return new Date(date).toLocaleString()
    } catch {
        return String(date)
    }
}

/**
 * List, view, and rollback published versions of an agentflow.
 *
 * The dialog has two panes:
 *   1. Version table (with the active version pinned with an "Active" chip)
 *   2. JSON viewer for the selected version's flowData
 *
 * Rolling back re-points the live pointer at the chosen version. The
 * monotonic version counter is unaffected — next publish still becomes
 * v(currentVersion + 1).
 */
const AgentflowVersionsDialog = ({ show, agentflow, onCancel, onRolledBack }) => {
    const portalElement = document.getElementById('portal')
    const [versions, setVersions] = useState([])
    const [selected, setSelected] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [busyVersion, setBusyVersion] = useState(null)

    useEffect(() => {
        if (!show || !agentflow?.id) return
        let cancelled = false
        setLoading(true)
        setError(null)
        agentflowVersionsApi
            .listAgentflowVersions(agentflow.id)
            .then((res) => {
                if (cancelled) return
                const data = Array.isArray(res.data) ? res.data : res.data?.data ?? []
                setVersions(data)
                setSelected(data[0] ?? null)
            })
            .catch((err) => !cancelled && setError(err?.response?.data?.message ?? err.message))
            .finally(() => !cancelled && setLoading(false))
        return () => {
            cancelled = true
        }
    }, [show, agentflow?.id])

    const activeVersionNumber = versions.find((v) => v.id === agentflow?.publishedVersionId)?.version

    const handleSwitchTo = async (version) => {
        setBusyVersion(version.version)
        setError(null)
        try {
            const response = await agentflowVersionsApi.rollbackAgentflow(agentflow.id, version.version)
            if (onRolledBack) onRolledBack(version, response.data)
            onCancel()
        } catch (err) {
            setError(err?.response?.data?.message ?? err.message)
        } finally {
            setBusyVersion(null)
        }
    }

    if (!show) return null

    let parsedFlowData = {}
    if (selected?.flowData) {
        try {
            parsedFlowData = JSON.parse(selected.flowData)
        } catch {
            parsedFlowData = { raw: selected.flowData }
        }
    }

    const component = (
        <Dialog open={show} fullWidth maxWidth='lg' onClose={onCancel} aria-labelledby='versions-dialog-title'>
            <DialogTitle id='versions-dialog-title'>Version history — {agentflow?.name}</DialogTitle>
            <DialogContent dividers>
                {loading && <CircularProgress />}
                {error && (
                    <Typography color='error' sx={{ mb: 2 }}>
                        {error}
                    </Typography>
                )}
                {!loading && versions.length === 0 && <Typography>No published versions yet.</Typography>}
                {versions.length > 0 && (
                    <Stack direction='row' spacing={2} sx={{ minHeight: 400 }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Table size='small'>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Version</TableCell>
                                        <TableCell>Published</TableCell>
                                        <TableCell>By</TableCell>
                                        <TableCell>Notes</TableCell>
                                        <TableCell />
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {versions.map((v) => {
                                        const isActive = agentflow?.publishedVersionId === v.id
                                        const isSelected = selected?.id === v.id
                                        return (
                                            <TableRow
                                                key={v.id}
                                                hover
                                                selected={isSelected}
                                                sx={{ cursor: 'pointer' }}
                                                onClick={() => setSelected(v)}
                                            >
                                                <TableCell>
                                                    <Stack direction='row' spacing={1} alignItems='center'>
                                                        <span>v{v.version}</span>
                                                        {isActive && <Chip size='small' color='success' label='Active' />}
                                                    </Stack>
                                                </TableCell>
                                                <TableCell>{formatDate(v.createdDate)}</TableCell>
                                                <TableCell>{v.publishedBy || '—'}</TableCell>
                                                <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {v.notes || ''}
                                                </TableCell>
                                                <TableCell align='right'>
                                                    {!isActive && activeVersionNumber !== undefined && (
                                                        <Button
                                                            size='small'
                                                            disabled={busyVersion === v.version}
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleSwitchTo(v)
                                                            }}
                                                        >
                                                            {busyVersion === v.version
                                                                ? 'Switching…'
                                                                : v.version > activeVersionNumber
                                                                ? 'Promote'
                                                                : 'Rollback'}
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0, overflow: 'auto', maxHeight: 500 }}>
                            <Typography variant='subtitle2' sx={{ mb: 1 }}>
                                {selected ? `Snapshot of v${selected.version}` : 'Select a version'}
                            </Typography>
                            {selected && <ReactJson src={parsedFlowData} collapsed={2} enableClipboard={false} displayDataTypes={false} />}
                        </Box>
                    </Stack>
                )}
            </DialogContent>
            <DialogActions>
                <StyledButton variant='contained' onClick={onCancel}>
                    Close
                </StyledButton>
            </DialogActions>
        </Dialog>
    )

    return createPortal(component, portalElement)
}

AgentflowVersionsDialog.propTypes = {
    show: PropTypes.bool,
    agentflow: PropTypes.object,
    onCancel: PropTypes.func,
    onRolledBack: PropTypes.func
}

export default AgentflowVersionsDialog
