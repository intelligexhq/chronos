import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'

import {
    Box,
    Stack,
    ButtonGroup,
    Skeleton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    Switch,
    IconButton,
    Tooltip,
    useTheme,
    TableSortLabel
} from '@mui/material'
import MainCard from '@/ui-component/cards/MainCard'
import ScheduleDialog from './ScheduleDialog'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import ErrorBoundary from '@/ErrorBoundary'
import { StyledPermissionButton } from '@/ui-component/button/RBACButtons'
import TablePagination, { DEFAULT_ITEMS_PER_PAGE } from '@/ui-component/pagination/TablePagination'

import schedulesApi from '@/api/schedules'

import useApi from '@/hooks/useApi'
import { useError } from '@/store/context/ErrorContext'
import { useDispatch } from 'react-redux'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'
import useNotifier from '@/utils/useNotifier'

import { IconPlus, IconEdit, IconX } from '@tabler/icons-react'
import ToolEmptySVG from '@/assets/images/tools_empty.svg'
import { Button } from '@mui/material'

const Schedules = () => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const getAllSchedulesApi = useApi(schedulesApi.getAllSchedules)
    const { error, setError } = useError()
    const dispatch = useDispatch()

    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [isLoading, setLoading] = useState(true)
    const [showDialog, setShowDialog] = useState(false)
    const [dialogProps, setDialogProps] = useState({})

    const [currentPage, setCurrentPage] = useState(1)
    const [pageLimit, setPageLimit] = useState(DEFAULT_ITEMS_PER_PAGE)
    const [total, setTotal] = useState(0)

    const [order, setOrder] = useState(localStorage.getItem('schedules_order') || 'asc')
    const [orderBy, setOrderBy] = useState(localStorage.getItem('schedules_orderBy') || 'name')

    /**
     * Handles toggling sort order and sort column for the schedules table.
     * @param {string} property - The column property to sort by
     */
    const handleRequestSort = (property) => {
        const isAsc = orderBy === property && order === 'asc'
        const newOrder = isAsc ? 'desc' : 'asc'
        setOrder(newOrder)
        setOrderBy(property)
        localStorage.setItem('schedules_order', newOrder)
        localStorage.setItem('schedules_orderBy', property)
    }

    /**
     * Sorts schedules data by the selected column and direction.
     * @param {Array} data - The filtered schedules array
     * @returns {Array} Sorted schedules array
     */
    const sortSchedules = (data) => {
        return [...data].sort((a, b) => {
            if (orderBy === 'name') {
                return order === 'asc' ? (a.name || '').localeCompare(b.name || '') : (b.name || '').localeCompare(a.name || '')
            } else if (orderBy === 'lastRunDate') {
                return order === 'asc'
                    ? new Date(a.lastRunDate || 0) - new Date(b.lastRunDate || 0)
                    : new Date(b.lastRunDate || 0) - new Date(a.lastRunDate || 0)
            } else if (orderBy === 'nextRunDate') {
                return order === 'asc'
                    ? new Date(a.nextRunDate || 0) - new Date(b.nextRunDate || 0)
                    : new Date(b.nextRunDate || 0) - new Date(a.nextRunDate || 0)
            }
            return 0
        })
    }

    const onChange = (page, pageLimit) => {
        setCurrentPage(page)
        setPageLimit(pageLimit)
        refresh(page, pageLimit)
    }

    const refresh = (page, limit) => {
        getAllSchedulesApi.request(page || currentPage, limit || pageLimit)
    }

    const addNew = () => {
        const dialogProp = {
            title: 'Add New Schedule',
            type: 'ADD',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Add'
        }
        setDialogProps(dialogProp)
        setShowDialog(true)
    }

    const edit = (schedule) => {
        const dialogProp = {
            title: 'Edit Schedule',
            type: 'EDIT',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Save',
            data: schedule
        }
        setDialogProps(dialogProp)
        setShowDialog(true)
    }

    const onConfirm = () => {
        setShowDialog(false)
        refresh(currentPage, pageLimit)
    }

    const handleToggle = async (schedule) => {
        try {
            await schedulesApi.toggleSchedule(schedule.id, !schedule.enabled)
            refresh(currentPage, pageLimit)
        } catch (err) {
            if (setError) setError(err)
            enqueueSnackbar({
                message: 'Failed to toggle schedule',
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error',
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
        }
    }

    const [search, setSearch] = useState('')
    const onSearchChange = (event) => {
        setSearch(event.target.value)
    }

    function filterSchedules(data) {
        return data.name.toLowerCase().indexOf(search.toLowerCase()) > -1 || data.cronExpression.indexOf(search) > -1
    }

    useEffect(() => {
        refresh(currentPage, pageLimit)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        setLoading(getAllSchedulesApi.loading)
    }, [getAllSchedulesApi.loading])

    useEffect(() => {
        if (getAllSchedulesApi.data) {
            setTotal(getAllSchedulesApi.data.total)
        }
    }, [getAllSchedulesApi.data])

    const formatDate = (dateStr) => {
        if (!dateStr) return '-'
        return new Date(dateStr).toLocaleString()
    }

    return (
        <>
            <MainCard>
                {error ? (
                    <ErrorBoundary error={error} />
                ) : (
                    <Stack flexDirection='column' sx={{ gap: 3 }}>
                        <ViewHeader
                            onSearchChange={onSearchChange}
                            search={true}
                            searchPlaceholder='Search Schedules'
                            title='Schedules'
                            description='Cron-based scheduled execution of agentflows'
                        >
                            <ButtonGroup disableElevation aria-label='outlined primary button group'>
                                <StyledPermissionButton
                                    permissionId={'schedules:create'}
                                    variant='contained'
                                    onClick={addNew}
                                    startIcon={<IconPlus />}
                                    sx={{ borderRadius: 2, height: 40 }}
                                >
                                    Create
                                </StyledPermissionButton>
                            </ButtonGroup>
                        </ViewHeader>
                        {isLoading && (
                            <Box>
                                <Skeleton variant='rounded' height={200} />
                            </Box>
                        )}
                        {!isLoading && total > 0 && (
                            <>
                                <TableContainer component={Paper} variant='outlined'>
                                    <Table>
                                        <TableHead
                                            sx={{
                                                backgroundColor: customization.isDarkMode
                                                    ? theme.palette.common.black
                                                    : theme.palette.grey[100],
                                                height: 56
                                            }}
                                        >
                                            <TableRow>
                                                <TableCell>
                                                    <TableSortLabel
                                                        active={orderBy === 'name'}
                                                        direction={order}
                                                        onClick={() => handleRequestSort('name')}
                                                    >
                                                        Name
                                                    </TableSortLabel>
                                                </TableCell>
                                                <TableCell>Cron</TableCell>
                                                <TableCell>Timezone</TableCell>
                                                <TableCell>Enabled</TableCell>
                                                <TableCell>
                                                    <TableSortLabel
                                                        active={orderBy === 'lastRunDate'}
                                                        direction={order}
                                                        onClick={() => handleRequestSort('lastRunDate')}
                                                    >
                                                        Last Run
                                                    </TableSortLabel>
                                                </TableCell>
                                                <TableCell>
                                                    <TableSortLabel
                                                        active={orderBy === 'nextRunDate'}
                                                        direction={order}
                                                        onClick={() => handleRequestSort('nextRunDate')}
                                                    >
                                                        Next Run
                                                    </TableSortLabel>
                                                </TableCell>
                                                <TableCell>Status</TableCell>
                                                <TableCell align='right'>Actions</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {sortSchedules(getAllSchedulesApi.data?.data?.filter(filterSchedules) || []).map((schedule) => (
                                                <TableRow key={schedule.id}>
                                                    <TableCell>{schedule.name}</TableCell>
                                                    <TableCell>
                                                        <code>{schedule.cronExpression}</code>
                                                    </TableCell>
                                                    <TableCell>{schedule.timezone}</TableCell>
                                                    <TableCell>
                                                        <Switch
                                                            checked={schedule.enabled}
                                                            onChange={() => handleToggle(schedule)}
                                                            size='small'
                                                        />
                                                    </TableCell>
                                                    <TableCell>{formatDate(schedule.lastRunDate)}</TableCell>
                                                    <TableCell>{formatDate(schedule.nextRunDate)}</TableCell>
                                                    <TableCell>
                                                        {schedule.lastRunStatus ? (
                                                            <Chip
                                                                label={schedule.lastRunStatus}
                                                                size='small'
                                                                color={schedule.lastRunStatus === 'FINISHED' ? 'success' : 'error'}
                                                            />
                                                        ) : (
                                                            '-'
                                                        )}
                                                    </TableCell>
                                                    <TableCell align='right'>
                                                        <Tooltip title='Edit'>
                                                            <IconButton size='small' onClick={() => edit(schedule)}>
                                                                <IconEdit size={18} />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                                <TablePagination currentPage={currentPage} limit={pageLimit} total={total} onChange={onChange} />
                            </>
                        )}
                        {!isLoading && total === 0 && (
                            <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                                <Box sx={{ p: 2, height: 'auto' }}>
                                    <img
                                        style={{ objectFit: 'cover', height: '20vh', width: 'auto' }}
                                        src={ToolEmptySVG}
                                        alt='SchedulesEmptySVG'
                                    />
                                </Box>
                                <div>No Schedules Created Yet</div>
                            </Stack>
                        )}
                    </Stack>
                )}
            </MainCard>
            <ScheduleDialog
                show={showDialog}
                dialogProps={dialogProps}
                onCancel={() => setShowDialog(false)}
                onConfirm={onConfirm}
                setError={setError}
            />
        </>
    )
}

export default Schedules
