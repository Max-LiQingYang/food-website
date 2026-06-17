import { useCallback } from 'react'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

function withMotionSafeBehavior<T extends ScrollToOptions | ScrollIntoViewOptions>(
  options: T,
  prefersReducedMotion: boolean
): T {
  if (!prefersReducedMotion) return options
  return { ...options, behavior: 'auto' }
}

export function useSmartScroll() {
  const prefersReducedMotion = usePrefersReducedMotion()

  const scrollTo = useCallback((options: ScrollToOptions) => {
    window.scrollTo(withMotionSafeBehavior(options, prefersReducedMotion))
  }, [prefersReducedMotion])

  const scrollIntoView = useCallback((element: Element | null | undefined, options?: ScrollIntoViewOptions) => {
    if (!element) return
    element.scrollIntoView(withMotionSafeBehavior(options ?? { behavior: prefersReducedMotion ? 'auto' : 'smooth' }, prefersReducedMotion))
  }, [prefersReducedMotion])

  return { scrollTo, scrollIntoView, prefersReducedMotion }
}

export default useSmartScroll
