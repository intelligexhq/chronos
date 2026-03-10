/**
 * Admin Authentication Middleware — validates OAuth2 client credential JWTs and enforces scopes.
 */

import { Request, Response, NextFunction } from 'express'
import { AuthService } from '../services/auth'
import { AdminScope } from '../Interface'
import { ClientTokenPayload } from '../Interface.Auth'

declare global {
    namespace Express {
        interface Request {
            adminClient?: ClientTokenPayload
        }
    }
}

/**
 * Middleware that authenticates admin requests using a client credentials JWT.
 * Extracts Bearer token from the Authorization header, verifies it as a client token,
 * and attaches the client payload to req.adminClient.
 */
export const adminAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Missing or invalid Authorization header' })
    }

    const token = authHeader.substring(7)
    const authService = new AuthService()
    const clientPayload = authService.verifyClientToken(token)

    if (!clientPayload) {
        return res.status(401).json({ success: false, error: 'Invalid or expired token' })
    }

    req.adminClient = clientPayload
    next()
}

/**
 * Middleware factory that enforces scope-based access control.
 * Must be used after adminAuthMiddleware so req.adminClient is available.
 * Grants access if the client has admin:full or any of the required scopes.
 * @param requiredScopes - One or more scopes the client must have
 */
export const requireScope = (...requiredScopes: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const clientScopes = req.adminClient?.scopes || []

        if (clientScopes.includes(AdminScope.ADMIN_FULL)) {
            return next()
        }

        const hasScope = requiredScopes.some((scope) => clientScopes.includes(scope))
        if (!hasScope) {
            return res.status(403).json({ success: false, error: `Forbidden: requires one of [${requiredScopes.join(', ')}]` })
        }

        next()
    }
}
