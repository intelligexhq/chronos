import express from 'express'
import auditController from '../../controllers/audit'
import { checkPermission } from '../../utils/openSourceStubs'

const router = express.Router()

// Minimal v1.7 § 3a read surface — single endpoint for callId-scoped lookups
// (smoke test + § 6 HTTP-agent execution viewer dependency). The full filter
// surface (agent / server / tool / time / user / success) lands in 3b.
router.get('/tool-invocations', checkPermission('mcp-servers:view'), auditController.listToolInvocations)

export default router
