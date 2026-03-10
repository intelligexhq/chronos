/**
 * Simple Authentication Service
 */

import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { User, UserStatus, UserRole } from '../../database/entities/User'
import { getDataSource } from '../../DataSource'
import { SignupRequest, LoginRequest, AuthResponse, SimpleUser, ClientTokenPayload } from '../../Interface.Auth'
import { OAuthClient } from '../../database/entities/OAuthClient'

export class AuthService {
    private static readonly SALT_ROUNDS = 10
    private static readonly JWT_SECRET = process.env.JWT_AUTH_TOKEN_SECRET || 'chronos-auth-secret-key'
    private static readonly JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '7d'
    private static readonly CLIENT_TOKEN_EXPIRES_IN: string = process.env.CLIENT_TOKEN_EXPIRES_IN || '1h'

    async signup(data: SignupRequest): Promise<AuthResponse> {
        const { email, password, name } = data

        if (!email || !password) {
            throw new Error('Email and password are required')
        }

        const userRepo = getDataSource().getRepository(User)

        // Check if user exists
        const existingUser = await userRepo.findOne({ where: { email: email.toLowerCase() } })
        if (existingUser) {
            throw new Error('User with this email already exists')
        }

        // Validate password strength
        if (password.length < 8) {
            throw new Error('Password must be at least 8 characters long')
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, AuthService.SALT_ROUNDS)

        // Assign admin role if this is the first user, otherwise user role
        const userCount = await userRepo.count()
        const assignedRole = userCount === 0 ? UserRole.ADMIN : UserRole.USER

        // Create user
        const user = new User()
        user.id = uuidv4()
        user.email = email.toLowerCase()
        user.password = hashedPassword
        user.name = name || ''
        user.status = UserStatus.ACTIVE
        user.role = assignedRole

        await userRepo.save(user)

        // Generate token
        const token = this.generateToken(user)

        return {
            user: this.toSimpleUser(user),
            token
        }
    }

    async login(data: LoginRequest): Promise<AuthResponse> {
        const { email, password } = data

        if (!email || !password) {
            throw new Error('Email and password are required')
        }

        const userRepo = getDataSource().getRepository(User)

        const user = await userRepo.findOne({ where: { email: email.toLowerCase() } })
        if (!user) {
            throw new Error('Invalid email or password')
        }

        if (user.status !== UserStatus.ACTIVE) {
            throw new Error('Account is not active')
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.password)
        if (!isValid) {
            throw new Error('Invalid email or password')
        }

        // Generate token
        const token = this.generateToken(user)

        return {
            user: this.toSimpleUser(user),
            token
        }
    }

    async getCurrentUser(userId: string): Promise<SimpleUser | null> {
        const userRepo = getDataSource().getRepository(User)
        const user = await userRepo.findOne({ where: { id: userId } })
        return user ? this.toSimpleUser(user) : null
    }

    verifyToken(token: string): { userId: string; email: string; role: string } | null {
        try {
            const payload = jwt.verify(token, AuthService.JWT_SECRET) as { userId: string; email: string; role: string }
            if (!payload.userId) return null
            return { userId: payload.userId, email: payload.email, role: payload.role }
        } catch {
            return null
        }
    }

    /**
     * Verify a JWT and extract client credentials payload.
     * @param {string} token - JWT token to verify
     * @returns {ClientTokenPayload | null} The client payload or null if invalid/not a client token
     */
    verifyClientToken(token: string): ClientTokenPayload | null {
        try {
            const payload = jwt.verify(token, AuthService.JWT_SECRET) as ClientTokenPayload
            if (payload.grantType !== 'client_credentials') return null
            return { clientId: payload.clientId, scopes: payload.scopes, grantType: payload.grantType }
        } catch {
            return null
        }
    }

    /**
     * Generate a JWT for an OAuth client with scopes embedded.
     * @param {OAuthClient} client - The verified OAuth client entity
     * @returns {{ accessToken: string; tokenType: string; expiresIn: string }} Token response
     */
    generateClientToken(client: OAuthClient): { accessToken: string; tokenType: string; expiresIn: string } {
        const scopes: string[] = client.scopes ? JSON.parse(client.scopes) : []
        const accessToken = jwt.sign({ clientId: client.clientId, scopes, grantType: 'client_credentials' }, AuthService.JWT_SECRET, {
            expiresIn: AuthService.CLIENT_TOKEN_EXPIRES_IN
        } as jwt.SignOptions)
        return {
            accessToken,
            tokenType: 'Bearer',
            expiresIn: AuthService.CLIENT_TOKEN_EXPIRES_IN
        }
    }

    private generateToken(user: User): string {
        return jwt.sign({ userId: user.id, email: user.email, role: user.role }, AuthService.JWT_SECRET, {
            expiresIn: AuthService.JWT_EXPIRES_IN
        } as jwt.SignOptions)
    }

    private toSimpleUser(user: User): SimpleUser {
        return {
            id: user.id,
            email: user.email,
            name: user.name || undefined,
            status: user.status,
            role: user.role
        }
    }
}
