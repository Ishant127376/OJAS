import express from 'express'
import { execFile } from 'child_process'
import path from 'path'
import { getMqttClient } from '../config/mqtt.js'
import { verifyToken } from '../middleware/auth.middleware.js'

const router = express.Router()

router.post('/handshake', verifyToken, (req, res) => {
  const deviceId = req.body?.deviceId
  const pythonExec = process.env.DLMS_PYTHON_EXEC || 'python'
  const servicePath = process.env.DLMS_PYTHON_SERVICE_PATH
    || path.resolve(process.cwd(), '..', 'ojas-dlms-python-service')

  const pyCode = [
    'from ojas_dlms_bridge.aarq_generator import generate_aarq_hex',
    'print(generate_aarq_hex())',
  ].join('; ')

  execFile(
    pythonExec,
    ['-c', pyCode],
    {
      cwd: servicePath,
      env: {
        ...process.env,
        PYTHONPATH: 'src',
      },
      timeout: 20000,
    },
    (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({
          success: false,
          error: {
            code: 'DLMS_HANDSHAKE_FAILED',
            message: (stderr || error.message || 'Failed to generate AARQ HEX').trim(),
          },
        })
      }

      const aarq = String(stdout || '').trim()
      if (!aarq) {
        return res.status(500).json({
          success: false,
          error: {
            code: 'DLMS_HANDSHAKE_EMPTY',
            message: 'AARQ HEX generation returned empty output',
          },
        })
      }

      const mqttClient = getMqttClient()
      if (mqttClient?.connected && deviceId) {
        const topic = `device/${deviceId}/command`
        const payload = JSON.stringify({
          type: 'aarq',
          hex: aarq,
        })
        mqttClient.publish(topic, payload, { qos: 1 }, (publishError) => {
          if (publishError) {
            console.error('Failed to publish AARQ command:', publishError.message)
          }
        })
      }

      return res.status(200).json({
        success: true,
        aarq,
      })
    }
  )
})

export default router
