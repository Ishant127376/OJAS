import express from 'express'
import { createSubAdmin, createUserBySubAdmin, getUsersByRoleScope } from '../controllers/admin.controller.js'
import { requireRole, verifyToken } from '../middleware/auth.middleware.js'
import { ROLE } from '../utils/role.utils.js'

const router = express.Router()

router.post('/create-subadmin', verifyToken, requireRole([ROLE.SUPER_ADMIN]), createSubAdmin)
router.post('/create-user', verifyToken, requireRole([ROLE.SUB_ADMIN]), createUserBySubAdmin)
router.get('/users', verifyToken, requireRole([ROLE.SUPER_ADMIN, ROLE.SUB_ADMIN, ROLE.USER]), getUsersByRoleScope)

export default router
