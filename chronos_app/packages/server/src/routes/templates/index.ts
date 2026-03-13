import express from 'express'
import templatesController from '../../controllers/templates'
import { checkPermission, checkAnyPermission } from '../../utils/openSourceStubs'
const router = express.Router()

// READ
router.get('/templates', checkPermission('templates:marketplace'), templatesController.getAllTemplates)

router.post('/custom', checkAnyPermission('templates:flowexport,templates:toolexport'), templatesController.saveCustomTemplate)

// READ
router.get('/custom', checkPermission('templates:custom'), templatesController.getAllCustomTemplates)

// DELETE
router.delete(['/', '/custom/:id'], checkPermission('templates:custom-delete'), templatesController.deleteCustomTemplate)

export default router
