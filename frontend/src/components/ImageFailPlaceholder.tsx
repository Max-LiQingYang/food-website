import { useState, useRef, useCallback } from 'react'
import './ImageFailPlaceholder.css'

/* ═══════════════════════════════════════════════════════════════════════════
   ImageFailPlaceholder — 01-design.md §4.5 + §5.1 image-fail 场景
   图片加载失败占位组件
   J-003: image-fail counter 走 useRef（卡片生命周期）
   J-004: 插画主路径 = Unicode emoji 📷
   ═══════════════════════════════════════════════════════════════════════════ */

interface ImageFailPlaceholderProps {
  /** 图片标题（用于 alt 回退） */
  title?: string
  /** 重试回调：点击后重新加载该图片 */
  onRetry?: () => void
  /** 额外 className */
  className?: string
}

export default function ImageFailPlaceholder({
  title,
  onRetry,
  className = '',
}: ImageFailPlaceholderProps) {
  // ── J-003: image-fail counter 走 useRef（生命周期 = 卡片） ──
  const retryCountRef = useRef(0)
  const [loading, setLoading] = useState(false)
  const [disabled, setDisabled] = useState(false)
  const maxRetries = 3

  const handleRetry = useCallback(() => {
    if (disabled || loading) return
    retryCountRef.current += 1
    if (retryCountRef.current >= maxRetries) {
      setDisabled(true)
      return
    }
    setLoading(true)
    onRetry?.()
    setTimeout(() => setLoading(false), 500)
  }, [disabled, loading, onRetry])

  return (
    <div
      className={`image-fail-placeholder ${className}`}
      role="region"
      aria-live="polite"
    >
      <span className="image-fail-placeholder__icon">📷</span>
      <span className="image-fail-placeholder__text">图片加载失败</span>
      {title && (
        <span className="image-fail-placeholder__title">{title}</span>
      )}
      {onRetry && (
        <button
          className={`image-fail-placeholder__retry${disabled ? ' image-fail-placeholder__retry--disabled' : ''}`}
          onClick={handleRetry}
          disabled={disabled || loading}
        >
          {loading ? '加载中...' : disabled ? '请稍后再试' : '重试图片'}
        </button>
      )}
    </div>
  )
}
