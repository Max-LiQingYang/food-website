import { createContext, useContext, useEffect, useMemo, useState, useRef, type ReactNode } from 'react'

/* ═══════════════════════════════════════════════════════════════════════════
   ParticleProvider — 01-design.md §7.3 + J-002
   App-level Provider + sessionStorage 持久化降级标记
   ═══════════════════════════════════════════════════════════════════════════ */

export type ParticleReason = 'high-end' | 'low-end' | 'frame-degraded' | 'reduced-motion'

interface ParticleContextValue {
  enabled: boolean
  reason: ParticleReason
  /** 运行时标记粒子已降级（当前页面生命周期内） */
  degrade: (reason: ParticleReason) => void
}

const ParticleContext = createContext<ParticleContextValue | null>(null)

const SESSION_KEY = 'particle.degraded'

function getInitialReason(): ParticleReason {
  // Check sessionStorage persistence
  try {
    const stored = sessionStorage.getItem(SESSION_KEY)
    if (stored === 'low-end' || stored === 'frame-degraded' || stored === 'reduced-motion') {
      return stored as ParticleReason
    }
  } catch { /* ignore */ }

  // Check reduced motion
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return 'reduced-motion'
  }

  // Check hardware
  if (typeof navigator !== 'undefined') {
    const nav = navigator as any
    if ((nav.deviceMemory != null && nav.deviceMemory <= 4) || (nav.hardwareConcurrency != null && nav.hardwareConcurrency <= 4)) {
      return 'low-end'
    }
  }

  return 'high-end'
}

export function ParticleProvider({ children }: { children: ReactNode }) {
  const [reason, setReason] = useState<ParticleReason>(getInitialReason)
  const degradedRef = useRef(reason !== 'high-end')

  const enabled = reason === 'high-end'

  const degrade = (newReason: ParticleReason) => {
    if (degradedRef.current) return
    degradedRef.current = true
    setReason(newReason)
    try {
      sessionStorage.setItem(SESSION_KEY, newReason)
    } catch { /* ignore */ }
    console.info(`[ParticleGuard] 粒子动效已关闭，原因: ${newReason}`)
  }

  // Listen for reduced-motion changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) degrade('reduced-motion')
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const value = useMemo<ParticleContextValue>(
    () => ({ enabled, reason, degrade }),
    [enabled, reason]
  )

  return (
    <ParticleContext.Provider value={value}>
      {children}
    </ParticleContext.Provider>
  )
}

export function useParticleGuard(): ParticleContextValue {
  const ctx = useContext(ParticleContext)
  if (!ctx) throw new Error('useParticleGuard must be used within ParticleProvider')
  return ctx
}

export default ParticleContext
