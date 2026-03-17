import PropTypes from 'prop-types'
import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import axios from 'axios'

// material-ui
import { useTheme } from '@mui/material/styles'
import { Box, Drawer, Typography, useMediaQuery } from '@mui/material'

// third-party
import PerfectScrollbar from 'react-perfect-scrollbar'
import { BrowserView, MobileView } from 'react-device-detect'

// project imports
import MenuList from './MenuList'
import LogoSection from '../LogoSection'
// store
import { baseURL, drawerWidth, headerHeight } from '@/store/constant'

// ==============================|| SIDEBAR DRAWER ||============================== //

const Sidebar = ({ drawerOpen, drawerToggle, window }) => {
    const theme = useTheme()
    const matchUpMd = useMediaQuery(theme.breakpoints.up('md'))
    const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)
    const [version, setVersion] = useState('')

    useEffect(() => {
        axios
            .get(`${baseURL}/api/v1/version`, {
                withCredentials: true,
                headers: { 'Content-type': 'application/json', 'x-request-from': 'internal' }
            })
            .then((response) => {
                setVersion(response.data.version)
            })
            .catch((error) => {
                console.error('Error fetching version:', error)
            })
    }, [])

    const drawer = (
        <>
            <Box
                sx={{
                    display: { xs: 'block', md: 'none' },
                    height: '80px'
                }}
            >
                <Box sx={{ display: 'flex', p: 2, mx: 'auto' }}>
                    <LogoSection />
                </Box>
            </Box>
            <BrowserView>
                <PerfectScrollbar
                    component='div'
                    style={{
                        height: !matchUpMd ? 'calc(100vh - 56px)' : `calc(100vh - ${headerHeight}px)`,
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    <MenuList />
                    {version && (
                        <Typography variant='caption' sx={{ mt: 'auto', p: 2, color: theme.palette.text.secondary }}>
                            chronos v{version}
                        </Typography>
                    )}
                </PerfectScrollbar>
            </BrowserView>
            <MobileView>
                <Box sx={{ px: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <MenuList />
                    {version && (
                        <Typography variant='caption' sx={{ mt: 'auto', p: 2, color: theme.palette.text.secondary }}>
                            chronos v{version}
                        </Typography>
                    )}
                </Box>
            </MobileView>
        </>
    )

    const container = window !== undefined ? () => window.document.body : undefined

    return (
        <Box
            component='nav'
            sx={{
                flexShrink: { md: 0 },
                width: matchUpMd ? drawerWidth : 'auto'
            }}
            aria-label='mailbox folders'
        >
            {isAuthenticated && (
                <Drawer
                    container={container}
                    variant={matchUpMd ? 'persistent' : 'temporary'}
                    anchor='left'
                    open={drawerOpen}
                    onClose={drawerToggle}
                    sx={{
                        '& .MuiDrawer-paper': {
                            width: drawerWidth,
                            background: theme.palette.background.default,
                            color: theme.palette.text.primary,
                            [theme.breakpoints.up('md')]: {
                                top: `${headerHeight}px`
                            },
                            borderRight: drawerOpen ? '1px solid' : 'none',
                            borderColor: drawerOpen ? theme.palette.grey[900] + 25 : 'transparent'
                        }
                    }}
                    ModalProps={{ keepMounted: true }}
                    color='inherit'
                >
                    {drawer}
                </Drawer>
            )}
        </Box>
    )
}

Sidebar.propTypes = {
    drawerOpen: PropTypes.bool,
    drawerToggle: PropTypes.func,
    window: PropTypes.object
}

export default Sidebar
