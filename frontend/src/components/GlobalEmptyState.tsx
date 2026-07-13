import { useState, useCallback } from 'react'
import './GlobalEmptyState.css'

/* ═══════════════════════════════════════════════════════════════════════════
   GlobalEmptyState — 01-design.md §5.1 四场景统一规范
   empty / network-error / load-fail 三场景全局空/错状态组件
   J-004: 插画主路径 = Unicode emoji，不引外部图标库
   J-007: role="region" aria-live 包裹
   ═══════════════════════════════════════════════════════════════════════════ */

interface GlobalEmptyStateProps {
  /** 场景类型 */
  variant?: 'empty' | 'network-error' | 'load-fail'
  /** 自定义主文案（覆盖默认） */
  title?: string
  /** 自定义辅助文案（覆盖默认） */
  description?: string
  /** 按钮点击回调 */
  onAction?: () => void
  /** 自定义按钮文案 */
  actionLabel?: string
  /** 额外 className */
  className?: string
}

const DEFAULTS = {
  'empty': {
    icon: '📭',
    title: '暂无食谱，去探索一下吧？',
    description: '',
    actionLabel: '去发现',
    ariaLive: 'polite' as const,
  },
  'network-error': {
    icon: '📡',
    title: '网络连接失败，请检查网络设置',
    description: '',
    actionLabel: '重新连接',
    ariaLive: 'assertive' as const,
  },
  'load-fail': {
    icon: '⚠️',
    title: '加载遇到问题，请稍后重试',
    description: '',
    actionLabel: '重新加载',
    ariaLive: 'assertive' as const,
  },
}

export default function GlobalEmptyState({
  variant = 'empty',
  title,
  description,
  onAction,
  actionLabel,
  className = '',
}: GlobalEmptyStateProps) {
  const config = DEFAULTS[variant]
  const [retryCount, setRetryCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const maxRetries = 3

  // ── J-003: network-error/load-fail counter 走页面 state（生命周期 = 页） ──
  const isDisabled = retryCount >= maxRetries

  const handleAction = useCallback(() => {
    if (isDisabled || loading) return
    setLoading(true)
    setRetryCount(prev => prev + 1)
    onAction?.()
    setTimeout(() => setLoading(false), 500)
  }, [isDisabled, loading, onAction])

  const displayIcon = config.icon
  const displayTitle = title || config.title
  const displayDescription = description || config.description
  const displayActionLabel = actionLabel || config.actionLabel

  return (
    <div
      className={`global-empty-state global-empty-state--${variant} ${className}`}
      role="region"
      aria-live={config.ariaLive}
    >
      <div className="global-empty-state__icon">{displayIcon}</div>
      <p className="global-empty-state__title">{displayTitle}</p>
      {displayDescription && (
        <p className="global-empty-state__desc">{displayDescription}</p>
      )}
      {onAction && (
        <button
          className={`global-empty-state__action${isDisabled ? ' global-empty-state__action--disabled' : ''}`}
          onClick={handleAction}
          disabled={isDisabled || loading}
        >
          {loading ? '处理中...' : isDisabled ? '请稍后再试' : displayActionLabel}
        </button>
      )}
    </div>
  )
}
