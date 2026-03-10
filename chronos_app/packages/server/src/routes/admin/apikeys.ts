/**
 * Admin API Keys Routes — CRUD endpoints for flow API keys.
 */

import express from 'express'
import { requireScope } from '../../middlewares/adminAuth'
import { AdminScope } from '../../Interface'
import adminController from '../../controllers/admin'

const router = express.Router()

router.get('/', requireScope(AdminScope.APIKEYS_READ), adminController.getAllApiKeys)
router.post('/', requireScope(AdminScope.APIKEYS_WRITE), adminController.createApiKey)
router.put('/:id', requireScope(AdminScope.APIKEYS_WRITE), adminController.updateApiKey)
router.delete('/:id', requireScope(AdminScope.APIKEYS_WRITE), adminController.deleteApiKey)

export default router
