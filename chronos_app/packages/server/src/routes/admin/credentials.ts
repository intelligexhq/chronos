/**
 * Admin Credentials Routes — CRUD endpoints for credentials (secrets are never exposed).
 */

import express from 'express'
import { requireScope } from '../../middlewares/adminAuth'
import { AdminScope } from '../../Interface'
import adminController from '../../controllers/admin'

const router = express.Router()

router.get('/', requireScope(AdminScope.CREDENTIALS_READ), adminController.getAllCredentials)
router.get('/:id', requireScope(AdminScope.CREDENTIALS_READ), adminController.getCredentialById)
router.post('/', requireScope(AdminScope.CREDENTIALS_WRITE), adminController.createCredential)
router.put('/:id', requireScope(AdminScope.CREDENTIALS_WRITE), adminController.updateCredential)
router.delete('/:id', requireScope(AdminScope.CREDENTIALS_WRITE), adminController.deleteCredential)

export default router
