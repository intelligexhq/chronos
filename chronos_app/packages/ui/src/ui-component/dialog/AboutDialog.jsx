import { createPortal } from 'react-dom'
import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { Dialog, DialogContent, DialogTitle, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Paper } from '@mui/material'
import moment from 'moment'
import axios from 'axios'
import { baseURL } from '@/store/constant'

const AboutDialog = ({ show, onCancel }) => {
    const portalElement = document.getElementById('portal')

    const [data, setData] = useState({})

    useEffect(() => {
        if (show) {
            axios
                .get(`${baseURL}/api/v1/version`, {
                    withCredentials: true,
                    headers: { 'Content-type': 'application/json', 'x-request-from': 'internal' }
                })
                .then((response) => {
                    const version = response.data.version
                    setData({
                        currentVersion: version,
                        name: version,
                        published_at: new Date().toISOString()
                    })
                })
                .catch((error) => {
                    console.error('Error fetching version:', error)
                })
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show])

    const component = show ? (
        <Dialog
            onClose={onCancel}
            open={show}
            fullWidth
            maxWidth='sm'
            aria-labelledby='alert-dialog-title'
            aria-describedby='alert-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='alert-dialog-title'>
                Chronos Version
            </DialogTitle>
            <DialogContent>
                {data && (
                    <TableContainer component={Paper}>
                        <Table aria-label='simple table'>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Current Version</TableCell>
                                    <TableCell>Latest Version</TableCell>
                                    <TableCell>Published At</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                    <TableCell component='th' scope='row'>
                                        {data.currentVersion}
                                    </TableCell>
                                    <TableCell component='th' scope='row'>
                                        {data.name}
                                    </TableCell>
                                    <TableCell>{moment(data.published_at).fromNow()}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </DialogContent>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

AboutDialog.propTypes = {
    show: PropTypes.bool,
    onCancel: PropTypes.func
}

export default AboutDialog
