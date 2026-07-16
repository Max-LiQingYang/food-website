import Router from './router'
import { useStaggerReveal } from './hooks/useStaggerReveal'
import { useParallax } from './hooks/useParallax'
import { useEffect } from 'react'
import { getMotionSafeScrollBehavior } from './context/MotionPreferenceContext'
import useOnlineStatus from './hooks/useOnlineStatus'
import OfflineBanner from './components/OfflineBanner'
import './global.css'

export default function App() {
  useStaggerReveal()
  useParallax()
  const { status } = useOnlineStatus()

  useEffect(() => {
    document.body.classList.add('has-bottom-nav')
    return () => document.body.classList.remove('has-bottom-nav')
  }, [])

  return (
    <>
      <OfflineBanner status={status} />
      <Router />
    </>
  )
}

// ── 移动端输入框 focus 防键盘遮挡 ──
if (typeof window !== 'undefined') {
  document.addEventListener('focusin', ((e: FocusEvent) => {
    const target = e.target as HTMLElement | null
    if (!target) return
    if (/^(INPUT|TEXTAREA|SELECT)$/i.test(target.tagName)) {
      // 延迟等待键盘弹起后再滚动
      setTimeout(() => {
        target.scrollIntoView({ behavior: getMotionSafeScrollBehavior(), block: 'center' })
      }, 300)
    }
  }) as EventListener)
}
