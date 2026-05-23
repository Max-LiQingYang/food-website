import { useEffect, useRef, useState, useCallback } from 'react'

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void
  threshold?: number
  enabled?: boolean
}

/**
 * Simple pull-to-refresh gesture detection for mobile.
 * Listens to touchstart/touchmove/touchend on the document body.
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 60,
  enabled = true,
}: UsePullToRefreshOptions) {
  const [refreshing, setRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const pulling = useRef(false)

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled || window.scrollY > 5) return
      startY.current = e.touches[0].clientY
      pulling.current = true
    },
    [enabled]
  )

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!pulling.current) return
      const deltaY = e.touches[0].clientY - startY.current
      if (deltaY > 0 && window.scrollY <= 5) {
        // Dampen the pull distance
        setPullDistance(Math.min(deltaY * 0.4, 100))
      }
    },
    []
  )

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return
    pulling.current = false

    if (pullDistance >= threshold) {
      setRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setRefreshing(false)
      }
    }
    setPullDistance(0)
  }, [pullDistance, threshold, onRefresh])

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: true })
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  return { refreshing, pullDistance }
}