import { useState, useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

/**
 * 数字滚动动画 Hook — 从 0 动画到目标值
 * @param target 目标数字
 * @param duration 动画持续毫秒
 * @param startOnMount 是否在挂载时自动开始
 */
export function useCountUp(target: number, duration = 1200, startOnMount = true) {
  const [value, setValue] = useState(0)
  const [started, setStarted] = useState(startOnMount)
  const prefersReducedMotion = usePrefersReducedMotion()
  const startTimeRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  const start = () => setStarted(true)

  useEffect(() => {
    if (!started) return
    if (prefersReducedMotion || duration <= 0) {
      setValue(target)
      return
    }
    startTimeRef.current = null

    const step = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp
      }
      const elapsed = timestamp - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)

      // Ease out quad
      const eased = progress * (2 - progress)
      setValue(Math.round(target * eased))

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step)
      }
    }

    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [target, duration, started, prefersReducedMotion])

  return { value, start }
}

export default useCountUp