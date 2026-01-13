/**
 * Simple Authentication Routes
 */

import express, { Request, Response } from 'express'
import { AuthService } from '../../services/auth'

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

export default router
