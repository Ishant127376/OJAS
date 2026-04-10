import mqtt from 'mqtt'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getDeviceById } from '../services/device.service'
import Loader from '../components/common/Loader'
import { timeAgo } from '../utils/timeAgo'

export default function DeviceDetailPage() {
  const { id: deviceId } = useParams()
  const navigate = useNavigate()
  const [device, setDevice] = useState(null)
  const [telemetry, setTelemetry] = useState(null)
  const [lastSeen, setLastSeen] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [, forceUpdate] = useState(0)

  // Fetch device info once on mount
  useEffect(() => {
    const fetchDevice = async () => {
      try {
        setLoading(true)
        const res = await getDeviceById(deviceId)
        if (!res) {
          setError('Device not found')
          return
        }
        setDevice(res)
        setLastSeen(res.lastSeen)
      } catch (err) {
        console.error('Failed to fetch device:', err)
        setError('Failed to fetch device')
      } finally {
        setLoading(false)
      }
    }

    fetchDevice()
  }, [deviceId])

  // MQTT connection — stable, never recreated unless deviceId changes
  useEffect(() => {
    const client = mqtt.connect(import.meta.env.VITE_MQTT_WS_URL, {
      username: import.meta.env.VITE_MQTT_USERNAME,
      password: import.meta.env.VITE_MQTT_PASSWORD,
      protocol: 'mqtts',
      rejectUnauthorized: false,
    })

    client.on('connect', () => {
      console.log('MQTT connected')
      client.subscribe(`device/${deviceId}/telemetry`, (err) => {
        if (err) console.error('Subscribe error:', err)
        else console.log('Subscribed to:', `device/${deviceId}/telemetry`)
      })
    })

    client.on('message', (topic, message) => {
      console.log('MQTT message received:', topic, message.toString())
      try {
        const data = JSON.parse(message.toString())
        setTelemetry(data)
        setLastSeen(Date.now())
      } catch (e) {
        console.error('Failed to parse MQTT message:', e)
      }
    })

    client.on('error', (err) => console.error('MQTT error:', err))
    client.on('disconnect', () => console.log('MQTT disconnected'))

    return () => {
      client.end(true)
    }
  }, [deviceId])

  // Auto-refresh relative time display every 30 seconds
  useEffect(() => {
    const id = setInterval(() => forceUpdate((n) => n + 1), 30000)
    return () => clearInterval(id)
  }, [])

  if (loading) return <Loader />

  if (error || !device) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/devices')} className="flex items-center gap-2 text-primary hover:text-primary/80">
          <ArrowLeft className="h-5 w-5" />
          Back to Devices
        </button>
        <div className="section-card text-center py-12">
          <p className="text-textSecondary">{error || 'Device not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <button onClick={() => navigate('/devices')} className="mb-4 flex items-center gap-2 text-primary hover:text-primary/80">
          <ArrowLeft className="h-5 w-5" />
          Back to Devices
        </button>

        <div className="section-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-textPrimary mb-1">{device.name}</h1>
              <div className="space-y-1">
                <p className="text-textSecondary">Device ID: {device.deviceId}</p>
                <p className="text-xs text-textSecondary">Location: {device.location || '--'}</p>
                <p className="text-xs text-textSecondary">Tag: {device.tag || '--'}</p>
                <p className="text-xs text-textSecondary">MQTT Topic: {device.topic}</p>
              </div>
            </div>
            <div className="text-right">
              <span className={device.status === 'online' ? 'badge-online' : 'badge-offline'}>
                {device.status === 'online' ? 'Online' : 'Offline'}
              </span>
              <p className="mt-2 text-sm text-textSecondary">
                {lastSeen ? timeAgo(lastSeen) : 'Never'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-textPrimary">Live Readings</h2>
        {telemetry ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <div className="section-card">
              <p className="text-xs text-textSecondary">Voltage</p>
              <p className="text-lg font-semibold text-textPrimary">{telemetry.voltage} V</p>
            </div>
            <div className="section-card">
              <p className="text-xs text-textSecondary">Current</p>
              <p className="text-lg font-semibold text-textPrimary">{telemetry.current} A</p>
            </div>
            <div className="section-card">
              <p className="text-xs text-textSecondary">Power</p>
              <p className="text-lg font-semibold text-textPrimary">{telemetry.power} W</p>
            </div>
            <div className="section-card">
              <p className="text-xs text-textSecondary">Frequency</p>
              <p className="text-lg font-semibold text-textPrimary">{telemetry.frequency} Hz</p>
            </div>
            <div className="section-card">
              <p className="text-xs text-textSecondary">Power Factor</p>
              <p className="text-lg font-semibold text-textPrimary">{telemetry.powerFactor}</p>
            </div>
            <div className="section-card">
              <p className="text-xs text-textSecondary">Energy</p>
              <p className="text-lg font-semibold text-textPrimary">{telemetry.energy} kWh</p>
            </div>
          </div>
        ) : (
          <p>Waiting for MQTT data...</p>
        )}
      </div>
    </div>
  )
}
