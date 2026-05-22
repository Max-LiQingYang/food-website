import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getRecipeById, deleteRecipe } from '../api'
import { addFavorite, removeFavorite, getFavoriteStatus } from '../api'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import CommentSection from '../components/CommentSection'
import type { RecipeDetail } from '../api'
import './RecipeDetailPage.css'

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const { isAuthenticated, user } = useAuth()

  const [recipe, setRecipe] = useState<RecipeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [isFavorited, setIsFavorited] = useState(false)
  const [favLoading, setFavLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isAuthor = isAuthenticated && user && recipe && recipe.userId === user.id

  useEffect(() => {
    if (!id) {
      setNotFound(true)
      setLoading(false)
      return
    }

    setLoading(true)
    setNotFound(false)

    Promise.all([
      getRecipeById(id),
      getFavoriteStatus(id).catch(() => ({ isFavorited: false, favoriteId: '' })),
    ])
      .then(([recipeData, favStatus]: any) => {
        setRecipe(recipeData as RecipeDetail)
        setIsFavorited(favStatus.isFavorited)
      })
      .catch(() => {
        setNotFound(true)
      })
      .finally(() => setLoading(false))
  }, [id])

  const handleFavoriteToggle = async () => {
    if (!id || favLoading) return
    const token = localStorage.getItem('token')
    if (!token) {
      toast.warning('请先登录')
      navigate('/login')
      return
    }

    setFavLoading(true)
    try {
      if (isFavorited) {
        await removeFavorite(id)
        setIsFavorited(false)
        toast.success('已取消收藏')
      } else {
        await addFavorite(id)
        setIsFavorited(true)
        toast.success('已收藏')
      }
    } catch (err: any) {
      toast.error(err?.message || '操作失败')
    } finally {
      setFavLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!id || !isAuthor || deleting) return
    if (!window.confirm('确定要删除这份食谱吗？此操作不可撤销。')) return

    setDeleting(true)
    try {
      await deleteRecipe(id)
      toast.success('食谱已删除')
      navigate('/')
    } catch (err: any) {
      toast.error(err?.message || '删除失败')
    } finally {
      setDeleting(false)
    }
  }

  // ── 加载态（骨架屏） ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="detail-page">
        <div className="detail-skeleton">
          <div className="skeleton-cover skeleton-box" />
          <div className="skeleton-body">
            <div className="skeleton-box skeleton-heading" />
            <div className="skeleton-box skeleton-line" />
            <div className="skeleton-box skeleton-line short" />
            <div className="skeleton-box skeleton-line" />
            <div className="skeleton-box skeleton-line short" />
          </div>
        </div>
      </div>
    )
  }

  // ── 404 ──────────────────────────────────────────────────────────────────

  if (notFound || !recipe) {
    return (
      <div className="detail-page">
        <div className="detail-notfound">
          <div className="detail-notfound__icon">🍽️</div>
          <h2>食谱不存在</h2>
          <p>该食谱可能已被作者删除</p>
          <button className="btn btn--primary" onClick={() => navigate('/')}>
            返回首页
          </button>
        </div>
      </div>
    )
  }

  // ── 详情 ──────────────────────────────────────────────────────────────────

  return (
    <div className="detail-page">
      <div className="detail-container">
        {/* 返回按钮 */}
        <button className="detail-back" onClick={() => navigate(-1)}>
          ← 返回
        </button>

        {/* 封面图 */}
        <div className="detail-cover">
          {recipe.coverImage ? (
            <img src={recipe.coverImage} alt={recipe.title} />
          ) : (
            <div className="detail-cover__placeholder">🍽️</div>
          )}

          {/* 作者操作栏 */}
          {isAuthor && (
            <div className="detail-author-actions">
              <Link to={`/recipe/${id}/edit`} className="detail-btn-edit">
                ✏️ 编辑
              </Link>
              <button className="detail-btn-delete" onClick={handleDelete} disabled={deleting}>
                🗑️ {deleting ? '删除中…' : '删除'}
              </button>
            </div>
          )}

          {!isAuthor && (
            <button
              className={`detail-fav-btn ${isFavorited ? 'is-favorited' : ''}`}
              onClick={handleFavoriteToggle}
              disabled={favLoading}
            >
              {favLoading ? '⋯' : isFavorited ? '❤️ 已收藏' : '🤍 收藏'}
            </button>
          )}
        </div>

        {/* 基本信息 */}
        <div className="detail-header">
          <h1 className="detail-title">{recipe.title}</h1>
          <p className="detail-author">
            👨‍🍳{' '}
            {recipe.userId && isAuthenticated ? (
              <Link to={`/user/${recipe.userId}`} className="detail-author-link">
                {recipe.author || '未知作者'}
              </Link>
            ) : (
              recipe.author || '未知作者'
            )}
          </p>

          <div className="detail-meta">
            {recipe.category && <span className="detail-tag">{recipe.category}</span>}
            {recipe.difficulty && <span className="detail-tag">难度：{recipe.difficulty}</span>}
            {recipe.servings != null && (
              <span className="detail-tag">🍽️ {recipe.servings} 人份</span>
            )}
            {recipe.cookTime != null && (
              <span className="detail-tag">⏱ {recipe.cookTime} 分钟</span>
            )}
          </div>

          {recipe.description && <p className="detail-desc">{recipe.description}</p>}
        </div>

        {/* 食材列表 */}
        {recipe.ingredients && recipe.ingredients.length > 0 && (
          <section className="detail-section">
            <h2 className="detail-section__title">食材</h2>
            <ul className="detail-ingredients">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="detail-ingredient">
                  <span className="ingredient-name">{ing.name}</span>
                  <span className="ingredient-divider" />
                  <span className="ingredient-amount">
                    {ing.amount} {ing.unit}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 步骤列表 */}
        {recipe.steps && recipe.steps.length > 0 && (
          <section className="detail-section">
            <h2 className="detail-section__title">制作步骤</h2>
            <ol className="detail-steps">
              {recipe.steps.map((step, i) => (
                <li key={i} className="detail-step">
                  <div className="step-number">{step.stepNumber}</div>
                  <p className="step-content">{step.content}</p>
                  {step.image && (
                    <img
                      src={step.image}
                      alt={`步骤 ${step.stepNumber}`}
                      className="step-image"
                      loading="lazy"
                    />
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* 评论区 */}
        {id && <CommentSection recipeId={id} />}
      </div>
    </div>
  )
}
