import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getUserProfile, getUserRecipes } from '../api'
import RecipeCard from '../components/RecipeCard'
import type { Recipe } from '../api'
import './UserProfilePage.css'

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>()
  const [profile, setProfile] = useState<any>(null)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [recipesLoading, setRecipesLoading] = useState(true)
  const pageSize = 12

  useEffect(() => {
    if (!id) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setLoading(true)
    getUserProfile(id)
      .then((data: any) => setProfile(data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!id) return
    setRecipesLoading(true)
    getUserRecipes({ userId: id, page, pageSize })
      .then((data: any) => {
        setRecipes(data.list || [])
        setTotal(data.total || 0)
      })
      .catch(() => {})
      .finally(() => setRecipesLoading(false))
  }, [id, page])

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

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-avatar">{displayName.charAt(0).toUpperCase()}</div>
        <h1 className="profile-name">{displayName}</h1>
        {profile.nickname && <p className="profile-username">@{profile.username}</p>}
        <p className="profile-joined">
          加入于 {new Date(profile.createdAt).toLocaleDateString('zh-CN')}
        </p>
      </div>

      <div className="profile-recipes-section">
        <h2 className="profile-section-title">
          发布的食谱 {total > 0 && <span className="profile-count">({total})</span>}
        </h2>

        {recipesLoading ? (
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
        ) : recipes.length === 0 ? (
          <div className="profile-empty">
            <div className="profile-empty__icon">📝</div>
            <p className="profile-empty__text">还没有发布食谱</p>
          </div>
        ) : (
          <>
            <div className="profile-grid">
              {recipes.map(recipe => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
            {total > pageSize && (
              <div className="profile-pagination">
                <button
                  className="pagination-btn"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  上一页
                </button>
                <span className="pagination-info">
                  {page} / {Math.ceil(total / pageSize)}
                </span>
                <button
                  className="pagination-btn"
                  disabled={page >= Math.ceil(total / pageSize)}
                  onClick={() => setPage(p => p + 1)}
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
