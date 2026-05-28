import { useCallback, useRef, useState } from 'react'
import { longPressFeedback } from '../utils/hapticFeedback'

interface UseLongPressOptions {
  /** 长按触发时间阈值（毫秒） */
  threshold?: number
  /** 长按触发回调 */
  onLongPress?: (e: React.TouchEvent | React.MouseEvent) => void
  /** 点击回调（短按） */
  onClick?: (e: React.TouchEvent | React.MouseEvent) => void
  /** 移动容忍距离（px），超过则取消长按 */
  moveTolerance?: number
}

interface UseLongPressResult {
  /** 是否正处于长按状态 */
  isLongPressing: boolean
  /** 触摸事件处理器 */
  touchHandlers: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: (e: React.TouchEvent) => void
  }
  /** 鼠标事件处理器（桌面端退回到 onContextMenu） */
  mouseHandlers: {
    onContextMenu: (e: React.MouseEvent) => void
  }
}

/**
 * 长按检测 Hook
 * 检测 touchstart/touchend 时间差 > threshold 触发长按
 * 移动端通过 touch 事件，桌面端通过 onContextMenu 右键
 *
 * @example
 * const { touchHandlers, isLongPressing } = useLongPress({
 *   onLongPress: () => console.log('long pressed!'),
 *   onClick: () => console.log('clicked'),
 * })
 * return <div {...touchHandlers}>...</div>
 */
export function useLongPress({
  threshold = 500,
  onLongPress,
  onClick,
  moveTolerance = 10,
}: UseLongPressOptions): UseLongPressResult {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startPosRef = useRef<{ x: number; y: number } | null>(null)
  const isLongPressRef = useRef(false)
  const [isLongPressing, setIsLongPressing] = useState(false)

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      isLongPressRef.current = false
      setIsLongPressing(false)

      const touch = e.touches[0]
      startPosRef.current = { x: touch.clientX, y: touch.clientY }

      timerRef.current = setTimeout(() => {
        isLongPressRef.current = true
        setIsLongPressing(true)
        longPressFeedback()
        onLongPress?.(e)
      }, threshold)
    },
    [threshold, onLongPress]
  )

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (isLongPressRef.current) return // 已经触发长按

      const touch = e.touches[0]
      const start = startPosRef.current
      if (start) {
        const dx = Math.abs(touch.clientX - start.x)
        const dy = Math.abs(touch.clientY - start.y)
        if (dx > moveTolerance || dy > moveTolerance) {
          clearTimer()
          startPosRef.current = null
        }
      }
    },
    [clearTimer, moveTolerance]
  )

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      clearTimer()

      if (!isLongPressRef.current) {
        // 短按 → 触发 onClick
        onClick?.(e)
      }

      isLongPressRef.current = false
      setIsLongPressing(false)
      startPosRef.current = null
    },
    [clearTimer, onClick]
  )

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      onLongPress?.(e)
    },
    [onLongPress]
  )

  return {
    isLongPressing,
    touchHandlers: { onTouchStart, onTouchMove, onTouchEnd },
    mouseHandlers: { onContextMenu },
  }
}