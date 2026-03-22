import express from 'express'
import dashboardController from '../../controllers/dashboard'
import { checkPermission } from '../../utils/openSourceStubs'

const router = express.Router()

router.get('/summary', checkPermission('dashboard:view'), dashboardController.getSummary)
router.get('/timeseries', checkPermission('dashboard:view'), dashboardController.getTimeseries)
router.get('/agents', checkPermission('dashboard:view'), dashboardController.getAgents)
router.get('/export', checkPermission('dashboard:view'), dashboardController.getExport)

export default router
