import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useState, useRef, useEffect, useCallback } from 'react'
import NotificationBell from './NotificationBell'
import './Navbar.css'

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLLIElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)
  const hamburgerRef = useRef<HTMLButtonElement>(null)

  const displayName = user?.nickname || user?.username || ''

  const handleNavClick = () => {
    setMenuOpen(false)
    setMoreOpen(false)
  }

  // 关闭"更多"下拉菜单（外部点击）
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // 汉堡菜单键盘可访问性
  const handleMenuKeyDown = useCallback((e: KeyboardEvent) => {
    if (!menuOpen) return

    // Esc 关闭菜单
    if (e.key === 'Escape') {
      setMenuOpen(false)
      hamburgerRef.current?.focus()
      return
    }

    // Tab 循环聚焦
    if (e.key === 'Tab' && menuRef.current) {
      const focusableElements = menuRef.current.querySelectorAll<HTMLElement>(
        'a[href], button, [tabindex]:not([tabindex="-1"])'
      )
      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault()
        lastElement.focus()
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault()
        firstElement.focus()
      }
    }
  }, [menuOpen])

  // 汉堡菜单打开/关闭时的焦点管理
  useEffect(() => {
    if (menuOpen) {
      document.addEventListener('keydown', handleMenuKeyDown)
      // 焦点移到菜单的第一个可聚焦元素
      setTimeout(() => {
        const firstFocusable = menuRef.current?.querySelector<HTMLElement>(
          'a[href], button, [tabindex]:not([tabindex="-1"])'
        )
        firstFocusable?.focus()
      }, 100)
      // 禁止页面滚动
      document.body.style.overflow = 'hidden'
    } else {
      document.removeEventListener('keydown', handleMenuKeyDown)
      // 恢复滚动
      document.body.style.overflow = ''
    }

    return () => {
      document.removeEventListener('keydown', handleMenuKeyDown)
      document.body.style.overflow = ''
    }
  }, [menuOpen, handleMenuKeyDown])

  // 遮罩点击关闭菜单
  const handleOverlayClick = () => {
    setMenuOpen(false)
    hamburgerRef.current?.focus()
  }

  // Primary links — 桌面端始终显示
  const primaryLinks = [
    { to: '/', label: '首页' },
    { to: '/recipes', label: '📋 全部食谱' },
    { to: '/recommend', label: '🥬 食材推荐' },
    { to: '/ingredient-search', label: '🔍 手头食材' },
    { to: '/favorites', label: '我的收藏' },
  ]

  // Secondary links — "更多"下拉菜单中显示
  const secondaryLinks = [
    { to: '/challenges', label: '🏆 挑战赛' },
    { to: '/tools', label: '🔪 工具库' },
    { to: '/tags', label: '🏷️ 标签' },
    { to: '/meal-planner', label: '📅 餐单计划' },
    { to: '/cooking-journal', label: '📖 烹饪日志' },
    { to: '/compare', label: '📊 对比' },
    { to: '/preferences', label: '⚙️ 偏好' },
  ]

  // Admin-only links
  const adminLinks = user?.role === 'admin'
    ? [{ to: '/content-quality', label: '📋 内容质量' }]
    : []

  return (
    <nav className="navbar">
      <div className="navbar__inner">
        <Link to="/" className="navbar__logo" onClick={handleNavClick}>
          🍳 美食食谱
        </Link>

        <button
          ref={hamburgerRef}
          className={`navbar__hamburger ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? '关闭菜单' : '打开菜单'}
          aria-expanded={menuOpen}
          aria-controls="navbar-menu"
        >
          <span />
          <span />
          <span />
        </button>

        {/* 导航链接 */}
        <ul
          ref={menuRef}
          className={`navbar__links ${menuOpen ? 'navbar__links--open' : ''}`}
          id="navbar-menu"
          role="menubar"
        >
          {primaryLinks.map(link => (
            <li key={link.to} role="none">
              <Link
                to={link.to}
                className="navbar__link"
                onClick={handleNavClick}
                role="menuitem"
                tabIndex={menuOpen ? 0 : -1}
              >
                {link.label}
              </Link>
            </li>
          ))}

          {/* "更多"下拉菜单（仅桌面端） */}
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
                {adminLinks.length > 0 && <hr className="navbar__more-divider" />}
                {adminLinks.map(link => (
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

          {/* 移动端：汉堡菜单中的二级链接 */}
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
              {adminLinks.length > 0 && (
                <>
                  <div className="navbar__mobile-secondary-label">管理</div>
                  {adminLinks.map(link => (
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
                </>
              )}
            </li>
          )}

          {isAuthenticated && (
            <li role="none">
              <Link
                to="/recipe/new"
                className="navbar__link navbar__link--create"
                onClick={handleNavClick}
                role="menuitem"
                tabIndex={menuOpen ? 0 : -1}
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
      {menuOpen && (
        <div
          className="navbar__overlay"
          onClick={handleOverlayClick}
          role="presentation"
          aria-hidden="true"
        />
      )}
    </nav>
  )
}
