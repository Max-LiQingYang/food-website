import { useEffect, useRef, useState } from 'react'

const DEFAULT_OPTIONS: IntersectionObserverInit = { rootMargin: '200px 0px', threshold: 0.01 }

/**
 * 元素进入视口后再"挂载"组件（用于首屏下方非关键内容）
 * @param options.rootMargin 默认 '200px 0px'（提前 200px 触发）
 */
export function useDeferredMount<T extends HTMLElement = HTMLDivElement>(
  options?: IntersectionObserverInit
) {
  const ref = useRef<T | null>(null)
  const [shouldMount, setShouldMount] = useState(false)

  useEffect(() => {
    if (shouldMount) return
    // SSR / 不支持 IO：立即挂载
    if (typeof IntersectionObserver === 'undefined') {
      setShouldMount(true)
      return
    }
    if (!ref.current) return

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setShouldMount(true)
            observer.disconnect()
          }
        })
      },
      options ?? DEFAULT_OPTIONS
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldMount])

  return { ref, shouldMount }
}
