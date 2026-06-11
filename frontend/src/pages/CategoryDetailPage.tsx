import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CATEGORIES, getCategoryInfo } from '../constants/categories'
import { getRecipes, getCategoryStats, type CategoryStat } from '../api'
import RecipeCard from '../components/RecipeCard'
import './CategoryDetailPage.css'
import PageSkeleton from '../components/PageSkeleton'

const PAGE_SIZE = 12

type SortKey = 'default' | 'newest' | 'hot' | 'rating'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'default', label: '默认排序' },
  { key: 'newest', label: '最新发布' },
  { key: 'hot', label: '最受欢迎' },
  { key: 'rating', label: '评分最高' },
]

const DIFFICULTY_FILTERS = [
  { key: '', label: '全部难度' },
  { key: 'easy', label: '🟢 简单' },
  { key: 'medium', label: '🟡 中等' },
  { key: 'hard', label: '🔴 困难' },
]

export default function CategoryDetailPage() {
  const { name } = useParams<{ name: string }>()
  const navigate = useNavigate()
  const catInfo = name ? getCategoryInfo(name) : null

  const [recipes, setRecipes] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // 筛选/排序状态
  const [sortBy, setSortBy] = useState<SortKey>('default')
  const [difficulty, setDifficulty] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // 分类统计
  const [catStats, setCatStats] = useState<CategoryStat | null>(null)

  useEffect(() => {
    if (name) {
      getCategoryStats()
        .then((stats) => {
          const found = stats.find(s => s.category === name)
          if (found) setCatStats(found)
        })
        .catch(() => {})
    }
  }, [name])

  const sortParam = sortBy === 'newest' ? 'newest' : sortBy === 'hot' ? 'hot' : sortBy === 'rating' ? 'rating' : undefined

  const fetchPage = useCallback((p: number) => {
    if (!name || !catInfo) return
    setLoading(true)
    setError('')
    getRecipes({ page: p, pageSize: PAGE_SIZE, category: name, sortBy: sortParam, difficulty: difficulty || undefined })
      .then(res => {
        const data = res.data || res
        if (p === 1) {
          setRecipes(data.list || [])
        } else {
          setRecipes(prev => [...prev, ...(data.list || [])])
        }
        setTotal(data.total || 0)
        setPage(p)
      })
      .catch(() => setError('网络异常，请稍后重试'))
      .finally(() => setLoading(false))
  }, [name, sortBy, difficulty])

  useEffect(() => {
    fetchPage(1)
  }, [fetchPage])

  const loadMore = () => {
    if (loading || recipes.length >= total) return
    fetchPage(page + 1)
  }

  // 滚动自动加载
  useEffect(() => {
    const handler = () => {
      if (loading || recipes.length >= total) return
      const scrollY = window.scrollY + window.innerHeight
      const docH = document.documentElement.scrollHeight
      if (scrollY >= docH - 400) loadMore()
    }
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [loading, recipes.length, total, page])

  if (!catInfo && name) {
    return (
      <div className="category-detail__empty">
        <span className="category-detail__empty-icon">🤷</span>
        <p>未找到「{name}」分类</p>
        <button className="category-detail__back-btn" onClick={() => navigate('/')}>返回首页</button>
      </div>
    )
  }

  const difficultyTotal = catStats?.difficulty
    ? catStats.difficulty.easy + catStats.difficulty.medium + catStats.difficulty.hard
    : 0

  return (
    <div className="category-detail">
      {/* ── 分类头部 ── */}
      <div
        className="category-detail__header"
        style={{ '--cat-color': catInfo?.color || '#888' } as React.CSSProperties}
      >
        <button className="category-detail__back" onClick={() => navigate(-1)} aria-label="返回">←</button>
        <div className="category-detail__header-info">
          <span className="category-detail__header-icon">{catInfo?.icon}</span>
          <h1 className="category-detail__header-title">{catInfo?.label}</h1>
          {catInfo?.description && (
            <p className="category-detail__header-desc">{catInfo.description}</p>
          )}
        </div>
      </div>

      {/* ── 统计栏 ── */}
      {catStats && (
        <div className="category-detail__stats-bar">
          <div className="category-detail__stat-item">
            <span className="category-detail__stat-value">{total}</span>
            <span className="category-detail__stat-label">食谱</span>
          </div>
          {catStats.avgCookTime > 0 && (
            <div className="category-detail__stat-item">
              <span className="category-detail__stat-value">{catStats.avgCookTime}分钟</span>
              <span className="category-detail__stat-label">平均用时</span>
            </div>
          )}
          {catStats.avgRating > 0 && (
            <div className="category-detail__stat-item">
              <span className="category-detail__stat-value">⭐ {catStats.avgRating}</span>
              <span className="category-detail__stat-label">平均评分</span>
            </div>
          )}
          {/* 难度分布迷你条 */}
          {difficultyTotal > 0 && (
            <div className="category-detail__stat-item category-detail__stat-item--bar">
              <div className="category-detail__mini-bar">
                <div
                  className="category-detail__mini-bar-seg category-detail__mini-bar-seg--easy"
                  style={{ width: `${(catStats.difficulty.easy / difficultyTotal) * 100}%` }}
                />
                <div
                  className="category-detail__mini-bar-seg category-detail__mini-bar-seg--medium"
                  style={{ width: `${(catStats.difficulty.medium / difficultyTotal) * 100}%` }}
                />
                <div
                  className="category-detail__mini-bar-seg category-detail__mini-bar-seg--hard"
                  style={{ width: `${(catStats.difficulty.hard / difficultyTotal) * 100}%` }}
                />
              </div>
              <span className="category-detail__stat-label">
                难度: {catStats.difficulty.easy}简 / {catStats.difficulty.medium}中 / {catStats.difficulty.hard}难
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── 分类标签 ── */}
      {catStats?.topTags && catStats.topTags.length > 0 && (
        <div className="category-detail__tags">
          {catStats.topTags.map(tag => (
            <span
              key={tag}
              className="category-detail__tag"
              style={{ '--cat-color': catInfo?.color } as React.CSSProperties}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* ── 筛选 & 排序工具栏 ── */}
      <div className="category-detail__toolbar">
        <div className="category-detail__filter-group">
          {DIFFICULTY_FILTERS.map(df => (
            <button
              key={df.key}
              className={`category-detail__filter-chip ${difficulty === df.key ? 'category-detail__filter-chip--active' : ''}`}
              style={{
                '--cat-color': catInfo?.color,
                borderColor: difficulty === df.key ? 'var(--cat-color)' : undefined,
                color: difficulty === df.key ? '#fff' : undefined,
                background: difficulty === df.key ? 'var(--cat-color)' : undefined,
              } as React.CSSProperties}
              onClick={() => setDifficulty(difficulty === df.key ? '' : df.key)}
            >
              {df.label}
            </button>
          ))}
        </div>

        <div className="category-detail__toolbar-right">
          <select
            className="category-detail__sort-select"
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortKey)}
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>

          <div className="category-detail__view-toggle">
            <button
              className={`category-detail__view-btn ${viewMode === 'grid' ? 'category-detail__view-btn--active' : ''}`}
              onClick={() => setViewMode('grid')}
              aria-label="网格视图"
              title="网格视图"
            >
              ▦
            </button>
            <button
              className={`category-detail__view-btn ${viewMode === 'list' ? 'category-detail__view-btn--active' : ''}`}
              onClick={() => setViewMode('list')}
              aria-label="列表视图"
              title="列表视图"
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {/* ── 内容区 ── */}
      {loading && recipes.length === 0 ? (
        <PageSkeleton type="list" />
      ) : error ? (
        <div className="category-detail__empty">
          <span className="category-detail__empty-icon">⚠️</span>
          <p>{error}</p>
          <button className="category-detail__back-btn" onClick={() => navigate('/')}>返回首页</button>
        </div>
      ) : recipes.length === 0 ? (
        <div className="category-detail__empty">
          <span className="category-detail__empty-icon">🍽️</span>
          <p>该分类暂无匹配食谱</p>
          <button className="category-detail__back-btn" onClick={() => navigate('/')}>返回首页</button>
        </div>
      ) : (
        <>
          <div className={`category-detail__grid ${viewMode === 'list' ? 'category-detail__grid--list' : ''}`}>
            {recipes.map(r => (
              <RecipeCard key={r.id} recipe={r} />
            ))}
          </div>

          {recipes.length < total && (
            <div className="category-detail__load-more">
              <button
                className="category-detail__load-btn"
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? '加载中...' : `加载更多（${recipes.length}/${total}）`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
