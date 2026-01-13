import client from '@/api/client'

/**
 * Simple Account API
 */

// Use the new simple auth endpoints
const registerAccount = (body) => client.post(`/auth/signup`, body)
const logout = () => client.post('/auth/logout')

// TODO: These could be implemented later if needed
const forgotPassword = (body) => client.post('/auth/forgot-password', body)
const resetPassword = (body) => client.post('/auth/reset-password', body)

export default {
    registerAccount,
    forgotPassword,
    resetPassword,
    logout
}
