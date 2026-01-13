/**
 * Simple Registration Page
 */

import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

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

// ==============================|| RegisterPage ||============================== //

const RegisterPage = () => {
    const theme = useTheme()
    useNotifier()
    const navigate = useNavigate()

    const nameInput = {
        label: 'Name',
        name: 'name',
        type: 'text',
        placeholder: 'John Doe'
    }
    const emailInput = {
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
    const confirmPasswordInput = {
        label: 'Confirm Password',
        name: 'confirmPassword',
        type: 'password',
        placeholder: '********'
    }

    const [nameVal, setNameVal] = useState('')
    const [emailVal, setEmailVal] = useState('')
    const [passwordVal, setPasswordVal] = useState('')
    const [confirmPasswordVal, setConfirmPasswordVal] = useState('')
    const [error, setError] = useState(undefined)
    const [loading, setLoading] = useState(false)

    const signupApi = useApi(authApi.signup)

    const doRegister = (event) => {
        event.preventDefault()
        setError(undefined)

        // Validate passwords match
        if (passwordVal !== confirmPasswordVal) {
            setError('Passwords do not match')
            return
        }

        // Validate password length
        if (passwordVal.length < 8) {
            setError('Password must be at least 8 characters long')
            return
        }

        setLoading(true)
        const body = {
            name: nameVal,
            email: emailVal,
            password: passwordVal
        }
        signupApi.request(body)
    }

    useEffect(() => {
        if (signupApi.error) {
            setLoading(false)
            setError(signupApi.error.response?.data?.error || signupApi.error.message || 'Registration failed')
        }
    }, [signupApi.error])

    useEffect(() => {
        if (signupApi.data) {
            setLoading(false)
            // Auto-login after successful registration
            store.dispatch(loginSuccess(signupApi.data))
            navigate('/')
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [signupApi.data])

    const isFormValid = nameVal && emailVal && passwordVal && confirmPasswordVal

    return (
        <>
            <MainCard>
                <Stack flexDirection='column' sx={{ width: '480px', gap: 3 }}>
                    {error && (
                        <Alert icon={<IconExclamationCircle />} variant='filled' severity='error'>
                            {error}
                        </Alert>
                    )}
                    <Stack sx={{ gap: 1 }}>
                        <Typography variant='h1'>Create Account</Typography>
                        <Typography variant='body2' sx={{ color: theme.palette.grey[600] }}>
                            Already have an account?{' '}
                            <Link style={{ color: theme.palette.primary.main }} to='/login'>
                                Sign in
                            </Link>
                            .
                        </Typography>
                    </Stack>
                    <form onSubmit={doRegister}>
                        <Stack sx={{ width: '100%', flexDirection: 'column', alignItems: 'left', justifyContent: 'center', gap: 2 }}>
                            <Box>
                                <div style={{ display: 'flex', flexDirection: 'row' }}>
                                    <Typography>
                                        Name<span style={{ color: 'red' }}>&nbsp;*</span>
                                    </Typography>
                                    <div style={{ flexGrow: 1 }}></div>
                                </div>
                                <Input
                                    inputParam={nameInput}
                                    onChange={(newValue) => setNameVal(newValue)}
                                    value={nameVal}
                                    showDialog={false}
                                />
                            </Box>
                            <Box>
                                <div style={{ display: 'flex', flexDirection: 'row' }}>
                                    <Typography>
                                        Email<span style={{ color: 'red' }}>&nbsp;*</span>
                                    </Typography>
                                    <div style={{ flexGrow: 1 }}></div>
                                </div>
                                <Input
                                    inputParam={emailInput}
                                    onChange={(newValue) => setEmailVal(newValue)}
                                    value={emailVal}
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
                                <Typography variant='caption'>
                                    <i>Password must be at least 8 characters long.</i>
                                </Typography>
                            </Box>
                            <Box>
                                <div style={{ display: 'flex', flexDirection: 'row' }}>
                                    <Typography>
                                        Confirm Password<span style={{ color: 'red' }}>&nbsp;*</span>
                                    </Typography>
                                    <div style={{ flexGrow: 1 }}></div>
                                </div>
                                <Input
                                    inputParam={confirmPasswordInput}
                                    onChange={(newValue) => setConfirmPasswordVal(newValue)}
                                    value={confirmPasswordVal}
                                    showDialog={false}
                                />
                            </Box>
                            <StyledButton
                                variant='contained'
                                style={{ borderRadius: 12, height: 40 }}
                                disabled={!isFormValid}
                                type='submit'
                            >
                                Create Account
                            </StyledButton>
                        </Stack>
                    </form>
                </Stack>
            </MainCard>
            <BackdropLoader open={loading} />
        </>
    )
}

export default RegisterPage
