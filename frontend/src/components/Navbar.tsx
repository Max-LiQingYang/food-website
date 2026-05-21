import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Navbar.css'

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <nav className="navbar">
      <div className="navbar__inner">
        <Link to="/" className="navbar__logo">
          🍳 美食食谱
        </Link>

        <div className="navbar__links">
          <Link to="/" className="navbar__link">首页</Link>
          <Link to="/favorites" className="navbar__link">我的收藏</Link>
        </div>

        <div className="navbar__auth">
          {isAuthenticated ? (
            <div className="navbar__user">
              <span className="navbar__username">{user?.username}</span>
              <button
                className="navbar__logout-btn"
                onClick={logout}
              >
                退出
              </button>
            </div>
          ) : (
            <button
              className="navbar__login-btn"
              onClick={() => navigate('/login')}
            >
              登录/注册
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}