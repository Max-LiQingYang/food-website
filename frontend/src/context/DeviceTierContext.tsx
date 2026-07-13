import { createContext, useContext, useEffect, useMemo, useState, useRef, type ReactNode } from 'react'

/* ═══════════════════════════════════════════════════════════════════════════
   DeviceTierContext — 01-design.md §7.1/7.2 + J-001
   双重机制：body.low-end class（CSS/Playwright 断言）+ React Context（组件订阅）
   ═══════════════════════════════════════════════════════════════════════════ */

export type DeviceTier = 'high-end' | 'low-end'

interface DeviceTierContextValue {
  tier: DeviceTier
  isLowEnd: boolean
  /** 帧率采样结果：null=未采样，number=最近3s平均fps */
  fps: number | null
}

const DeviceTierContext = createContext<DeviceTierContextValue | null>(null)

/** 硬指标检测：内存 ≤ 4GB 或 CPU ≤ 4 核 → 低端 */
function detectHardwareTier(): DeviceTier {
  if (typeof navigator === 'undefined') return 'high-end'
  const nav = navigator as any
  const memory = nav.deviceMemory
  const cores = nav.hardwareConcurrency
  if ((memory != null && memory <= 4) || (cores != null && cores <= 4)) {
    return 'low-end'
  }
  return 'high-end'
}

function applyLowEndClass(isLowEnd: boolean) {
  document.body.classList.toggle('low-end', isLowEnd)
}

export function DeviceTierProvider({ children }: { children: ReactNode }) {
  const [tier, setTier] = useState<DeviceTier>(() => detectHardwareTier())
  const [fps, setFps] = useState<number | null>(null)
  const rafRef = useRef<number>(0)
  const frameTimesRef = useRef<number[]>([])
  const degradedRef = useRef(false)

  // Apply body.low-end class
  useEffect(() => {
    applyLowEndClass(tier === 'low-end')
  }, [tier])

  // ── J-006 帧率采样窗口：window.onload 后 1s 启动，连续 3s 平均 fps<45 触发降级 ──
  useEffect(() => {
    if (tier === 'low-end') return // Already low-end, skip sampling
    if (degradedRef.current) return

    let startTime = 0
    let lastFrameTime = 0
    let sampleStarted = false
    let sampleStart = 0

    const sample = (timestamp: number) => {
      if (!sampleStarted) {
        // Wait 1s after onload before starting
        if (timestamp < startTime + 1000) {
          rafRef.current = requestAnimationFrame(sample)
          return
        }
        sampleStarted = true
        sampleStart = timestamp
        lastFrameTime = timestamp
        frameTimesRef.current = []
        rafRef.current = requestAnimationFrame(sample)
        return
      }

      const delta = timestamp - lastFrameTime
      lastFrameTime = timestamp
      frameTimesRef.current.push(delta)

      const elapsed = timestamp - sampleStart

      // After 3s of sampling, check average
      if (elapsed >= 3000 && frameTimesRef.current.length > 0) {
        const avgFrameTime = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length
        const avgFps = 1000 / avgFrameTime
        setFps(Math.round(avgFps))

        if (avgFps < 45) {
          setTier('low-end')
          degradedRef.current = true
          applyLowEndClass(true)
        }
        return // Stop sampling
      }

      rafRef.current = requestAnimationFrame(sample)
    }

    const onLoad = () => {
      startTime = performance.now()
      rafRef.current = requestAnimationFrame(sample)
    }

    if (document.readyState === 'complete') {
      startTime = performance.now()
      rafRef.current = requestAnimationFrame(sample)
    } else {
      window.addEventListener('load', onLoad)
    }

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('load', onLoad)
    }
  }, [tier])

  const value = useMemo<DeviceTierContextValue>(
    () => ({ tier, isLowEnd: tier === 'low-end', fps }),
    [tier, fps]
  )

  return (
    <DeviceTierContext.Provider value={value}>
      {children}
    </DeviceTierContext.Provider>
  )
}

export function useDeviceTier(): DeviceTierContextValue {
  const ctx = useContext(DeviceTierContext)
  if (!ctx) throw new Error('useDeviceTier must be used within DeviceTierProvider')
  return ctx
}

export default DeviceTierContext
