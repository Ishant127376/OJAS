import { useMemo, useState } from 'react'
import DeviceCard from './DeviceCard'

export default function DeviceList({ devices = [] }) {
  const [filter, setFilter] = useState('all')

  const filtered = useMemo(() => {
    return devices.filter((d) => {
      if (filter === 'all') return true
      return d.deviceType === filter
    })
  }, [devices, filter])

  return (
    <div>
      <div className="mb-6 flex gap-3">
        {['all', 'END', 'DCB'].map((type) => {
          const count =
            type === 'all'
              ? devices.length
              : devices.filter((d) => d.deviceType === type).length
          return (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                filter === type
                  ? 'bg-primary text-white'
                  : 'bg-border/20 text-textSecondary hover:text-textPrimary'
              }`}
            >
              {type === 'all' ? 'All Devices' : type} ({count})
            </button>
          )
        })}
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((device) => (
          <DeviceCard key={device.deviceId} device={device} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-textSecondary">
            {devices.length === 0
              ? 'No devices found. Click "Add Device" to create one.'
              : `No ${filter} devices found`}
          </p>
        </div>
      )}
    </div>
  )
}
