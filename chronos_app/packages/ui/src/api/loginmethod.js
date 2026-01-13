import client from './client'

/**
 * Open source stub - SSO login methods not available
 * Returns empty providers list
 */
const getLoginMethods = () => client.get('/login-methods').catch(() => ({ data: { providers: [] } }))

export default {
    getLoginMethods
}
