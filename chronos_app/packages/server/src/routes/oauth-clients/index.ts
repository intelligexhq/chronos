/**
 * OAuth Client Management Routes (admin-only, for UI access via JWT auth).
 * These routes provide the same OAuth client CRUD as /admin/oauth-clients,
 * but authenticated via the standard JWT (internal UI requests).
 */

import express, { Request, Response } from 'express'
import { authMiddleware, requireRole } from '../../middlewares/auth'
import { UserRole } from '../../database/entities/User'
import oauthClientService from '../../services/oauth-client'

const router = express.Router()

// All routes require authentication + admin role
router.use(authMiddleware)
router.use(requireRole(UserRole.ADMIN))

/**
 * GET /api/v1/oauth-clients
 * List all OAuth clients (secrets excluded)
 */
router.get('/', async (_req: Request, res: Response) => {
    try {
        const data = await oauthClientService.getAllOAuthClients()
        res.json(data)
    } catch (error: any) {
        res.status(500).json({ error: error.message })
    }
})

/**
 * POST /api/v1/oauth-clients
 * Create a new OAuth client. Secret is returned only once.
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const { clientName, scopes } = req.body
        const data = await oauthClientService.createOAuthClient(clientName, scopes)
        res.status(201).json(data)
    } catch (error: any) {
        const status = error.statusCode || 500
        res.status(status).json({ error: error.message })
    }
})

/**
 * PUT /api/v1/oauth-clients/:id
 * Update an OAuth client's name or scopes.
 */
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const data = await oauthClientService.updateOAuthClient(req.params.id, req.body)
        res.json(data)
    } catch (error: any) {
        const status = error.statusCode || 500
        res.status(status).json({ error: error.message })
    }
})

/**
 * DELETE /api/v1/oauth-clients/:id
 * Delete an OAuth client.
 */
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        await oauthClientService.deleteOAuthClient(req.params.id)
        res.json({ success: true })
    } catch (error: any) {
        const status = error.statusCode || 500
        res.status(status).json({ error: error.message })
    }
})

export default router
