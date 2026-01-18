/**
 * Initialize the first user from environment variables.
 * This runs once on first container startup when no users exist.
 */

import { getDataSource } from '../DataSource'
import { User } from '../database/entities/User'
import { AuthService } from '../services/auth'
import logger from './logger'

/**
 * Configuration for initial user from environment variables
 */
interface InitialUserConfig {
    email: string
    password: string
    name?: string
}

/**
 * Get initial user configuration from environment variables.
 * @returns Configuration object or null if not configured
 */
function getInitialUserConfig(): InitialUserConfig | null {
    const email = process.env.CHRONOS_INITIAL_USER_EMAIL
    const password = process.env.CHRONOS_INITIAL_USER_PASSWORD
    const name = process.env.CHRONOS_INITIAL_USER_NAME

    if (!email || !password) {
        return null
    }

    return { email, password, name }
}

/**
 * Check if any users exist in the database.
 * @returns true if users exist, false if user table is empty
 */
async function hasExistingUsers(): Promise<boolean> {
    const userRepo = getDataSource().getRepository(User)
    const count = await userRepo.count()
    return count > 0
}

/**
 * Initialize the initial user from environment variables.
 *
 * This function:
 * 1. Checks if CHRONOS_INITIAL_USER_EMAIL and CHRONOS_INITIAL_USER_PASSWORD are set
 * 2. Checks if the user table is empty (first run)
 * 3. Creates the initial user if both conditions are met
 *
 * This ensures idempotent behavior - the user is only created once,
 * on the first container startup.
 */
export async function initializeInitialUser(): Promise<void> {
    const config = getInitialUserConfig()

    // If env vars not set, skip silently
    if (!config) {
        logger.debug('👤 [server]: No initial user configuration provided (CHRONOS_INITIAL_USER_EMAIL/PASSWORD not set)')
        return
    }

    // Check if users already exist
    const usersExist = await hasExistingUsers()
    if (usersExist) {
        logger.info('👤 [server]: Users already exist in database, skipping initial user creation')
        return
    }

    // Validate password
    if (config.password.length < 8) {
        logger.error('❌ [server]: Initial user password must be at least 8 characters. Skipping user creation.')
        return
    }

    // Create the initial user
    try {
        const authService = new AuthService()
        await authService.signup({
            email: config.email,
            password: config.password,
            name: config.name
        })

        logger.info(`✅ [server]: Initial user created successfully: ${config.email}`)
    } catch (error) {
        logger.error(`❌ [server]: Failed to create initial user: ${error}`)
    }
}
