import { useEffect, useState } from 'react'
import { getDevices, getAlerts } from '../services/device.service'
import { DeviceContext } from './DeviceContext'

export function DeviceProvider({ children }) {
  const [devices, setDevices] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const deviceData = await getDevices()
        const alertData = await getAlerts()
        setDevices(deviceData)
        setAlerts(alertData)
        setError(null)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const value = {
    devices,
    alerts,
    loading,
    error,
    setDevices,
    setAlerts,
  }

  return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>
}
