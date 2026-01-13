/**
 * Simple Sign In Page
 */

import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

// material-ui
import { Stack, useTheme, Typography, Box, Alert } from '@mui/material'
import { IconExclamationCircle } from '@tabler/icons-react'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import { Input } from '@/ui-component/input/Input'
import { StyledButton } from '@/ui-component/button/StyledButton'
import { BackdropLoader } from '@/ui-component/loading/BackdropLoader'

// Hooks
import useApi from '@/hooks/useApi'

// API
import authApi from '@/api/auth'

// utils
import useNotifier from '@/utils/useNotifier'

// store
import { loginSuccess } from '@/store/reducers/authSlice'
import { store } from '@/store'
import { useSelector } from 'react-redux'

// ==============================|| SignInPage ||============================== //

const SignInPage = () => {
    const theme = useTheme()
    useNotifier()

    const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)
    const navigate = useNavigate()

    const usernameInput = {
        label: 'Email',
        name: 'email',
        type: 'email',
        placeholder: 'user@company.com'
    }
    const passwordInput = {
        label: 'Password',
        name: 'password',
        type: 'password',
        placeholder: '********'
    }

    const [usernameVal, setUsernameVal] = useState('')
    const [passwordVal, setPasswordVal] = useState('')
    const [authError, setAuthError] = useState(undefined)
    const [loading, setLoading] = useState(false)

    const loginApi = useApi(authApi.login)
    const location = useLocation()

    const doLogin = (event) => {
        event.preventDefault()
        setAuthError(undefined)
        setLoading(true)
        const body = {
            email: usernameVal,
            password: passwordVal
        }
        loginApi.request(body)
    }

    useEffect(() => {
        if (loginApi.error) {
            setLoading(false)
            setAuthError(loginApi.error.response?.data?.error || loginApi.error.message || 'Login failed')
        }
    }, [loginApi.error])

    useEffect(() => {
        // Redirect to home if already authenticated
        if (isAuthenticated) {
            navigate(location.state?.path || '/')
        }
    }, [isAuthenticated, navigate, location.state?.path])

    useEffect(() => {
        if (loginApi.data) {
            setLoading(false)
            store.dispatch(loginSuccess(loginApi.data))
            navigate(location.state?.path || '/')
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loginApi.data])

    return (
        <>
            <MainCard>
                <Stack flexDirection='column' sx={{ width: '480px', gap: 3 }}>
                    {authError && (
                        <Alert icon={<IconExclamationCircle />} variant='filled' severity='error'>
                            {authError}
                        </Alert>
                    )}
                    <Stack sx={{ gap: 1 }}>
                        <Typography variant='h1'>Sign In</Typography>
                        <Typography variant='body2' sx={{ color: theme.palette.grey[600] }}>
                            Don&apos;t have an account?{' '}
                            <Link style={{ color: theme.palette.primary.main }} to='/signup'>
                                Sign up
                            </Link>
                            .
                        </Typography>
                    </Stack>
                    <form onSubmit={doLogin}>
                        <Stack sx={{ width: '100%', flexDirection: 'column', alignItems: 'left', justifyContent: 'center', gap: 2 }}>
                            <Box>
                                <div style={{ display: 'flex', flexDirection: 'row' }}>
                                    <Typography>
                                        Email<span style={{ color: 'red' }}>&nbsp;*</span>
                                    </Typography>
                                    <div style={{ flexGrow: 1 }}></div>
                                </div>
                                <Input
                                    inputParam={usernameInput}
                                    onChange={(newValue) => setUsernameVal(newValue)}
                                    value={usernameVal}
                                    showDialog={false}
                                />
                            </Box>
                            <Box>
                                <div style={{ display: 'flex', flexDirection: 'row' }}>
                                    <Typography>
                                        Password<span style={{ color: 'red' }}>&nbsp;*</span>
                                    </Typography>
                                    <div style={{ flexGrow: 1 }}></div>
                                </div>
                                <Input
                                    inputParam={passwordInput}
                                    onChange={(newValue) => setPasswordVal(newValue)}
                                    value={passwordVal}
                                    showDialog={false}
                                />
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                                <Link style={{ color: theme.palette.primary.main }} to='/forgot-password'>
                                    Forgot password?
                                </Link>
                            </Box>
                            <StyledButton
                                variant='contained'
                                style={{ borderRadius: 12, height: 40 }}
                                disabled={!usernameVal || !passwordVal}
                                type='submit'
                            >
                                Sign In
                            </StyledButton>
                        </Stack>
                    </form>
                </Stack>
            </MainCard>
            <BackdropLoader open={loading} />
        </>
    )
}

export default SignInPage
