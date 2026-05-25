import { useCallback, useRef, useState } from 'react'

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>
  threshold?: number
  maxPullDistance?: number
}

interface PullToRefreshResult {
  pullDistance: number
  isRefreshing: boolean
  touchHandlers: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: (e: React.TouchEvent) => void
  }
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPullDistance = 120,
}: PullToRefreshOptions): PullToRefreshResult {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startY = useRef(0)
  const pulling = useRef(false)
  const scrollTop = useRef(0)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    // Only activate if scrolled to top
    const el = e.currentTarget as HTMLElement
    scrollTop.current = el.scrollTop
    if (scrollTop.current > 10) return

    startY.current = e.touches[0].clientY
    pulling.current = false
  }, [])

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (isRefreshing || scrollTop.current > 10) return

      const deltaY = e.touches[0].clientY - startY.current
      if (deltaY > 0) {
        pulling.current = true
        // Apply resistance for smoother feel
        const resisted = Math.min(deltaY * 0.4, maxPullDistance)
        setPullDistance(resisted)
      }
    },
    [isRefreshing, maxPullDistance]
  )

  const onTouchEnd = useCallback(
    async (_e: React.TouchEvent) => {
      if (!pulling.current || isRefreshing) {
        setPullDistance(0)
        return
      }

      if (pullDistance >= threshold) {
        setIsRefreshing(true)
        setPullDistance(threshold) // Hold at threshold position
        try {
          await onRefresh()
        } finally {
          setIsRefreshing(false)
          setPullDistance(0)
        }
      } else {
        setPullDistance(0)
      }
      pulling.current = false
    },
    [pullDistance, threshold, isRefreshing, onRefresh]
  )

  return {
    pullDistance,
    isRefreshing,
    touchHandlers: { onTouchStart, onTouchMove, onTouchEnd },
  }
}
