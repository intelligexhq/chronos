import { createPortal } from 'react-dom'
import { useState } from 'react'
import PropTypes from 'prop-types'

import { Button, Dialog, DialogActions, DialogContent, DialogTitle, OutlinedInput, Typography } from '@mui/material'
import { StyledButton } from '@/ui-component/button/StyledButton'

const NOTES_MAX = 1000

/**
 * Confirmation dialog shown before publishing the current draft. Captures
 * an optional release note that gets stored on the agentflow_version row.
 */
const PublishAgentflowDialog = ({ show, currentVersion, onCancel, onConfirm }) => {
    const portalElement = document.getElementById('portal')
    const [notes, setNotes] = useState('')

    if (!show) return null

    const nextVersion = (currentVersion ?? 0) + 1

    const component = (
        <Dialog open={show} fullWidth maxWidth='sm' onClose={onCancel} aria-labelledby='publish-dialog-title'>
            <DialogTitle sx={{ fontSize: '1rem' }} id='publish-dialog-title'>
                Publish v{nextVersion}
            </DialogTitle>
            <DialogContent>
                <Typography variant='body2' sx={{ mb: 2 }}>
                    Publishing snapshots the current draft as version {nextVersion} and serves it to all production traffic. The draft on
                    the canvas is unaffected.
                </Typography>
                <OutlinedInput
                    multiline
                    rows={3}
                    fullWidth
                    placeholder='Release notes (optional)'
                    value={notes}
                    onChange={(e) => setNotes(e.target.value.slice(0, NOTES_MAX))}
                />
                <Typography variant='caption' color='text.secondary'>
                    {notes.length} / {NOTES_MAX}
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={onCancel}>Cancel</Button>
                <StyledButton variant='contained' onClick={() => onConfirm({ notes: notes.trim() || undefined })}>
                    Publish
                </StyledButton>
            </DialogActions>
        </Dialog>
    )

    return createPortal(component, portalElement)
}

PublishAgentflowDialog.propTypes = {
    show: PropTypes.bool,
    currentVersion: PropTypes.number,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func
}

export default PublishAgentflowDialog
