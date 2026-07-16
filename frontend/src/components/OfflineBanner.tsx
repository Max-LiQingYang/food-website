import { useState, useEffect } from 'react'
import './OfflineBanner.css'

interface OfflineBannerProps {
  status: 'online' | 'offline' | 'slow'
  message?: string
  onClose?: () => void
  onRetry?: () => void
}

export default function OfflineBanner({ status, message, onClose, onRetry }: OfflineBannerProps) {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (status === 'online') {
      setVisible(false)
      setDismissed(false)
    } else if (!dismissed) {
      const timer = setTimeout(() => setVisible(true), 100)
      return () => clearTimeout(timer)
    }
  }, [status, dismissed])

  const handleClose = () => {
    setVisible(false)
    setDismissed(true)
    onClose?.()
  }

  if (status === 'online') return null

  const isOffline = status === 'offline'
  const defaultMessage = isOffline
    ? '您已离线，部分功能可能不可用'
    : '网络较慢，请耐心等待'

  return (
    <div
      className={`offline-banner offline-banner--${status} ${visible ? 'offline-banner--visible' : ''}`}
      role="status"
      aria-live={isOffline ? 'assertive' : 'polite'}
    >
      <div className="offline-banner__content">
        <span className="offline-banner__icon">
          {isOffline ? '📡' : '⏳'}
        </span>
        <span className="offline-banner__text">
          {message || defaultMessage}
        </span>
        {onRetry && (
          <button
            className="offline-banner__retry"
            onClick={onRetry}
            aria-label="重试"
          >
            重试
          </button>
        )}
        <button
          className="offline-banner__close"
          onClick={handleClose}
          aria-label="关闭提示"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
