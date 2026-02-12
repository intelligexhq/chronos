/**
 * Simple Authentication Redux Slice
 */

import { createSlice } from '@reduxjs/toolkit'
import AuthUtils from '@/utils/authUtils'

const initialState = {
    user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null,
    isAuthenticated: 'true' === localStorage.getItem('isAuthenticated'),
    token: localStorage.getItem('token') || null
}

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        loginSuccess: (state, action) => {
            AuthUtils.updateStateAndLocalStorage(state, action.payload)
        },
        logoutSuccess: (state) => {
            state.user = null
            state.token = null
            state.isAuthenticated = false
            AuthUtils.removeCurrentUser()
        },
        userProfileUpdated: (state, action) => {
            const user = AuthUtils.extractUser(action.payload)
            state.user.name = user.name
            state.user.email = user.email
            AuthUtils.updateCurrentUser(state.user)
        },
        // Stub for workspace switcher (no-op in open source)
        workspaceSwitchSuccess: () => {
            // Open source: No workspace switching
        },
        // Stub for subscription upgrade (no-op in open source)
        upgradePlanSuccess: () => {
            // Open source: No subscription plans
        },
        // Stub for workspace name update (no-op in open source)
        workspaceNameUpdated: () => {
            // Open source: No workspace functionality
        }
    }
})

export const { loginSuccess, logoutSuccess, userProfileUpdated, workspaceSwitchSuccess, upgradePlanSuccess, workspaceNameUpdated } =
    authSlice.actions
export default authSlice.reducer
