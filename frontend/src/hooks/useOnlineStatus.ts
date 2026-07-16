import { useState, useEffect, useCallback } from 'react'

type NetworkStatus = 'online' | 'offline' | 'slow'

interface UseOnlineStatusReturn {
  isOnline: boolean
  status: NetworkStatus
  lastChanged: Date | null
}

// 连续 2 次 API 请求超过 3 秒标记为 slow
let slowRequestCount = 0
let slowTimer: ReturnType<typeof setTimeout> | null = null

export function markSlowRequest() {
  slowRequestCount++
  if (slowTimer) clearTimeout(slowTimer)
  slowTimer = setTimeout(() => {
    slowRequestCount = 0
  }, 10000)
}

export function isSlowThresholdReached() {
  return slowRequestCount >= 2
}

export default function useOnlineStatus(): UseOnlineStatusReturn {
  const [status, setStatus] = useState<NetworkStatus>(() => {
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      return navigator.onLine ? 'online' : 'offline'
    }
    return 'online'
  })
  const [lastChanged, setLastChanged] = useState<Date | null>(null)

  const updateStatus = useCallback((newStatus: NetworkStatus) => {
    setStatus(prev => {
      if (prev !== newStatus) {
        setLastChanged(new Date())
        return newStatus
      }
      return prev
    })
  }, [])

  useEffect(() => {
    const handleOnline = () => {
      slowRequestCount = 0
      updateStatus('online')
    }

    const handleOffline = () => {
      updateStatus('offline')
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)

      // 初始化状态
      if (navigator.onLine) {
        updateStatus('online')
      } else {
        updateStatus('offline')
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (slowTimer) clearTimeout(slowTimer)
    }
  }, [updateStatus])

  // 检查 slow 状态（每 2 秒检查一次阈值）
  useEffect(() => {
    if (status !== 'online') return

    const checkSlow = () => {
      if (isSlowThresholdReached()) {
        updateStatus('slow')
      } else if (status === 'slow') {
        updateStatus('online')
      }
    }

    const interval = setInterval(checkSlow, 2000)
    return () => clearInterval(interval)
  }, [status, updateStatus])

  return {
    isOnline: status === 'online',
    status,
    lastChanged,
  }
}
