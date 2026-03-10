/**
 * Admin Controllers — thin wrappers over existing services for the Management Admin API.
 * All responses use a consistent envelope: { success: true, data } or { success: false, error }.
 */

import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { InternalChronosError } from '../../errors/internalChronosError'
import { ChatflowType } from '../../Interface'
import chatflowsService from '../../services/chatflows'
import credentialsService from '../../services/credentials'
import apikeyService from '../../services/apikey'
import oauthClientService from '../../services/oauth-client'

// ─── Chatflows ───

/** List all chatflows, optionally filtered by type query param. */
const getAllChatflows = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const type = req.query.type as ChatflowType | undefined
        const data = await chatflowsService.getAllChatflows(type)
        return res.json({ success: true, data })
    } catch (error) {
        next(error)
    }
}

/** Get a single chatflow by ID. */
const getChatflowById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.params.id) {
            throw new InternalChronosError(StatusCodes.BAD_REQUEST, 'Chatflow id is required')
        }
        const data = await chatflowsService.getChatflowById(req.params.id)
        return res.json({ success: true, data })
    } catch (error) {
        next(error)
    }
}

/** Create a new chatflow. */
const createChatflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await chatflowsService.saveChatflow(req.body)
        return res.status(StatusCodes.CREATED).json({ success: true, data })
    } catch (error) {
        next(error)
    }
}

/** Update an existing chatflow. */
const updateChatflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.params.id) {
            throw new InternalChronosError(StatusCodes.BAD_REQUEST, 'Chatflow id is required')
        }
        const existingChatflow = await chatflowsService.getChatflowById(req.params.id)
        const data = await chatflowsService.updateChatflow(existingChatflow, req.body)
        return res.json({ success: true, data })
    } catch (error) {
        next(error)
    }
}

/** Delete a chatflow. */
const deleteChatflow = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.params.id) {
            throw new InternalChronosError(StatusCodes.BAD_REQUEST, 'Chatflow id is required')
        }
        const data = await chatflowsService.deleteChatflow(req.params.id)
        return res.json({ success: true, data })
    } catch (error) {
        next(error)
    }
}

// ─── Credentials ───

/** List all credentials (metadata only, never exposes secrets). */
const getAllCredentials = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await credentialsService.getAllCredentials(req.query.credentialName)
        return res.json({ success: true, data })
    } catch (error) {
        next(error)
    }
}

/** Get a single credential by ID (metadata only). */
const getCredentialById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.params.id) {
            throw new InternalChronosError(StatusCodes.BAD_REQUEST, 'Credential id is required')
        }
        const data = await credentialsService.getCredentialById(req.params.id)
        return res.json({ success: true, data })
    } catch (error) {
        next(error)
    }
}

/** Create a new credential. */
const createCredential = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await credentialsService.createCredential(req.body)
        return res.status(StatusCodes.CREATED).json({ success: true, data })
    } catch (error) {
        next(error)
    }
}

/** Update an existing credential. */
const updateCredential = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.params.id) {
            throw new InternalChronosError(StatusCodes.BAD_REQUEST, 'Credential id is required')
        }
        const data = await credentialsService.updateCredential(req.params.id, req.body)
        return res.json({ success: true, data })
    } catch (error) {
        next(error)
    }
}

/** Delete a credential. */
const deleteCredential = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.params.id) {
            throw new InternalChronosError(StatusCodes.BAD_REQUEST, 'Credential id is required')
        }
        const data = await credentialsService.deleteCredentials(req.params.id)
        return res.json({ success: true, data })
    } catch (error) {
        next(error)
    }
}

// ─── API Keys ───

/** List all API keys (flow keys). */
const getAllApiKeys = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await apikeyService.getAllApiKeys()
        return res.json({ success: true, data })
    } catch (error) {
        next(error)
    }
}

/** Create a new API key. */
const createApiKey = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body.keyName) {
            throw new InternalChronosError(StatusCodes.BAD_REQUEST, 'keyName is required')
        }
        const data = await apikeyService.createApiKey(req.body.keyName)
        return res.status(StatusCodes.CREATED).json({ success: true, data })
    } catch (error) {
        next(error)
    }
}

/** Update an API key. */
const updateApiKey = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.params.id) {
            throw new InternalChronosError(StatusCodes.BAD_REQUEST, 'API key id is required')
        }
        if (!req.body.keyName) {
            throw new InternalChronosError(StatusCodes.BAD_REQUEST, 'keyName is required')
        }
        const data = await apikeyService.updateApiKey(req.params.id, req.body.keyName)
        return res.json({ success: true, data })
    } catch (error) {
        next(error)
    }
}

/** Delete an API key. */
const deleteApiKey = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.params.id) {
            throw new InternalChronosError(StatusCodes.BAD_REQUEST, 'API key id is required')
        }
        const data = await apikeyService.deleteApiKey(req.params.id)
        return res.json({ success: true, data })
    } catch (error) {
        next(error)
    }
}

// ─── OAuth Clients ───

/** List all OAuth clients (secrets excluded). */
const getAllOAuthClients = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await oauthClientService.getAllOAuthClients()
        return res.json({ success: true, data })
    } catch (error) {
        next(error)
    }
}

/** Create a new OAuth client. Secret is returned only once. */
const createOAuthClient = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { clientName, scopes } = req.body
        const data = await oauthClientService.createOAuthClient(clientName, scopes)
        return res.status(StatusCodes.CREATED).json({ success: true, data })
    } catch (error) {
        next(error)
    }
}

/** Update an OAuth client's name or scopes. */
const updateOAuthClient = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.params.id) {
            throw new InternalChronosError(StatusCodes.BAD_REQUEST, 'OAuth client id is required')
        }
        const data = await oauthClientService.updateOAuthClient(req.params.id, req.body)
        return res.json({ success: true, data })
    } catch (error) {
        next(error)
    }
}

/** Delete an OAuth client. */
const deleteOAuthClient = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.params.id) {
            throw new InternalChronosError(StatusCodes.BAD_REQUEST, 'OAuth client id is required')
        }
        const data = await oauthClientService.deleteOAuthClient(req.params.id)
        return res.json({ success: true, data })
    } catch (error) {
        next(error)
    }
}

export default {
    getAllChatflows,
    getChatflowById,
    createChatflow,
    updateChatflow,
    deleteChatflow,
    getAllCredentials,
    getCredentialById,
    createCredential,
    updateCredential,
    deleteCredential,
    getAllApiKeys,
    createApiKey,
    updateApiKey,
    deleteApiKey,
    getAllOAuthClients,
    createOAuthClient,
    updateOAuthClient,
    deleteOAuthClient
}
