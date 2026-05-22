import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState } from 'react'
import './Navbar.css'

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth()
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
        >
          <span />
          <span />
          <span />
        </button>

        <div className={`navbar__links ${menuOpen ? 'navbar__links--open' : ''}`}>
          <Link to="/" className="navbar__link" onClick={handleNavClick}>
            首页
          </Link>
          <Link to="/recommend" className="navbar__link" onClick={handleNavClick}>
            🥬 食材推荐
          </Link>
          <Link to="/favorites" className="navbar__link" onClick={handleNavClick}>
            我的收藏
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
      {menuOpen && <div className="navbar__overlay" onClick={() => setMenuOpen(false)} />}
    </nav>
  )
}
