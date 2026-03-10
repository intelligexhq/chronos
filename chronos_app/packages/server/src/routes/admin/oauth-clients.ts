/**
 * Admin OAuth Clients Routes — manage OAuth2 client credentials.
 */

import express from 'express'
import { requireScope } from '../../middlewares/adminAuth'
import { AdminScope } from '../../Interface'
import adminController from '../../controllers/admin'

const router = express.Router()

router.get('/', requireScope(AdminScope.ADMIN_FULL), adminController.getAllOAuthClients)
router.post('/', requireScope(AdminScope.ADMIN_FULL), adminController.createOAuthClient)
router.put('/:id', requireScope(AdminScope.ADMIN_FULL), adminController.updateOAuthClient)
router.delete('/:id', requireScope(AdminScope.ADMIN_FULL), adminController.deleteOAuthClient)

export default router
