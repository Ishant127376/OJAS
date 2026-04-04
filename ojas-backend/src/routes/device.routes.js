import express from 'express'
import { addDevice, getDeviceById, getDevices } from '../controllers/device.controller.js'
import { verifyToken } from '../middleware/auth.middleware.js'

const router = express.Router()

// POST /api/devices - Register a new device
router.post('/', verifyToken, addDevice)

// GET /api/devices - Get all devices
router.get('/', verifyToken, getDevices)
router.get('/:id', verifyToken, getDeviceById)

export default router
