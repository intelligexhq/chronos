/**
 * Simple RequireAuth Component
 */

import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'
import { Navigate } from 'react-router'
import { useLocation } from 'react-router-dom'

export const RequireAuth = ({ children }) => {
    const location = useLocation()
    const currentUser = useSelector((state) => state.auth.user)
    const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)

    // Redirect to login if user is not authenticated
    if (!isAuthenticated || !currentUser) {
        return <Navigate to='/login' replace state={{ path: location.pathname }} />
    }

    // User is authenticated, render children
    return children
}

RequireAuth.propTypes = {
    children: PropTypes.element
}
