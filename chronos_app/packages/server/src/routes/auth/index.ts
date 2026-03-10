/**
 * Simple Authentication Routes
 */

import express, { Request, Response } from 'express'
import { AuthService } from '../../services/auth'
import oauthClientService from '../../services/oauth-client'

const router = express.Router()

// POST /api/v1/auth/signup
router.post('/signup', async (req: Request, res: Response) => {
    try {
        const authService = new AuthService()
        const result = await authService.signup(req.body)

        // Set HTTP-only cookie
        res.cookie('auth_token', result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        })

        res.json(result)
    } catch (error: any) {
        res.status(400).json({ error: error.message })
    }
})

// POST /api/v1/auth/login
router.post('/login', async (req: Request, res: Response) => {
    try {
        const authService = new AuthService()
        const result = await authService.login(req.body)

        // Set HTTP-only cookie
        res.cookie('auth_token', result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        })

        res.json(result)
    } catch (error: any) {
        res.status(401).json({ error: error.message })
    }
})

// POST /api/v1/auth/logout
router.post('/logout', (_req: Request, res: Response) => {
    res.clearCookie('auth_token')
    res.json({ message: 'Logged out successfully' })
})

// GET /api/v1/auth/me
router.get('/me', async (req: Request, res: Response) => {
    try {
        const authService = new AuthService()
        const token = req.cookies?.auth_token || req.headers.authorization?.replace('Bearer ', '')

        if (!token) {
            return res.status(401).json({ error: 'Not authenticated' })
        }

        const payload = authService.verifyToken(token)
        if (!payload) {
            return res.status(401).json({ error: 'Invalid token' })
        }

        const user = await authService.getCurrentUser(payload.userId)
        if (!user) {
            return res.status(401).json({ error: 'User not found' })
        }

        res.json({ user })
    } catch (error: any) {
        res.status(401).json({ error: error.message })
    }
})

// POST /api/v1/auth/token — OAuth2 Client Credentials grant
router.post('/token', async (req: Request, res: Response) => {
    try {
        const { grant_type, client_id, client_secret } = req.body

        if (grant_type !== 'client_credentials') {
            return res
                .status(400)
                .json({ error: 'unsupported_grant_type', error_description: 'Only client_credentials grant type is supported' })
        }

        if (!client_id || !client_secret) {
            return res.status(400).json({ error: 'invalid_request', error_description: 'client_id and client_secret are required' })
        }

        const client = await oauthClientService.verifyClientCredentials(client_id, client_secret)
        const authService = new AuthService()
        const tokenResponse = authService.generateClientToken(client)

        res.json({
            access_token: tokenResponse.accessToken,
            token_type: tokenResponse.tokenType,
            expires_in: tokenResponse.expiresIn
        })
    } catch (error: any) {
        const status = error.statusCode === 401 ? 401 : 500
        res.status(status).json({ error: 'invalid_client', error_description: error.message })
    }
})

export default router
