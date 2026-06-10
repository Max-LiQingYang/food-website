import { useEffect, useRef, useState } from 'react'

const DEFAULT_OPTIONS: IntersectionObserverInit = { rootMargin: '200px 0px', threshold: 0.01 }
const FALLBACK_TIMEOUT = 3000

/**
 * 元素进入视口后再"挂载"组件（用于首屏下方非关键内容）
 * @param options.rootMargin 默认 '200px 0px'（提前 200px 触发）
 *
 * 超时 fallback：若 IntersectionObserver 回调 3 秒内未触发，自动挂载，
 * 避免因 observer 不触发导致骨架屏永久显示。
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

    // 超时 fallback
    const timeoutId = setTimeout(() => {
      setShouldMount(true)
    }, FALLBACK_TIMEOUT)

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            clearTimeout(timeoutId)
            setShouldMount(true)
            observer.disconnect()
          }
        })
      },
      options ?? DEFAULT_OPTIONS
    )
    observer.observe(ref.current)

    return () => {
      clearTimeout(timeoutId)
      observer.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldMount])

  return { ref, shouldMount }
}
