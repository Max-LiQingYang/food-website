import Router from './router'
import './global.css'

export default function App() {
  return <Router />
}

// ── 移动端输入框 focus 防键盘遮挡 ──
if (typeof window !== 'undefined') {
  document.addEventListener('focusin', ((e: FocusEvent) => {
    const target = e.target as HTMLElement | null
    if (!target) return
    if (/^(INPUT|TEXTAREA|SELECT)$/i.test(target.tagName)) {
      // 延迟等待键盘弹起后再滚动
      setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
    }
  }) as EventListener)
}