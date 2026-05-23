import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getRecipeById, deleteRecipe } from '../api'
import { addFavorite, removeFavorite, getFavoriteStatus } from '../api'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import CommentSection from '../components/CommentSection'
import type { RecipeDetail } from '../api'
import './RecipeDetailPage.css'

/** 分类中文映射 */
const CATEGORY_NAMES: Record<string, string> = {
  chinese: '中餐',
  western: '西餐',
  japanese: '日料',
  korean: '韩料',
  dessert: '甜点',
  thai: '泰式',
  indian: '印式',
  vietnamese: '越式',
}
const DIFFICULTY_NAMES: Record<string, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
}

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
  const [activeStep, setActiveStep] = useState<number | null>(null)

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
    ] as const)
      .then(([res, favStatus]) => {
        // API returns { code: 0, message: 'ok', data: recipeObject }
        const recipeData = (res as any).data ?? res
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

  const handleStepClick = (stepNum: number) => {
    setActiveStep(activeStep === stepNum ? null : stepNum)
  }

  // ── 加载态（骨架屏） ─────────────────────────────────────

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

  // ── 404 ──────────────────────────────────────────────────

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

  // ── 处理 categoryTags（可能是 null 或 JSON 字符串） ──────
  let categoryTags: Record<string, string> | null = null
  if (recipe.categoryTags) {
    if (typeof recipe.categoryTags === 'string') {
      try {
        categoryTags = JSON.parse(recipe.categoryTags)
      } catch {
        categoryTags = null
      }
    } else {
      categoryTags = recipe.categoryTags as any
    }
  }

  const tagFilters = categoryTags
    ? [
        { label: '食材分类', value: categoryTags.ingredient },
        { label: '做法', value: categoryTags.method },
        { label: '菜系', value: categoryTags.cuisine },
        { label: '口味', value: categoryTags.flavor },
        { label: '价格', value: categoryTags.price },
      ].filter(t => t.value)
    : []

  // ── 详情 ──────────────────────────────────────────────────

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
            <img
              src={recipe.coverImage}
              alt={recipe.title}
              loading="lazy"
              onError={e => {
                ;(e.target as HTMLImageElement).style.display = 'none'
                const placeholder = (e.target as HTMLImageElement).nextElementSibling
                if (placeholder) {
                  ;(placeholder as HTMLElement).style.display = 'flex'
                }
              }}
            />
          ) : null}
          <div
            className="detail-cover__placeholder"
            style={{ display: recipe.coverImage ? 'none' : 'flex' }}
          >
            🍽️
          </div>

          {/* 收藏按钮 */}
          <button
            className={`detail-fav-btn ${isFavorited ? 'is-favorited' : ''}`}
            onClick={handleFavoriteToggle}
            disabled={favLoading}
            title={isFavorited ? '取消收藏' : '收藏'}
          >
            <span className="fav-icon">{favLoading ? '⋯' : isFavorited ? '❤️' : '🤍'}</span>
            <span className="fav-text">{isFavorited ? '已收藏' : '收藏'}</span>
          </button>

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
        </div>

        {/* 基本信息 */}
        <div className="detail-header">
          <h1 className="detail-title">{recipe.title}</h1>

          <p className="detail-author">
            👨🍳{' '}
            {recipe.userId && isAuthenticated ? (
              <Link to={`/user/${recipe.userId}`} className="detail-author-link">
                {recipe.author || '未知作者'}
              </Link>
            ) : (
              recipe.author || '未知作者'
            )}
          </p>

          {/* 分类/难度/份数/时间徽标 */}
          <div className="detail-meta">
            {recipe.category && (
              <span className="detail-tag">
                {CATEGORY_NAMES[recipe.category] || recipe.category}
              </span>
            )}
            {recipe.difficulty && (
              <span className="detail-tag">
                {DIFFICULTY_NAMES[recipe.difficulty] || recipe.difficulty}
              </span>
            )}
            {recipe.servings != null && (
              <span className="detail-tag">🍽️ {recipe.servings} 人份</span>
            )}
            {recipe.cookTime != null && (
              <span className="detail-tag">⏱ {recipe.cookTime} 分钟</span>
            )}
          </div>

          {/* 多维分类标签（categoryTags） */}
          {tagFilters.length > 0 && (
            <div className="detail-tags-row">
              {tagFilters.map(t => (
                <span key={t.label} className="detail-tag-dim">
                  <span className="tag-dim-label">{t.label}</span>
                  <span className="tag-dim-value">{t.value}</span>
                </span>
              ))}
            </div>
          )}

          {recipe.description && <p className="detail-desc">{recipe.description}</p>}
        </div>

        {/* 食材清单 */}
        {recipe.ingredients && recipe.ingredients.length > 0 && (
          <section className="detail-section">
            <h2 className="detail-section__title">
              🥬 食材清单
              <span className="section-count">{recipe.ingredients.length} 种</span>
            </h2>
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

        {/* 制作步骤 */}
        {recipe.steps && recipe.steps.length > 0 && (
          <section className="detail-section">
            <h2 className="detail-section__title">
              📝 制作步骤
              <span className="section-count">{recipe.steps.length} 步</span>
            </h2>
            <ol className="detail-steps">
              {recipe.steps.map(step => {
                const isActive = activeStep === step.stepNumber
                return (
                  <li
                    key={step.stepNumber}
                    className={`detail-step ${isActive ? 'is-active' : ''}`}
                    onClick={() => handleStepClick(step.stepNumber)}
                  >
                    <div className="step-number">{step.stepNumber}</div>
                    <div className="step-body">
                      <p className="step-content">{step.content}</p>
                      {step.image && (
                        <img
                          src={step.image}
                          alt={`步骤 ${step.stepNumber}`}
                          className="step-image"
                          loading="lazy"
                        />
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          </section>
        )}

        {/* 评论区 */}
        {id && (
          <section className="detail-section detail-section--comments">
            <h2 className="detail-section__title">💬 评价与留言</h2>
            <CommentSection recipeId={id} />
          </section>
        )}
      </div>
    </div>
  )
}
