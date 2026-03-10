/**
 * Admin Chatflows Routes — CRUD endpoints for chatflows, agentflows, and multiagent flows.
 */

import express from 'express'
import { requireScope } from '../../middlewares/adminAuth'
import { AdminScope } from '../../Interface'
import adminController from '../../controllers/admin'

const router = express.Router()

router.get('/', requireScope(AdminScope.CHATFLOWS_READ), adminController.getAllChatflows)
router.get('/:id', requireScope(AdminScope.CHATFLOWS_READ), adminController.getChatflowById)
router.post('/', requireScope(AdminScope.CHATFLOWS_WRITE), adminController.createChatflow)
router.put('/:id', requireScope(AdminScope.CHATFLOWS_WRITE), adminController.updateChatflow)
router.delete('/:id', requireScope(AdminScope.CHATFLOWS_WRITE), adminController.deleteChatflow)

export default router
