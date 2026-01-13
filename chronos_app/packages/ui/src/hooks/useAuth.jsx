/**
 * Simple useAuth Hook
 */

import { useSelector } from 'react-redux'

export const useAuth = () => {
    const currentUser = useSelector((state) => state.auth.user)
    const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)

    // Simple permission check - always returns true for open source
    const hasPermission = () => {
        return true
    }

    // Simple display flag check - always returns true for open source
    const hasDisplay = () => {
        return true
    }

    // Simple workspace check - always returns true for open source (no workspace restrictions)
    const hasAssignedWorkspace = () => {
        return true
    }

    return {
        currentUser,
        isAuthenticated,
        hasPermission,
        hasDisplay,
        hasAssignedWorkspace
    }
}
