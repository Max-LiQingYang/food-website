import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const MOTION_SCALE_VAR = '--motion-duration-scale'
const MOTION_SCALE_NORMAL = '1'
const MOTION_SCALE_REDUCED = '0.01'

interface MotionPreferenceContextValue {
  prefersReducedMotion: boolean
}

const MotionPreferenceContext = createContext<MotionPreferenceContextValue | null>(null)

function readPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}

function applyMotionScale(prefersReducedMotion: boolean) {
  if (typeof document === 'undefined') return
  document.documentElement.style.setProperty(
    MOTION_SCALE_VAR,
    prefersReducedMotion ? MOTION_SCALE_REDUCED : MOTION_SCALE_NORMAL
  )
}

export function MotionPreferenceProvider({ children }: { children: ReactNode }) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return

    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY)
    const syncPreference = () => {
      const nextValue = mediaQuery.matches
      setPrefersReducedMotion(nextValue)
      applyMotionScale(nextValue)
    }

    syncPreference()
    mediaQuery.addEventListener('change', syncPreference)

    return () => {
      mediaQuery.removeEventListener('change', syncPreference)
    }
  }, [])

  useEffect(() => {
    applyMotionScale(prefersReducedMotion)
  }, [prefersReducedMotion])

  const value = useMemo(
    () => ({ prefersReducedMotion }),
    [prefersReducedMotion]
  )

  return (
    <MotionPreferenceContext.Provider value={value}>
      {children}
    </MotionPreferenceContext.Provider>
  )
}

export function useMotionPreference(): MotionPreferenceContextValue {
  const context = useContext(MotionPreferenceContext)
  if (!context) throw new Error('useMotionPreference must be used within MotionPreferenceProvider')
  return context
}

export function getMotionSafeScrollBehavior(): ScrollBehavior {
  return readPrefersReducedMotion() ? 'auto' : 'smooth'
}

export { REDUCED_MOTION_QUERY }
export default MotionPreferenceContext
