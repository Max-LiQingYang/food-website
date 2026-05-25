import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useState, useRef, useCallback, useEffect } from 'react'
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
  const navigate = useNavigate()
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [visible, setVisible] = useState(true)
  const navRef = useRef<HTMLElement>(null)
  const lastScrollY = useRef(0)

  // ── 滚动隐藏/显示 ──
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        // 向下滚动 → 隐藏
        setVisible(false)
      } else if (currentScrollY < lastScrollY.current) {
        // 向上滚动 → 显示
        setVisible(true)
      }
      lastScrollY.current = currentScrollY
    }

    // Use passive listener for performance
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // ── 手势导航：手指左右滑动切换 Tab（useNavigate 修复全页刷新） ──
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
        // ✅ 修复：React Router navigate 替代 window.location.href（避免全页刷新）
        navigate(targetPath)
      }
    },
    [touchStart, location.pathname, navigate]
  )

  const isActivePath = (path: string) => {
    if (path === '/') return location.pathname === '/'
    if (path === '/user') return location.pathname.startsWith('/user') || location.pathname.startsWith('/login')
    return location.pathname.startsWith(path)
  }

  return (
    <nav
      className={`mobile-bottom-nav ${visible ? '' : 'mobile-bottom-nav--hidden'}`}
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
            {/* 活动指示器底部条 */}
            {isActive && <span className="mobile-bottom-nav__indicator" />}
          </NavLink>
        )
      })}
    </nav>
  )
}