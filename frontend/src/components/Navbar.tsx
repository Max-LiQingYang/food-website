import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useState } from 'react'
import NotificationBell from './NotificationBell'
import './Navbar.css'

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const displayName = user?.nickname || user?.username || ''

  const handleNavClick = () => {
    setMenuOpen(false)
  }

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

        <div className={`navbar__links ${menuOpen ? 'navbar__links--open' : ''}`} id="navbar-menu" role="menubar">
          <Link to="/" className="navbar__link" onClick={handleNavClick}>
            首页
          </Link>
          <Link to="/recommend" className="navbar__link" onClick={handleNavClick}>
            🥬 食材推荐
          </Link>
          <Link to="/ingredient-search" className="navbar__link" onClick={handleNavClick}>
            🔍 手头食材
          </Link>
          <Link to="/challenges" className="navbar__link" onClick={handleNavClick}>
            🏆 挑战赛
          </Link>
          <Link to="/tools" className="navbar__link" onClick={handleNavClick}>
            🔪 工具库
          </Link>
          <Link to="/favorites" className="navbar__link" onClick={handleNavClick}>
            我的收藏
          </Link>
          <Link to="/tags" className="navbar__link" onClick={handleNavClick}>
            🏷️ 标签
          </Link>
          <Link to="/meal-planner" className="navbar__link" onClick={handleNavClick}>
            📅 餐单计划
          </Link>
          <Link to="/cooking-journal" className="navbar__link" onClick={handleNavClick}>
            📖 烹饪日志
          </Link>
          <Link to="/compare" className="navbar__link" onClick={handleNavClick}>
            📊 对比
          </Link>
          <Link to="/preferences" className="navbar__link" onClick={handleNavClick}>
            ⚙️ 偏好
          </Link>
          {isAuthenticated && (
            <Link
              to="/recipe/new"
              className="navbar__link navbar__link--create"
              onClick={handleNavClick}
            >
              发布食谱
            </Link>
          )}
        </div>

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
