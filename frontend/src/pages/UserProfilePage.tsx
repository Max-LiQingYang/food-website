import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  getUserProfile,
  getUserRecipes,
  getUserFavorites,
  getUserStats,
  type Recipe,
  type UserStats,
} from '../api'
import RecipeCard from '../components/RecipeCard'
import './UserProfilePage.css'

type TabType = 'recipes' | 'favorites'

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>()
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('recipes')

  // Recipes state
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [recipesTotal, setRecipesTotal] = useState(0)
  const [recipesPage, setRecipesPage] = useState(1)
  const [recipesLoading, setRecipesLoading] = useState(true)

  // Favorites state
  const [favorites, setFavorites] = useState<Recipe[]>([])
  const [favoritesTotal, setFavoritesTotal] = useState(0)
  const [favoritesPage, setFavoritesPage] = useState(1)
  const [favoritesLoading, setFavoritesLoading] = useState(true)

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const pageSize = 12

  // Load profile + stats
  useEffect(() => {
    if (!id) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setLoading(true)

    Promise.all([
      getUserProfile(id),
      getUserStats(id),
    ])
      .then(([profileRes, statsRes]) => {
        // Unwrap API response ({ code, message, data })
        const p = profileRes.data ?? profileRes
        const s = statsRes.data ?? statsRes
        setProfile(p)
        setStats(s)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  // Load recipes tab
  useEffect(() => {
    if (!id || activeTab !== 'recipes') return
    setRecipesLoading(true)
    getUserRecipes({ userId: id, page: recipesPage, pageSize })
      .then((res: any) => {
        const d = res.data ?? res
        setRecipes(d.list || [])
        setRecipesTotal(d.total || 0)
      })
      .catch(() => {})
      .finally(() => setRecipesLoading(false))
  }, [id, activeTab, recipesPage])

  // Load favorites tab
  useEffect(() => {
    if (!id || activeTab !== 'favorites') return
    setFavoritesLoading(true)
    getUserFavorites({ userId: id, page: favoritesPage, pageSize })
      .then((res: any) => {
        const d = res.data ?? res
        setFavorites(d.list || [])
        setFavoritesTotal(d.total || 0)
      })
      .catch(() => {})
      .finally(() => setFavoritesLoading(false))
  }, [id, activeTab, favoritesPage])

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-skeleton">
          <div
            className="skeleton-box"
            style={{ width: 80, height: 80, borderRadius: '50%', margin: '0 auto' }}
          />
          <div
            className="skeleton-box skeleton-heading"
            style={{ width: '40%', margin: '16px auto' }}
          />
          <div className="skeleton-box skeleton-line short" style={{ margin: '0 auto' }} />
        </div>
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div className="profile-page">
        <div className="profile-notfound">
          <div className="profile-notfound__icon">👤</div>
          <h2>用户不存在</h2>
          <p>该用户可能已注销</p>
          <Link to="/" className="btn btn--primary">
            返回首页
          </Link>
        </div>
      </div>
    )
  }

  const displayName = profile.nickname || profile.username
  const currentList = activeTab === 'recipes' ? recipes : favorites
  const currentTotal = activeTab === 'recipes' ? recipesTotal : favoritesTotal
  const currentLoading = activeTab === 'recipes' ? recipesLoading : favoritesLoading
  const currentPage = activeTab === 'recipes' ? recipesPage : favoritesPage
  const setCurrentPage = activeTab === 'recipes' ? setRecipesPage : setFavoritesPage
  const emptyIcon = activeTab === 'recipes' ? '📝' : '❤️'
  const emptyText = activeTab === 'recipes' ? '还没有发布食谱' : '还没有收藏食谱'

  return (
    <div className="profile-page">
      {/* Header */}
      <div className="profile-header">
        <div className="profile-avatar">{displayName.charAt(0).toUpperCase()}</div>
        <h1 className="profile-name">{displayName}</h1>
        {profile.nickname && <p className="profile-username">@{profile.username}</p>}
        <p className="profile-joined">
          加入于 {new Date(profile.createdAt).toLocaleDateString('zh-CN')}
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="profile-stats">
          <div className="profile-stats__card">
            <span className="profile-stats__icon">📝</span>
            <span className="profile-stats__value">{stats.recipeCount ?? 0}</span>
            <span className="profile-stats__label">食谱</span>
          </div>
          <div className="profile-stats__card">
            <span className="profile-stats__icon">❤️</span>
            <span className="profile-stats__value">{stats.favoriteCount ?? 0}</span>
            <span className="profile-stats__label">收藏</span>
          </div>
          <div className="profile-stats__card">
            <span className="profile-stats__icon">💬</span>
            <span className="profile-stats__value">{stats.commentCount ?? 0}</span>
            <span className="profile-stats__label">评论</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="profile-tabs">
        <button
          className={`profile-tab ${activeTab === 'recipes' ? 'profile-tab--active' : ''}`}
          onClick={() => setActiveTab('recipes')}
        >
          发布的食谱 {recipesTotal > 0 && <span className="profile-tab__count">({recipesTotal})</span>}
        </button>
        <button
          className={`profile-tab ${activeTab === 'favorites' ? 'profile-tab--active' : ''}`}
          onClick={() => setActiveTab('favorites')}
        >
          收藏的食谱 {favoritesTotal > 0 && <span className="profile-tab__count">({favoritesTotal})</span>}
        </button>
      </div>

      {/* Content */}
      <div className="profile-content">
        {currentLoading ? (
          <div className="profile-grid">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="profile-card-skeleton">
                <div className="skeleton-box skeleton-cover" />
                <div className="skeleton-box skeleton-line" style={{ margin: '12px 14px' }} />
                <div
                  className="skeleton-box skeleton-line short"
                  style={{ margin: '0 14px 14px' }}
                />
              </div>
            ))}
          </div>
        ) : currentList.length === 0 ? (
          <div className="profile-empty">
            <div className="profile-empty__icon">{emptyIcon}</div>
            <p className="profile-empty__text">{emptyText}</p>
            {activeTab === 'recipes' && (
              <Link to="/create" className="btn btn--primary" style={{ marginTop: 12 }}>
                发布第一个食谱
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="profile-grid">
              {currentList.map(recipe => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
            {currentTotal > pageSize && (
              <div className="profile-pagination">
                <button
                  className="pagination-btn"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  上一页
                </button>
                <span className="pagination-info">
                  {currentPage} / {Math.ceil(currentTotal / pageSize)}
                </span>
                <button
                  className="pagination-btn"
                  disabled={currentPage >= Math.ceil(currentTotal / pageSize)}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  下一页
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}