import client from './client'

/**
 * Simple Authentication API
 */

// Simple auth endpoints
const signup = (body) => client.post(`/auth/signup`, body)
const login = (body) => client.post(`/auth/login`, body)
const logout = () => client.post(`/auth/logout`)
const getCurrentUser = () => client.get(`/auth/me`)

// Legacy endpoints (kept for compatibility during migration)
const resolveLogin = (body) => client.post(`/auth/login`, body) // Redirect to login

export default {
    signup,
    login,
    logout,
    getCurrentUser,
    resolveLogin
}
