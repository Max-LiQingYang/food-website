import { NavLink, useLocation } from 'react-router-dom'
import { useState, useRef, useCallback } from 'react'
import './MobileBottomNav.css'

const NAV_ITEMS = [
  { path: '/', label: '首页', icon: '🏠' },
  { path: '/search', label: '搜索', icon: '🔍' },
  { path: '/recipe/new', label: '创作', icon: '✏️' },
  { path: '/favorites', label: '收藏', icon: '❤️' },
  { path: '/user', label: '我的', icon: '👤' },
]

export default function MobileBottomNav() {
  const location = useLocation()
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const navRef = useRef<HTMLElement>(null)

  // ── 手势导航：手指左右滑动切换 Tab ──
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX)
  }, [])

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStart === null) return
      const diff = e.changedTouches[0].clientX - touchStart
      setTouchStart(null)

      // Swipe threshold: 60px
      if (Math.abs(diff) < 60) return

      const currentIndex = NAV_ITEMS.findIndex(
        item =>
          item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path)
      )
      if (currentIndex === -1) return

      // 向右滑 → 上一个 Tab；向左滑 → 下一个 Tab
      const targetIndex = diff > 0
        ? Math.max(0, currentIndex - 1)
        : Math.min(NAV_ITEMS.length - 1, currentIndex + 1)

      if (targetIndex !== currentIndex) {
        const targetPath = NAV_ITEMS[targetIndex].path
        // Use window.location for full navigation
        window.location.href = targetPath
      }
    },
    [touchStart, location.pathname]
  )

  const isActivePath = (path: string) => {
    if (path === '/') return location.pathname === '/'
    if (path === '/user') return location.pathname.startsWith('/user') || location.pathname.startsWith('/login')
    return location.pathname.startsWith(path)
  }

  return (
    <nav
      className="mobile-bottom-nav"
      aria-label="页脚导航"
      ref={navRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {NAV_ITEMS.map(item => {
        const isActive = isActivePath(item.path)

        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={`mobile-bottom-nav__item ${isActive ? 'is-active' : ''}`}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="mobile-bottom-nav__icon" aria-hidden="true">{item.icon}</span>
            <span className="mobile-bottom-nav__label">{item.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}