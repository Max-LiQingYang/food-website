import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './BottomNav.css'

export default function BottomNav() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const profilePath = user?.id ? `/user/${user.id}` : '/login'

  const handleCreateClick = (e: React.MouseEvent) => {
    e.preventDefault()
    navigate('/recipe/new')
  }

  return (
    <nav className="bottom-nav" aria-label="主导航">
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`
        }
        aria-label="首页"
      >
        <span className="bottom-nav__icon" aria-hidden="true">🏠</span>
        <span className="bottom-nav__label">首页</span>
      </NavLink>

      {/* AC3: 收藏 第 2 位 */}
      <NavLink
        to="/favorites"
        className={({ isActive }) =>
          `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`
        }
        aria-label="收藏"
      >
        <span className="bottom-nav__icon" aria-hidden="true">❤️</span>
        <span className="bottom-nav__label">收藏</span>
      </NavLink>

      <NavLink
        to="/search"
        className={({ isActive }) =>
          `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`
        }
        aria-label="搜索"
      >
        <span className="bottom-nav__icon" aria-hidden="true">🔍</span>
        <span className="bottom-nav__label">搜索</span>
      </NavLink>

      <NavLink
        to="/recipe/new"
        onClick={handleCreateClick}
        className={({ isActive }) =>
          `bottom-nav__item bottom-nav__item--fab ${isActive ? 'bottom-nav__item--active' : ''}`
        }
        aria-label="创建食谱"
      >
        <span className="bottom-nav__icon" aria-hidden="true">➕</span>
        <span className="bottom-nav__label">创建</span>
      </NavLink>

      <NavLink
        to={profilePath}
        className={({ isActive }) =>
          `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`
        }
        aria-label="我的"
      >
        <span className="bottom-nav__icon" aria-hidden="true">👤</span>
        <span className="bottom-nav__label">我的</span>
      </NavLink>
    </nav>
  )
}
