import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

export const timeAgo = (timestamp) => {
  if (!timestamp) return 'Never'

  const now = dayjs()
  const then = dayjs(timestamp)

  if (!then.isValid()) {
    return 'Never'
  }

  const diffSeconds = now.diff(then, 'second')
  if (diffSeconds < 60) {
    return 'just now'
  }

  const diffMinutes = now.diff(then, 'minute')
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`
  }

  const diffHours = now.diff(then, 'hour')
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  }

  const diffDays = now.diff(then, 'day')
  if (diffDays === 1) {
    return 'yesterday'
  }

  return `${diffDays} days ago`
}
