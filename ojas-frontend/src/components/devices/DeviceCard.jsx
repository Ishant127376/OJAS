import { useNavigate } from 'react-router-dom'
import { timeAgo } from '../../utils/timeAgo'

export default function DeviceCard({ device, mqttConnected }) {
  const navigate = useNavigate()
  const lastSeenLabel = device.lastSeen
    ? `Last Seen: ${timeAgo(device.lastSeen)}`
    : 'No status yet'

  const deviceType = device.deviceType || 'END'
  const isOnline = typeof mqttConnected === 'boolean'
    ? mqttConnected
    : device.status === 'online'

  const handleClick = () => {
    if (deviceType === 'DCB') {
      navigate(`/dcb/${device.deviceId}`)
      return
    }

    navigate(`/devices/${device.deviceId}`)
  }

  return (
    <div
      onClick={handleClick}
      className="metric-card cursor-pointer transition-all hover:bg-surface hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-3 w-3 rounded-full bg-success animate-pulse"></div>
            <span className="text-xs font-medium text-primary uppercase">{deviceType}</span>
          </div>

          <h3 className="font-semibold text-textPrimary mb-1">{device.name}</h3>
          <p className="text-xs text-textSecondary mb-2">ID: {device.deviceId}</p>
          {device.location && <p className="text-xs text-textSecondary mb-1">Location: {device.location}</p>}
          {device.tag && <p className="text-xs text-textSecondary mb-1">Tag: {device.tag}</p>}
          <p className="text-xs text-textSecondary">
            {lastSeenLabel}
          </p>
        </div>

        <div className="text-right">
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
            isOnline ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
          }`}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>
    </div>
  )
}