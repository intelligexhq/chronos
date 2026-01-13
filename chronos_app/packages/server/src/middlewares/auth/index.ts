/**
 * Simple Authentication Middleware
 */

import { Request, Response, NextFunction } from 'express'
import { AuthService } from '../../services/auth'

declare global {
    namespace Express {
        interface Request {
            userId?: string
            userEmail?: string
        }
    }
}

/**
 * Middleware that requires authentication.
 * Returns 401 if no valid token is present.
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const authService = new AuthService()
    const token = req.cookies?.auth_token || req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' })
    }

    const payload = authService.verifyToken(token)
    if (!payload) {
        return res.status(401).json({ error: 'Invalid or expired token' })
    }

    req.userId = payload.userId
    req.userEmail = payload.email
    next()
}

/**
 * Middleware that optionally extracts user info from token.
 * Does not require authentication - allows request to continue even without token.
 */
export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const authService = new AuthService()
    const token = req.cookies?.auth_token || req.headers.authorization?.replace('Bearer ', '')

    if (token) {
        const payload = authService.verifyToken(token)
        if (payload) {
            req.userId = payload.userId
            req.userEmail = payload.email
        }
    }
    next()
}

/**
 * Verify token and return payload (used internally)
 */
export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
    const authService = new AuthService()
    const token = req.cookies?.auth_token || req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized Access' })
    }

    const payload = authService.verifyToken(token)
    if (!payload) {
        return res.status(401).json({ error: 'Unauthorized Access' })
    }

    req.userId = payload.userId
    req.userEmail = payload.email
    next()
}
