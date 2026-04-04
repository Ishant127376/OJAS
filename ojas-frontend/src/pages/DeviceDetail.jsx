import { ArrowLeft } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getDeviceById, getTelemetryHistory } from '../services/device.service'
import { connectMQTT, disconnect } from '../services/mqtt.service'
import Loader from '../components/common/Loader'
import EnergyMeter from '../components/sensors/EnergyMeter'
import LiveChart from '../components/charts/LiveChart'

export default function DeviceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [device, setDevice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [liveReadings, setLiveReadings] = useState(null)
  const [mqttConnected, setMqttConnected] = useState(false)
  const [chartData, setChartData] = useState([])
  const [lastUpdatedSeconds, setLastUpdatedSeconds] = useState(null)
  const lastMessageTimeRef = useRef(null)
  const monitorIntervalRef = useRef(null)

  useEffect(() => {
    const loadDevice = async () => {
      try {
        setLoading(true)
        const deviceData = await getDeviceById(id)

        if (!deviceData) {
          setError('Device not found')
          return
        }

        setDevice(deviceData)
        const deviceId = deviceData.deviceId

        const history = await getTelemetryHistory(deviceId)
        const latest = history[0] || null

        if (latest) {
          setLiveReadings(latest)
          lastMessageTimeRef.current = new Date(latest.timestamp).getTime()
          setLastUpdatedSeconds(Math.floor((Date.now() - lastMessageTimeRef.current) / 1000))

          const historyChartData = [...history]
            .reverse()
            .map((item) => ({
              time: new Date(item.timestamp).toLocaleTimeString(),
              power: item.power || 0,
              voltage: item.voltage || 0,
              current: item.current || 0,
            }))

          setChartData(historyChartData)
        }

        try {
          await connectMQTT(deviceId, (data) => {
            setLiveReadings(data)
            lastMessageTimeRef.current = Date.now()
            setMqttConnected(true)
            setLastUpdatedSeconds(0)

            setChartData((prev) => [
              ...prev.slice(-9),
              {
                time: new Date().toLocaleTimeString(),
                power: data.power || 0,
                voltage: data.voltage || 0,
                current: data.current || 0,
              },
            ])
          })

          if (monitorIntervalRef.current) {
            clearInterval(monitorIntervalRef.current)
          }

          monitorIntervalRef.current = setInterval(() => {
            const lastMessageTime = lastMessageTimeRef.current

            if (!lastMessageTime) {
              setMqttConnected(false)
              setLastUpdatedSeconds(null)
              return
            }

            const diff = Date.now() - lastMessageTime
            const secondsAgo = Math.floor(diff / 1000)
            setLastUpdatedSeconds(secondsAgo)

            if (diff > 10000) {
              setMqttConnected(false)
            }
          }, 2000)
        } catch (mqttErr) {
          console.error('MQTT connection failed:', mqttErr)
          setMqttConnected(false)
        }
      } catch (err) {
        console.error('Error loading device:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadDevice()

    return () => {
      if (monitorIntervalRef.current) {
        clearInterval(monitorIntervalRef.current)
      }
      lastMessageTimeRef.current = null
      disconnect()
    }
  }, [id])

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

  const readings = liveReadings || {
    voltage: 0,
    current: 0,
    power: 0,
    temperature: 0,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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
              <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                mqttConnected ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
              }`}>
                {mqttConnected ? 'Live' : 'Offline'}
              </div>
              <p className="mt-2 text-sm text-textSecondary">
                {lastUpdatedSeconds === null
                  ? 'Waiting for data...'
                  : `Last updated: ${lastUpdatedSeconds}s ago`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Readings */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-textPrimary">Live Readings</h2>
        {liveReadings ? (
          <div className="space-y-4">
            <EnergyMeter readings={readings} />
            <div className="section-card grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <p className="text-xs text-textSecondary">Voltage</p>
                <p className="text-lg font-semibold text-textPrimary">{readings.voltage} V</p>
              </div>
              <div>
                <p className="text-xs text-textSecondary">Current</p>
                <p className="text-lg font-semibold text-textPrimary">{readings.current} A</p>
              </div>
              <div>
                <p className="text-xs text-textSecondary">Power</p>
                <p className="text-lg font-semibold text-textPrimary">{readings.power} W</p>
              </div>
              <div>
                <p className="text-xs text-textSecondary">Temperature</p>
                <p className="text-lg font-semibold text-textPrimary">{readings.temperature} °C</p>
              </div>
              <div>
                <p className="text-xs text-textSecondary">Status</p>
                <p className={`text-lg font-semibold ${readings.status === 'HIGH_LOAD' ? 'text-warning' : 'text-success'}`}>
                  {readings.status || 'NORMAL'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="section-card text-center py-12">
            <p className="text-textSecondary">Waiting for MQTT data...</p>
          </div>
        )}
      </div>

      {/* Temperature Display */}
      {readings.temperature > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-textPrimary">Temperature Monitor</h2>
          <div className="section-card">
            <div className="flex items-baseline gap-3 mb-4">
              <span className="font-mono text-4xl font-bold text-textPrimary">{readings.temperature.toFixed(1)}°C</span>
              <span className={`text-sm ${
                readings.temperature > 50 ? 'text-danger' :
                readings.temperature > 40 ? 'text-warning' :
                'text-success'
              }`}>
                {readings.temperature > 50 ? 'High' :
                 readings.temperature > 40 ? 'Moderate' :
                 'Normal'}
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-border/50 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  readings.temperature > 50 ? 'bg-danger' :
                  readings.temperature > 40 ? 'bg-warning' :
                  'bg-success'
                }`}
                style={{ width: `${Math.min(readings.temperature, 60) / 0.6}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Live Chart */}
      {chartData.length > 0 && (
        <LiveChart data={chartData} dataKey="power" name="Live Power Data" color="#3B82F6" />
      )}
    </div>
  )
}
