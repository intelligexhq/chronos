/**
 * OAuth Client Service — manages OAuth2 client credentials for the Management Admin API.
 */

import { StatusCodes } from 'http-status-codes'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { randomBytes } from 'crypto'
import { InternalChronosError } from '../../errors/internalChronosError'
import { getErrorMessage } from '../../errors/utils'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { OAuthClient } from '../../database/entities/OAuthClient'
import { AdminScope } from '../../Interface'

const SALT_ROUNDS = 10

/**
 * Generate a cryptographically secure client ID.
 * @returns {string} A URL-safe random string prefixed with 'cc_'
 */
const generateClientId = (): string => {
    return `cc_${randomBytes(16).toString('hex')}`
}

/**
 * Generate a cryptographically secure client secret.
 * @returns {string} A URL-safe random string prefixed with 'cs_'
 */
const generateClientSecret = (): string => {
    return `cs_${randomBytes(32).toString('hex')}`
}

/**
 * Validate that all provided scopes are valid AdminScope values.
 * @param {string[]} scopes - Array of scope strings to validate
 * @returns {boolean} True if all scopes are valid
 */
const validateScopes = (scopes: string[]): boolean => {
    const validScopes = Object.values(AdminScope) as string[]
    return scopes.every((scope) => validScopes.includes(scope))
}

/**
 * Get all OAuth clients (secrets are not returned).
 * @returns {Promise<OAuthClient[]>} List of OAuth clients without secrets
 */
const getAllOAuthClients = async () => {
    try {
        const appServer = getRunningExpressApp()
        const clients = await appServer.AppDataSource.getRepository(OAuthClient).find({
            order: { updatedDate: 'DESC' }
        })
        return clients.map((client) => ({
            id: client.id,
            clientId: client.clientId,
            clientName: client.clientName,
            scopes: client.scopes,
            createdDate: client.createdDate,
            updatedDate: client.updatedDate
        }))
    } catch (error) {
        throw new InternalChronosError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: oauthClientService.getAllOAuthClients - ${getErrorMessage(error)}`
        )
    }
}

/**
 * Get an OAuth client by its clientId field (used during token exchange).
 * @param {string} clientId - The client_id value
 * @returns {Promise<OAuthClient | null>} The full OAuth client entity or null
 */
const getByClientId = async (clientId: string): Promise<OAuthClient | null> => {
    try {
        const appServer = getRunningExpressApp()
        return await appServer.AppDataSource.getRepository(OAuthClient).findOneBy({ clientId })
    } catch (error) {
        throw new InternalChronosError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: oauthClientService.getByClientId - ${getErrorMessage(error)}`
        )
    }
}

/**
 * Get an OAuth client by primary key ID.
 * @param {string} id - Primary key UUID
 * @returns {Promise<OAuthClient | null>} The OAuth client entity or null
 */
const getById = async (id: string): Promise<OAuthClient | null> => {
    try {
        const appServer = getRunningExpressApp()
        return await appServer.AppDataSource.getRepository(OAuthClient).findOneBy({ id })
    } catch (error) {
        throw new InternalChronosError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: oauthClientService.getById - ${getErrorMessage(error)}`)
    }
}

/**
 * Create a new OAuth client with generated client_id and client_secret.
 * @param {string} clientName - Human-readable name
 * @param {string[]} scopes - Array of scopes to grant
 * @returns {Promise<object>} Created client with plain-text secret (shown only once)
 */
const createOAuthClient = async (clientName: string, scopes: string[]) => {
    try {
        if (!clientName) {
            throw new InternalChronosError(StatusCodes.BAD_REQUEST, 'clientName is required')
        }
        if (!scopes || scopes.length === 0) {
            throw new InternalChronosError(StatusCodes.BAD_REQUEST, 'At least one scope is required')
        }
        if (!validateScopes(scopes)) {
            throw new InternalChronosError(StatusCodes.BAD_REQUEST, `Invalid scopes. Valid values: ${Object.values(AdminScope).join(', ')}`)
        }

        const plainClientId = generateClientId()
        const plainClientSecret = generateClientSecret()
        const hashedSecret = await bcrypt.hash(plainClientSecret, SALT_ROUNDS)

        const appServer = getRunningExpressApp()
        const oauthClient = new OAuthClient()
        oauthClient.id = uuidv4()
        oauthClient.clientId = plainClientId
        oauthClient.clientSecret = hashedSecret
        oauthClient.clientName = clientName
        oauthClient.scopes = JSON.stringify(scopes)

        const entity = appServer.AppDataSource.getRepository(OAuthClient).create(oauthClient)
        await appServer.AppDataSource.getRepository(OAuthClient).save(entity)

        return {
            id: entity.id,
            clientId: plainClientId,
            clientSecret: plainClientSecret,
            clientName: entity.clientName,
            scopes: entity.scopes,
            createdDate: entity.createdDate,
            updatedDate: entity.updatedDate
        }
    } catch (error) {
        if (error instanceof InternalChronosError) throw error
        throw new InternalChronosError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: oauthClientService.createOAuthClient - ${getErrorMessage(error)}`
        )
    }
}

