import crypto from 'crypto'
import Device from '../models/device.model.js'
import Telemetry from '../models/telemetry.model.js'
import User from '../models/user.model.js'
import { ROLE } from '../utils/role.utils.js'

const generateUniqueId = (deviceType) => {
  const suffix = Math.floor(Math.random() * 9000) + 1000
  return `${deviceType}-${Date.now()}-${suffix}`
}

const createUniqueDeviceId = async (deviceType) => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = generateUniqueId(deviceType)
    const exists = await Device.exists({ deviceId: candidate })
    if (!exists) {
      return candidate
    }
  }

  throw new Error('Failed to generate unique device ID')
}

const generateRandomPassword = () => {
  return crypto.randomBytes(32).toString('hex')
}

const normalizeSubDevices = (subDevices) => {
  if (!Array.isArray(subDevices)) {
    return []
  }

  return subDevices
    .map((item) => ({
      name: typeof item?.name === 'string' ? item.name.trim() : '',
      type: typeof item?.type === 'string' ? item.type.trim() : '',
    }))
    .filter((item) => item.name && item.type)
}

const getAccessibleOwnerIds = async (authUser) => {
  if (authUser.role === ROLE.SUPER_ADMIN) {
    return null
  }

  if (authUser.role === ROLE.SUB_ADMIN) {
    const managedUsers = await User.find({ parentId: authUser._id }, { _id: 1 }).lean()
    const managedUserIds = managedUsers.map((item) => item._id)
    return [authUser._id, ...managedUserIds]
  }

  return [authUser._id]
}

export const addDevice = async (req, res) => {
  try {
    const { name, deviceType, location, tag, description, subDevices } = req.body
    const normalizedType = typeof deviceType === 'string' ? deviceType.trim().toUpperCase() : ''

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Device name is required and must be a non-empty string',
        },
      })
    }

    if (!['END', 'DCB'].includes(normalizedType)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_DEVICE_TYPE',
          message: 'deviceType must be either END or DCB',
        },
      })
    }

    const normalizedSubDevices = normalizeSubDevices(subDevices)

    if (normalizedType === 'DCB' && normalizedSubDevices.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SUB_DEVICES',
          message: 'DCB device requires at least one valid sub-device',
        },
      })
    }

    const finalDeviceId = await createUniqueDeviceId(normalizedType)
    const mqttUsername = finalDeviceId
    const mqttPassword = generateRandomPassword()
    const topic = `device/${finalDeviceId}/telemetry`

    const newDevice = new Device({
      deviceId: finalDeviceId,
      serialNumber: finalDeviceId,
      name: name.trim(),
      deviceType: normalizedType,
      location: typeof location === 'string' ? location.trim() : '',
      tag: typeof tag === 'string' ? tag.trim() : '',
      description: typeof description === 'string' ? description.trim() : '',
      subDevices: normalizedType === 'DCB' ? normalizedSubDevices : [],
      mqttUsername,
      mqttPassword,
      topic,
      userId: req.user._id,
      createdBy: req.user._id,
      status: 'offline',
      lastSeen: null,
    })

    await newDevice.save()

    return res.status(201).json({
      success: true,
      data: {
        deviceId: newDevice.deviceId,
        name: newDevice.name,
        deviceType: newDevice.deviceType,
        location: newDevice.location,
        tag: newDevice.tag,
        description: newDevice.description,
        subDevices: newDevice.subDevices,
        mqttUsername: newDevice.mqttUsername,
        mqttPassword: newDevice.mqttPassword,
        topic: newDevice.topic,
        userId: newDevice.userId,
        createdBy: newDevice.createdBy,
        status: newDevice.status,
        lastSeen: newDevice.lastSeen,
        createdAt: newDevice.createdAt,
        updatedAt: newDevice.updatedAt,
      },
      message: 'Device registered successfully',
    })
  } catch (error) {
    console.error('Error adding device:', error)

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'DUPLICATE_DEVICE',
          message: 'Device with this ID already exists',
        },
      })
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to register device',
      },
    })
  }
}

export const getDevices = async (req, res) => {
  try {
    const ownerIds = await getAccessibleOwnerIds(req.user)
    const filter = ownerIds ? { createdBy: { $in: ownerIds } } : {}

    const devices = await Device.find(filter, {
      deviceId: 1,
      name: 1,
      deviceType: 1,
      location: 1,
      tag: 1,
      description: 1,
      subDevices: 1,
      topic: 1,
      userId: 1,
      createdBy: 1,
      status: 1,
      lastSeen: 1,
      createdAt: 1,
      updatedAt: 1,
    }).lean()

    const enrichedDevices = await Promise.all(
      devices.map(async (device) => {
        const latestTelemetry = await Telemetry.findOne({ deviceId: device.deviceId })
          .sort({ timestamp: -1 })
          .lean()

        return {
          ...device,
          status: device.status || 'offline',
          lastSeen: device.lastSeen || null,
          lastTelemetry: latestTelemetry || null,
        }
      })
    )

    return res.status(200).json({
      success: true,
      data: enrichedDevices,
      message: 'Devices fetched successfully',
    })
  } catch (error) {
    console.error('Error fetching devices:', error)

    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch devices',
      },
    })
  }
}

export const getDeviceById = async (req, res) => {
  try {
    const { id } = req.params
    const normalizedDeviceId = id.trim().toUpperCase()

    const ownerIds = await getAccessibleOwnerIds(req.user)
    const filter = {
      deviceId: normalizedDeviceId,
      ...(ownerIds ? { createdBy: { $in: ownerIds } } : {}),
    }

    const device = await Device.findOne(filter, {
      mqttUsername: 0,
      mqttPassword: 0,
    }).lean()

    if (!device) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DEVICE_NOT_FOUND',
          message: 'Device not found',
        },
      })
    }

    const latestTelemetry = await Telemetry.findOne({ deviceId: normalizedDeviceId })
      .sort({ timestamp: -1 })
      .lean()

    return res.status(200).json({
      success: true,
      data: {
        ...device,
        status: device.status || 'offline',
        lastSeen: device.lastSeen || null,
        lastTelemetry: latestTelemetry || null,
      },
    })
  } catch (error) {
    console.error('Error fetching device by id:', error)
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch device',
      },
    })
  }
}
