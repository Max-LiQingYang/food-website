import { NavLink, useLocation } from 'react-router-dom'
import './MobileBottomNav.css'

const NAV_ITEMS = [
  { path: '/', label: '首页', icon: '🏠' },
  { path: '/search', label: '搜索', icon: '🔍' },
  { path: '/recommend', label: '食材推荐', icon: '🥬' },
  { path: '/favorites', label: '收藏', icon: '❤️' },
  { path: '/login', label: '个人', icon: '👤' },
]

export default function MobileBottomNav() {
  const location = useLocation()

  return (
    <nav className="mobile-bottom-nav" aria-label="页脚导航">
      {NAV_ITEMS.map(item => {
        const isActive =
          item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path)

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