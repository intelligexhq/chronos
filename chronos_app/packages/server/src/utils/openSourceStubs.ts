/**
 * Open Source Stubs
 * These functions replace enterprise functionality with simple pass-through implementations
 * for the open source version.
 */

import { Request, Response, NextFunction } from 'express'

/**
 * Stub permission check middleware that always allows access.
 * In the open source version, all authenticated users have full access.
 * @param _permission - Ignored permission string
 * @returns Express middleware that passes through
 */
export const checkPermission = (_permission: string) => {
    return (_req: Request, _res: Response, next: NextFunction) => {
        next()
    }
}

/**
 * Stub permission check middleware that always allows access.
 * In the open source version, all authenticated users have full access.
 * @param _permissions - Ignored comma-separated permission string
 * @returns Express middleware that passes through
 */
export const checkAnyPermission = (_permissions: string) => {
    return (_req: Request, _res: Response, next: NextFunction) => {
        next()
    }
}

/**
 * Returns empty search options since workspaces are not used in open source.
 * @param _workspaceId - Ignored workspace ID for compatibility
 * @returns Empty object
 */
export const getWorkspaceSearchOptions = (_workspaceId?: string): Record<string, any> => {
    return {}
}

/**
 * Returns empty search options from request since workspaces are not used in open source.
 * @param _req - Express request (ignored)
 * @returns Empty object
 */
export const getWorkspaceSearchOptionsFromReq = (_req: Request): Record<string, any> => {
    return {}
}
