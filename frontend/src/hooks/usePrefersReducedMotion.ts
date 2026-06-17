import { useMotionPreference } from '../context/MotionPreferenceContext'

export function usePrefersReducedMotion(): boolean {
  return useMotionPreference().prefersReducedMotion
}

export default usePrefersReducedMotion
