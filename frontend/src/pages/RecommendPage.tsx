import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { recommendRecipes, addFavorite, removeFavorite, getFavoriteStatus } from '../api'
import type { RecommendRecipe } from '../api'
import { useToast } from '../context/ToastContext'
import './RecommendPage.css'

/* ─── 常量 ─── */

const HISTORY_KEY = 'recommend_history'
const MAX_HISTORY = 10

const POPULAR_TAGS = [
  { text: '鸡蛋、番茄', icon: '🍅' },
  { text: '鸡肉、土豆', icon: '🥔' },
  { text: '豆腐、青菜', icon: '🥬' },
  { text: '牛肉、洋葱', icon: '🧅' },
  { text: '猪肉、青椒', icon: '🫑' },
  { text: '虾仁、鸡蛋', icon: '🦐' },
]

/* ─── 工具函数 ─── */

function loadHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  } catch {
    return []
  }
}

function saveHistory(text: string) {
  const raw = loadHistory()
  const deduped = [text, ...raw.filter(t => t !== text)]
  localStorage.setItem(HISTORY_KEY, JSON.stringify(deduped.slice(0, MAX_HISTORY)))
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY)
}

/* ─── 组件 ─── */

export default function RecommendPage() {
  const [input, setInput] = useState('')
  const [results, setResults] = useState<RecommendRecipe[]>([])
  const [aiRecipes, setAiRecipes] = useState<any[]>([])
  const [aiGenerated, setAiGenerated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [history, setHistory] = useState<string[]>(loadHistory)
  const [favorites, setFavorites] = useState<Record<string, boolean>>({})
  const navigate = useNavigate()
  const toast = useToast()
  const resultRef = useRef<HTMLDivElement>(null)

  /* 载入每张卡片收藏状态 */
  useEffect(() => {
    if (!results.length) return
    const token = localStorage.getItem('token')
    if (!token) return
    results.forEach(r => {
      getFavoriteStatus(r.id)
        .then((res: any) => {
          if (res?.data?.isFavorited) {
            setFavorites(prev => ({ ...prev, [r.id]: true }))
          }
        })
        .catch(() => {})
    })
  }, [results])

  /* 搜索 */
  const handleSubmit = useCallback(
    async (ingredientText?: string) => {
      const query = (ingredientText || input).trim()
      if (!query) return

      setInput(query)
      setLoading(true)
      setSearched(true)

      try {
        const res: any = await recommendRecipes(query)
        setResults(res.list || [])
        setAiRecipes(res.aiRecipes || [])
        setAiGenerated(res.aiGenerated || false)
        saveHistory(query)
        setHistory(loadHistory())
        // 滚动到结果区
        setTimeout(
          () => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
          100
        )
      } catch {
        setResults([])
        setAiRecipes([])
        setAiGenerated(false)
      } finally {
        setLoading(false)
      }
    },
    [input]
  )

  /* 历史/快捷标签点击 */
  const quickSearch = (text: string) => {
    setInput(text)
    handleSubmit(text)
  }

  /* 收藏切换 */
  const toggleFavorite = async (e: React.MouseEvent, recipeId: string, isFav: boolean) => {
    e.preventDefault()
    e.stopPropagation()

    const token = localStorage.getItem('token')
    if (!token) {
      toast.warning('请先登录后再收藏')
      navigate('/login')
      return
    }

    try {
      if (isFav) {
        await removeFavorite(recipeId)
      } else {
        await addFavorite(recipeId)
      }
      setFavorites(prev => ({ ...prev, [recipeId]: !isFav }))
    } catch {
      // ignore
    }
  }

  return (
    <div className="recommend-page">
      {/* ─── Hero 区 ─── */}
      <div className="recommend-hero">
        <h1 className="recommend-hero__title">🥘 食材推荐菜谱</h1>
        <p className="recommend-hero__subtitle">输入你手头有的食材，看看能做什么菜</p>

        <form
          className="recommend-form"
          onSubmit={e => {
            e.preventDefault()
            handleSubmit()
          }}
        >
          <div className="recommend-input-wrapper">
            <span className="recommend-input-icon">🥬</span>
            <input
              type="text"
              className="recommend-input"
              placeholder="输入食材，用逗号或空格分隔，如：鸡蛋、番茄、洋葱"
              value={input}
              onChange={e => setInput(e.target.value)}
            />
            <button type="submit" className="recommend-submit" disabled={loading || !input.trim()}>
              {loading ? (
                <span className="recommend-submit--loading">
                  <span className="spinner" />
                  分析中...
                </span>
              ) : (
                '🔍 推荐菜谱'
              )}
            </button>
          </div>
        </form>

        {/* ─── 搜索历史 ─── */}
        {history.length > 0 && (
          <div className="recommend-history">
            <div className="recommend-history__header">
              <span className="recommend-history__label">🕐 搜索历史</span>
              <button
                className="recommend-history__clear"
                onClick={() => {
                  clearHistory()
                  setHistory([])
                }}
              >
                清除
              </button>
            </div>
            <div className="recommend-history__tags">
              {history.map((item, i) => (
                <button
                  key={`${item}-${i}`}
                  className="recommend-history__tag"
                  onClick={() => quickSearch(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── 快捷热门 ─── */}
        <div className="recommend-hot">
          <span className="recommend-hot__label">🔥 热门食材</span>
          <div className="recommend-hot__tags">
            {POPULAR_TAGS.map(tag => (
              <button
                key={tag.text}
                className="recommend-hot__tag"
                onClick={() => quickSearch(tag.text)}
              >
                <span className="recommend-hot__icon">{tag.icon}</span>
                {tag.text}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── 结果区 ─── */}
      <div className="recommend-results" ref={resultRef}>
        {/* 加载态 — 带进度的骨架屏 */}
        {loading && (
          <>
            <h2 className="recommend-section-title recommend-section-title--loading">
              <span className="skeleton-title-pulse" />
            </h2>
            <div className="recommend-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="recommend-card recommend-card--skeleton">
                  <div className="recommend-card__cover skeleton-box" />
                  <div className="recommend-card__body">
                    <div className="skeleton-box skeleton-box--badge" />
                    <div className="skeleton-box skeleton-box--title" />
                    <div className="skeleton-box skeleton-box--desc" />
                    <div className="skeleton-box skeleton-box--meta" />
                    <div className="skeleton-box skeleton-box--tags" />
                  </div>
                </div>
              ))}
            </div>
            <div className="recommend-loading-bar">
              <div className="recommend-loading-bar__inner" />
            </div>
            <p className="recommend-loading-text">🧪 AI 正在分析食材搭配...</p>
          </>
        )}

        {/* ─── 数据库匹配结果 ─── */}
        {!loading && results.length > 0 && (
          <>
            <h2 className="recommend-section-title">📖 找到 {results.length} 个匹配食谱</h2>
            <div className="recommend-grid">
              {results.map(recipe => {
                const isFav = !!favorites[recipe.id]
                return (
                  <Link key={recipe.id} to={`/recipe/${recipe.id}`} className="recommend-card-link">
                    <div className="recommend-card">
                      <div className="recommend-card__cover">
                        {recipe.coverImage ? (
                          <img src={recipe.coverImage} alt={recipe.title} />
                        ) : (
                          <div className="recommend-card__placeholder">🍽️</div>
                        )}
                        {/* 收藏按钮 */}
                        <button
                          className={`recommend-card__fav ${isFav ? 'recommend-card__fav--active' : ''}`}
                          onClick={e => toggleFavorite(e, recipe.id, isFav)}
                          title={isFav ? '取消收藏' : '收藏'}
                        >
                          {isFav ? '❤️' : '🤍'}
                        </button>
                      </div>
                      <div className="recommend-card__body">
                        {/* 匹配度 */}
                        <span
                          className={`recommend-badge recommend-badge--${recipe.matchScore >= 80 ? 'high' : recipe.matchScore >= 50 ? 'mid' : 'low'}`}
                        >
                          {recipe.matchScore}% 匹配
                        </span>
                        <h3 className="recommend-card__title">{recipe.title}</h3>
                        <p className="recommend-card__desc">{recipe.description}</p>
                        <div className="recommend-card__meta">
                          {recipe.cookTime && <span>⏱ {recipe.cookTime}分钟</span>}
                          {recipe.difficulty && (
                            <span>
                              {recipe.difficulty === 'easy'
                                ? '简单'
                                : recipe.difficulty === 'medium'
                                  ? '中等'
                                  : '困难'}
                            </span>
                          )}
                        </div>
                        {/* ─── 推荐理由 ─── */}
                        <div className="recommend-card__reason">
                          <span className="recommend-card__reason-icon">💡</span>
                          <span>
                            匹配了 <strong>{recipe.matchedIngredients.length}</strong>/{' '}
                            <strong>{recipe.totalIngredients || '?'}</strong> 种食材
                            {recipe.matchedIngredients.length > 0 && (
                              <>（{recipe.matchedIngredients.join('、')}）</>
                            )}
                          </span>
                        </div>
                        {/* ─── 匹配食材标签 ─── */}
                        {recipe.matchedIngredients.length > 0 && (
                          <div className="recommend-card__tags">
                            {recipe.matchedIngredients.map(tag => (
                              <span key={tag} className="recommend-tag">
                                ✅ {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </>
        )}

        {/* ─── AI 推荐结果 ─── */}
        {!loading && aiGenerated && aiRecipes.length > 0 && (
          <>
            <h2 className="recommend-section-title recommend-section-title--ai">
              🤖 AI 智能推荐菜谱
            </h2>
            <p className="recommend-ai-hint">
              数据库中没有完全匹配的食谱，以下由 AI 根据你的食材智能生成
            </p>
            <div className="recommend-grid">
              {aiRecipes.map((recipe, idx) => (
                <div key={idx} className="recommend-card recommend-card--ai">
                  <div className="recommend-card__cover recommend-card__cover--ai">
                    <div className="recommend-card__placeholder">🤖</div>
                  </div>
                  <div className="recommend-card__body">
                    <span className="recommend-badge recommend-badge--ai">AI 推荐</span>
                    <h3 className="recommend-card__title">🍳 {recipe.title}</h3>
                    <p className="recommend-card__desc">{recipe.description}</p>
                    <div className="recommend-card__meta">
                      {recipe.cookTime && <span>⏱ {recipe.cookTime}分钟</span>}
                      {recipe.difficulty && (
                        <span>
                          {recipe.difficulty === 'easy'
                            ? '简单'
                            : recipe.difficulty === 'medium'
                              ? '中等'
                              : '困难'}
                        </span>
                      )}
                      {recipe.servings && <span>👥 {recipe.servings}人份</span>}
                    </div>
                    <div className="recommend-card__tags">
                      {recipe.ingredients?.map((ing: any, i: number) => (
                        <span key={i} className="recommend-tag recommend-tag--ai">
                          {ing.name} {ing.amount}
                          {ing.unit}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ─── 无结果 ─── */}
        {!loading && searched && results.length === 0 && !aiGenerated && (
          <div className="recommend-empty">
            <div className="recommend-empty__icon">🥗</div>
            <p className="recommend-empty__text">没有找到匹配的食谱</p>
            <p className="recommend-empty__hint">试试其他食材组合，或者点击上面的热门食材试试</p>
          </div>
        )}

        {/* ─── 初始空状态 —— 引导 + 热门 ─── */}
        {!searched && !loading && (
          <div className="recommend-empty recommend-empty--guide">
            <div className="recommend-empty__banner">
              <span className="recommend-empty__banner-icon">🔎</span>
              <div>
                <p className="recommend-empty__text">输入食材开始探索</p>
                <p className="recommend-empty__hint">
                  系统会从已有食谱中匹配，AI 也会帮你推荐创意菜式
                </p>
              </div>
            </div>
            <div className="recommend-empty__steps">
              <div className="recommend-empty__step">
                <span className="recommend-empty__step-num">1</span>
                <span>输入你手头有的食材</span>
              </div>
              <div className="recommend-empty__step">
                <span className="recommend-empty__step-num">2</span>
                <span>系统自动匹配已有食谱</span>
              </div>
              <div className="recommend-empty__step">
                <span className="recommend-empty__step-num">3</span>
                <span>AI 智能推荐创意菜式</span>
              </div>
            </div>
            <p className="recommend-empty__cta-hint">👇 试试这些热门组合</p>
            <div className="recommend-hot">
              {POPULAR_TAGS.map(tag => (
                <button
                  key={tag.text}
                  className="recommend-hot__tag recommend-hot__tag--lg"
                  onClick={() => quickSearch(tag.text)}
                >
                  <span className="recommend-hot__icon">{tag.icon}</span>
                  {tag.text}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
