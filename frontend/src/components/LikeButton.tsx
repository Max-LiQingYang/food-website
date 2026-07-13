import { useState, useCallback, useRef } from 'react'
import { useParticleGuard } from '../hooks/useParticleGuard'
import './LikeButton.css'

/* ═══════════════════════════════════════════════════════════════════════════
   LikeButton — 01-design.md §4.3 点赞微交互
   默认降级：CSS 缩放弹跳（所有设备）
   渐进增强：高端设备 + 粒子启用 → 粒子扩散（由 ParticleProvider 控制）
   ═══════════════════════════════════════════════════════════════════════════ */

interface LikeButtonProps {
  liked?: boolean
  count?: number
  onToggle?: (liked: boolean) => void
  /** aria-label 前缀 */
  label?: string
}

export default function LikeButton({
  liked: initialLiked = false,
  count: initialCount = 0,
  onToggle,
  label = '点赞',
}: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [animating, setAnimating] = useState(false)
  const { enabled: particleEnabled, reason: particleReason } = useParticleGuard()
  const reasonLoggedRef = useRef(false)

  const handleClick = useCallback(() => {
    const newLiked = !liked
    setLiked(newLiked)
    setCount(prev => newLiked ? prev + 1 : Math.max(0, prev - 1))

    if (particleEnabled) {
      // 高端设备：粒子扩散 + CSS 弹跳
      setAnimating(true)
      setTimeout(() => setAnimating(false), 200)
    } else {
      // 降级：仅 CSS 缩放弹跳
      setAnimating(true)
      setTimeout(() => setAnimating(false), 200)
      if (!reasonLoggedRef.current) {
        reasonLoggedRef.current = true
        console.info(`[LikeButton] 粒子动效已降级，原因: ${particleReason}`)
      }
    }

    onToggle?.(newLiked)
  }, [liked, onToggle, particleEnabled, particleReason])

  const ariaLabel = liked ? `取消${label}` : label

  return (
    <button
      className={`like-button${liked ? ' like-button--liked' : ''}${animating ? ' like-button--animating' : ''}`}
      onClick={handleClick}
      aria-label={ariaLabel}
      aria-pressed={liked}
      aria-live="polite"
    >
      <span className="like-button__icon">{liked ? '❤️' : '🤍'}</span>
      {count > 0 && <span className="like-button__count">{count}</span>}
    </button>
  )
}