/**
 * Create an OAuth client with specific client_id and plain-text secret (used for bootstrap).
 * @param {string} clientId - Desired client_id
 * @param {string} plainSecret - Plain-text secret to hash and store
 * @param {string[]} scopes - Array of scopes to grant
 * @returns {Promise<OAuthClient>} The created entity
 */
const createBootstrapClient = async (clientId: string, plainSecret: string, scopes: string[]) => {
    const appServer = getRunningExpressApp()
    const existing = await appServer.AppDataSource.getRepository(OAuthClient).findOneBy({ clientId })
    if (existing) {
        return existing
    }

    const hashedSecret = await bcrypt.hash(plainSecret, SALT_ROUNDS)
    const oauthClient = new OAuthClient()
    oauthClient.id = uuidv4()
    oauthClient.clientId = clientId
    oauthClient.clientSecret = hashedSecret
    oauthClient.clientName = 'Bootstrap Admin Client'
    oauthClient.scopes = JSON.stringify(scopes)

    const entity = appServer.AppDataSource.getRepository(OAuthClient).create(oauthClient)
    return await appServer.AppDataSource.getRepository(OAuthClient).save(entity)
}

/**
 * Update an OAuth client's name or scopes.
 * @param {string} id - Primary key UUID
 * @param {object} updates - Fields to update
 * @returns {Promise<object>} Updated client (without secret)
 */
const updateOAuthClient = async (id: string, updates: { clientName?: string; scopes?: string[] }) => {
    try {
        const appServer = getRunningExpressApp()
        const client = await appServer.AppDataSource.getRepository(OAuthClient).findOneBy({ id })
        if (!client) {
            throw new InternalChronosError(StatusCodes.NOT_FOUND, `OAuth client ${id} not found`)
        }

        if (updates.clientName) {
            client.clientName = updates.clientName
        }
        if (updates.scopes) {
            if (!validateScopes(updates.scopes)) {
                throw new InternalChronosError(
                    StatusCodes.BAD_REQUEST,
                    `Invalid scopes. Valid values: ${Object.values(AdminScope).join(', ')}`
                )
            }
            client.scopes = JSON.stringify(updates.scopes)
        }

        await appServer.AppDataSource.getRepository(OAuthClient).save(client)

        return {
            id: client.id,
            clientId: client.clientId,
            clientName: client.clientName,
            scopes: client.scopes,
            createdDate: client.createdDate,
            updatedDate: client.updatedDate
        }
    } catch (error) {
        if (error instanceof InternalChronosError) throw error
        throw new InternalChronosError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: oauthClientService.updateOAuthClient - ${getErrorMessage(error)}`
        )
    }
}

/**
 * Delete an OAuth client.
 * @param {string} id - Primary key UUID
 * @returns {Promise<object>} Delete result
 */
const deleteOAuthClient = async (id: string) => {
    try {
        const appServer = getRunningExpressApp()
        const result = await appServer.AppDataSource.getRepository(OAuthClient).delete({ id })
        if (!result.affected) {
            throw new InternalChronosError(StatusCodes.NOT_FOUND, `OAuth client ${id} not found`)
        }
        return result
    } catch (error) {
        if (error instanceof InternalChronosError) throw error
        throw new InternalChronosError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: oauthClientService.deleteOAuthClient - ${getErrorMessage(error)}`
        )
    }
}

/**
 * Verify client credentials and return the client if valid.
 * @param {string} clientId - The client_id
 * @param {string} clientSecret - The plain-text client_secret
 * @returns {Promise<OAuthClient>} The verified OAuth client
 */
const verifyClientCredentials = async (clientId: string, clientSecret: string): Promise<OAuthClient> => {
    const client = await getByClientId(clientId)
    if (!client) {
        throw new InternalChronosError(StatusCodes.UNAUTHORIZED, 'Invalid client credentials')
    }

    const isValid = await bcrypt.compare(clientSecret, client.clientSecret)
    if (!isValid) {
        throw new InternalChronosError(StatusCodes.UNAUTHORIZED, 'Invalid client credentials')
    }

    return client
}

export default {
    getAllOAuthClients,
    getByClientId,
    getById,
    createOAuthClient,
    createBootstrapClient,
    updateOAuthClient,
    deleteOAuthClient,
    verifyClientCredentials
}
