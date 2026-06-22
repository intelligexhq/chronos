import express from 'express'
import topologyController from '../../controllers/topology'
import { checkPermission } from '../../utils/openSourceStubs'

const router = express.Router()

// Both surfaces are read-only views of the same audit substrate as the Audit Log
// page, so they share its `mcp-servers:view` gate.
router.get('/snapshot', checkPermission('mcp-servers:view'), topologyController.getSnapshot)
router.get('/stream', checkPermission('mcp-servers:view'), topologyController.streamSnapshots)

export default router
