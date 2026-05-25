import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useState, useRef, useEffect } from 'react'
import NotificationBell from './NotificationBell'
import './Navbar.css'

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLLIElement>(null)

  const displayName = user?.nickname || user?.username || ''

  const handleNavClick = () => {
    setMenuOpen(false)
    setMoreOpen(false)
  }

  // Close "更多" dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Primary links — always visible on desktop
  const primaryLinks = [
    { to: '/', label: '首页' },
    { to: '/recommend', label: '🥬 食材推荐' },
    { to: '/ingredient-search', label: '🔍 手头食材' },
    { to: '/favorites', label: '我的收藏' },
  ]

  // Secondary links — shown in "更多" dropdown
  const secondaryLinks = [
    { to: '/challenges', label: '🏆 挑战赛' },
    { to: '/tools', label: '🔪 工具库' },
    { to: '/tags', label: '🏷️ 标签' },
    { to: '/meal-planner', label: '📅 餐单计划' },
    { to: '/cooking-journal', label: '📖 烹饪日志' },
    { to: '/compare', label: '📊 对比' },
    { to: '/preferences', label: '⚙️ 偏好' },
  ]

  return (
    <nav className="navbar">
      <div className="navbar__inner">
        <Link to="/" className="navbar__logo" onClick={handleNavClick}>
          🍳 美食食谱
        </Link>

        <button
          className={`navbar__hamburger ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="菜单"
          aria-expanded={menuOpen}
          aria-controls="navbar-menu"
        >
          <span />
          <span />
          <span />
        </button>

        {/* Desktop links */}
        <ul
          className={`navbar__links ${menuOpen ? 'navbar__links--open' : ''}`}
          id="navbar-menu"
          role="menubar"
        >
          {primaryLinks.map(link => (
            <li key={link.to} role="none">
              <Link to={link.to} className="navbar__link" onClick={handleNavClick} role="menuitem">
                {link.label}
              </Link>
            </li>
          ))}

          {/* "更多" dropdown */}
          <li className="navbar__more" ref={moreRef} role="none">
            <button
              className={`navbar__more-btn ${moreOpen ? 'is-open' : ''}`}
              onClick={() => setMoreOpen(!moreOpen)}
              aria-haspopup="true"
              aria-expanded={moreOpen}
            >
              更多 ▾
            </button>
            {moreOpen && (
              <div className="navbar__more-dropdown" role="menu">
                {secondaryLinks.map(link => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="navbar__more-item"
                    onClick={handleNavClick}
                    role="menuitem"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </li>

          {/* Mobile-only: secondary links in hamburger menu */}
          {menuOpen && (
            <li className="navbar__mobile-secondary" role="none">
              <div className="navbar__mobile-secondary-label">更多功能</div>
              {secondaryLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="navbar__link"
                  onClick={handleNavClick}
                  role="menuitem"
                >
                  {link.label}
                </Link>
              ))}
            </li>
          )}

          {isAuthenticated && (
            <li role="none">
              <Link
                to="/recipe/new"
                className="navbar__link navbar__link--create"
                onClick={handleNavClick}
                role="menuitem"
              >
                发布食谱
              </Link>
            </li>
          )}
        </ul>

        <div className="navbar__actions">
          <NotificationBell />
          <button
            className="navbar__theme-toggle"
            onClick={toggleTheme}
            aria-label={isDark ? '切换到浅色模式' : '切换到深色模式'}
            title={isDark ? '切换到浅色模式' : '切换到深色模式'}
          >
            {isDark ? '☀️' : '🌙'}
          </button>

          <div className="navbar__auth">
            {isAuthenticated ? (
              <div className="navbar__user">
                <Link
                  to={`/user/${user?.id}`}
                  className="navbar__username"
                  title={user?.username}
                  onClick={handleNavClick}
                >
                  {displayName}
                </Link>
                <button className="navbar__logout-btn" onClick={logout}>
                  退出
                </button>
              </div>
            ) : (
              <button className="navbar__login-btn" onClick={() => navigate('/login')}>
                登录/注册
              </button>
            )}
          </div>
        </div>
      </div>
      {menuOpen && <div className="navbar__overlay" onClick={() => setMenuOpen(false)} role="presentation" />}
    </nav>
  )
}