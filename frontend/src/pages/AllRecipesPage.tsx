import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getRecipes, getHotSearches } from '../api'
import RecipeCard from '../components/RecipeCard'
import RecipeCardSkeleton from '../components/RecipeCardSkeleton'
import FilterPanel from '../components/FilterPanel'
import { usePageTitle, useMetaTags } from '../hooks/useSEO'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import type { FilterState } from '../components/FilterPanel'
import type { Recipe } from '../api'
import './AllRecipesPage.css'
import PageSkeleton from '../components/PageSkeleton'

const PAGE_SIZE = 24
const VIEW_KEY = 'allRecipesViewMode'
type ViewMode = 'grid' | 'list'

const CATEGORIES = [
  { key: '', label: '全部' },
  { key: 'chinese', label: '🥟 中餐' },
  { key: 'western', label: '🥩 西餐' },
  { key: 'japanese', label: '🍣 日式' },
  { key: 'korean', label: '🥬 韩式' },
  { key: 'dessert', label: '🍰 甜品' },
  { key: 'thai', label: '🍜 泰式' },
  { key: 'indian', label: '🍛 印式' },
  { key: 'vietnamese', label: '🥗 越式' },
  { key: 'mexican', label: '🌮 墨西哥' },
  { key: 'mediterranean', label: '🫒 地中海' },
]

const SORT_OPTIONS = [
  { key: '', label: '默认排序' },
  { key: 'newest', label: '🆕 最新发布' },
  { key: 'favorites', label: '❤️ 最多收藏' },
  { key: 'views', label: '👁️ 最多浏览' },
  { key: 'rating', label: '⭐ 评分最高' },
  { key: 'time', label: '⏱ 烹饪时间' },
]

/** 热门标签（从 categoryTags 提取的前 10 高频标签） */
const POPULAR_TAGS = [
  { key: 'taste:辣', label: '🌶️ 辣味' },
  { key: 'taste:清淡', label: '🥬 清淡' },
  { key: 'method:炒', label: '🍳 炒' },
  { key: 'method:煮', label: '🍜 煮' },
  { key: 'method:蒸', label: '♨️ 蒸' },
  { key: 'method:烤', label: '🔥 烤' },
  { key: 'method:油炸', label: '🍟 炸' },
  { key: 'method:煎', label: '🥘 煎' },
  { key: 'cuisine:家常', label: '🏠 家常' },
  { key: 'cuisine:宴客', label: '🎉 宴客' },
]

export default function AllRecipesPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const initialCategory = searchParams.get('category') || ''
  const initialDifficulty = searchParams.get('difficulty') || ''
  const initialMaxCookTime = searchParams.get('maxCookTime') ? Number(searchParams.get('maxCookTime')) : null
  const initialSortBy = searchParams.get('sortBy') || ''
  const initialTag = searchParams.get('tag') || ''

  const [category, setCategory] = useState(initialCategory)
  const [page, setPage] = useState(1)
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<FilterState>({
    difficulty: initialDifficulty,
    maxCookTime: initialMaxCookTime,
    sortBy: initialSortBy,
  })
  const [activeTag, setActiveTag] = useState(initialTag)

  // 视图切换
  const [view, setView] = useState<ViewMode>(
    (localStorage.getItem(VIEW_KEY) as ViewMode) || 'grid'
  )

  // 空结果随机推荐
  const [randomRecipes, setRandomRecipes] = useState<Recipe[]>([])

  // 返回顶部
  const [showBackToTop, setShowBackToTop] = useState(false)
  const mainRef = useRef<HTMLDivElement>(null)

  const totalPages = Math.ceil(total / PAGE_SIZE)

  // ── 滚动 500px 显示返回顶部 ──
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 500)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── 视图切换 ──
  const handleViewChange = useCallback((v: ViewMode) => {
    setView(v)
    localStorage.setItem(VIEW_KEY, v)
  }, [])

  // ── 标签筛选 ──
  const handleTagToggle = (tag: string) => {
    if (activeTag === tag) {
      setActiveTag('')
    } else {
      setActiveTag(tag)
    }
    setPage(1)
  }

  // ── 同步 URL ──
  useEffect(() => {
    const params: Record<string, string> = {}
    if (category) params.category = category
    if (filters.difficulty) params.difficulty = filters.difficulty
    if (filters.maxCookTime !== null) params.maxCookTime = String(filters.maxCookTime)
    if (filters.sortBy) params.sortBy = filters.sortBy
    if (activeTag) params.tag = activeTag
    if (page > 1) params.page = String(page)
    setSearchParams(params, { replace: true })
  }, [category, filters, page, activeTag, setSearchParams])

  // ── 数据获取 ──
  const fetchRecipes = useCallback(async (cat: string, pg: number, f: FilterState, tag: string) => {
    setLoading(true)
    try {
      const params: Record<string, any> = { page: pg, pageSize: PAGE_SIZE }
      if (cat) params.category = cat
      if (f.difficulty) params.difficulty = f.difficulty
      if (f.maxCookTime !== null) params.maxCookTime = f.maxCookTime
      if (f.sortBy) params.sortBy = f.sortBy
      if (tag) params.tag = tag

      const res: any = await getRecipes(params)
      const data = res.data || res
      setAllRecipes(data.list || [])
      setTotal(data.total || 0)
    } catch {
      setAllRecipes([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [])

  // ── 空结果时加载随机推荐 ──
  useEffect(() => {
    if (!loading && allRecipes.length === 0 && total === 0 && page === 1 && randomRecipes.length === 0) {
      getRecipes({ sortBy: 'views', pageSize: 12 })
        .then((res: any) => {
          const data = res.data || res
          const list: Recipe[] = data.list || []
          const shuffled = [...list].sort(() => Math.random() - 0.5)
          setRandomRecipes(shuffled.slice(0, 3))
        })
        .catch(() => setRandomRecipes([]))
    }
  }, [loading, allRecipes, total, page])

  // ── 重置随机推荐 ──
  useEffect(() => {
    setRandomRecipes([])
  }, [category, filters, activeTag])

  // ── 重新获取 ──
  useEffect(() => {
    fetchRecipes(category, page, filters, activeTag)
  }, [category, page, filters, activeTag, fetchRecipes])

  const handleCategoryChange = (cat: string) => {
    setCategory(cat)
    setPage(1)
  }

  const handleFilter = (newFilters: FilterState) => {
    setFilters(newFilters)
    setPage(1)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === page) return
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleReset = () => {
    setCategory('')
    setPage(1)
    setFilters({ difficulty: '', maxCookTime: null, sortBy: '' })
    setActiveTag('')
    setRandomRecipes([])
  }

  const { refreshing, pullDistance, statusText, touchHandlers } = usePullToRefresh({
    onRefresh: () => fetchRecipes(category, page, filters, activeTag),
  })

  usePageTitle('全部食谱')
  useMetaTags({ description: '浏览全部食谱，按分类、难度、烹饪时间筛选，发现美食灵感' })

  // ── 页码 ──
  const getPageNumbers = () => {
    const pages: (number | 'dots')[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (page > 3) pages.push('dots')
      const start = Math.max(2, page - 1)
      const end = Math.min(totalPages - 1, page + 1)
      for (let i = start; i <= end; i++) pages.push(i)
      if (page < totalPages - 2) pages.push('dots')
      pages.push(totalPages)
    }
    return pages
  }

  return (
    <div className="all-recipes-page" ref={mainRef} {...touchHandlers}>
      {pullDistance > 0 && (
        <div className="pull-indicator" style={{ height: `${pullDistance}px`, opacity: pullDistance / 60 }}>
          {refreshing ? (
            <>
              <span className="pull-indicator__spinner" />
              <span className="pull-indicator__text">{statusText === 'done' ? '✅ 刷新完成' : '刷新中...'}</span>
            </>
          ) : (
            <span className="pull-indicator__text">
              <span className="pull-indicator__arrow" style={{ transform: pullDistance >= 60 ? 'rotate(180deg)' : 'rotate(0deg)' }}>↓</span>
              {pullDistance >= 60 ? '释放刷新' : '下拉刷新'}
            </span>
          )}
        </div>
      )}

      {/* ── 头部 ── */}
      <div className="all-recipes-page__header">
        <h1>全部食谱</h1>
        <p className="all-recipes-page__subtitle">共 {total} 道食谱，发现你的下一道拿手菜</p>
      </div>

      {/* ── 分类标签 ── */}
      <div className="all-recipes-page__categories">
        {CATEGORIES.map(c => (
          <button
            key={c.key}
            className={`all-recipes-page__cat-btn${category === c.key ? ' active' : ''}`}
            onClick={() => handleCategoryChange(c.key)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* ── 标签筛选 chips ── */}
      <div className="all-recipes-page__tag-chips">
        {POPULAR_TAGS.map(t => (
          <button
            key={t.key}
            className={`all-recipes-page__tag-chip${activeTag === t.key ? ' active' : ''}`}
            onClick={() => handleTagToggle(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── 工具栏（筛选 + 视图切换 + 排序） ── */}
      <div className="all-recipes-page__toolbar">
        <div className="all-recipes-page__toolbar-left">
          <FilterPanel filters={filters} onFilter={handleFilter} />
          {(filters.difficulty || filters.maxCookTime !== null || activeTag) && (
            <span className="all-recipes-page__result-count">
              共 {total} 道
            </span>
          )}
        </div>

        <div className="all-recipes-page__toolbar-right">
          {/* 视图切换 */}
          <div className="all-recipes-page__view-toggle">
            <button
              className={`all-recipes-page__view-btn${view === 'grid' ? ' active' : ''}`}
              onClick={() => handleViewChange('grid')}
              title="网格视图"
            >
              ▦
            </button>
            <button
              className={`all-recipes-page__view-btn${view === 'list' ? ' active' : ''}`}
              onClick={() => handleViewChange('list')}
              title="列表视图"
            >
              ☰
            </button>
          </div>

          {/* 排序 */}
          <div className="all-recipes-page__sort">
            {SORT_OPTIONS.map(s => (
              <button
                key={s.key}
                className={`all-recipes-page__sort-btn${filters.sortBy === s.key ? ' active' : ''}`}
                onClick={() => handleFilter({ ...filters, sortBy: s.key })}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 筛选摘要 ── */}
      {(filters.difficulty || filters.maxCookTime !== null || filters.sortBy || activeTag || category) && (
        <div className="all-recipes-page__filter-summary">
          {category && (
            <span className="all-recipes-page__filter-chip">
              分类: {CATEGORIES.find(c => c.key === category)?.label || category}
              <button onClick={() => { setCategory(''); setPage(1); }}>×</button>
            </span>
          )}
          {activeTag && (
            <span className="all-recipes-page__filter-chip">
              标签: {POPULAR_TAGS.find(t => t.key === activeTag)?.label || activeTag}
              <button onClick={() => { setActiveTag(''); setPage(1); }}>×</button>
            </span>
          )}
          {filters.difficulty && (
            <span className="all-recipes-page__filter-chip">
              难度: {filters.difficulty}
              <button onClick={() => handleFilter({ ...filters, difficulty: '' })}>×</button>
            </span>
          )}
          {filters.maxCookTime !== null && (
            <span className="all-recipes-page__filter-chip">
              时间: {filters.maxCookTime === 61 ? '60+ 分钟' : `≤ ${filters.maxCookTime} 分钟`}
              <button onClick={() => handleFilter({ ...filters, maxCookTime: null })}>×</button>
            </span>
          )}
        </div>
      )}

      {/* ── 食谱网格/列表 ── */}
      {loading ? (
        <PageSkeleton type="list" />
      ) : allRecipes.length === 0 ? (
        <div className="all-recipes-page__empty">
          <span className="all-recipes-page__empty-icon">🔍</span>
          <p>没有找到匹配的食谱</p>
          <p className="all-recipes-page__empty-hint">换个分类、标签或筛选条件试试</p>
          <button className="all-recipes-page__reset-btn" onClick={handleReset}>
            重置筛选
          </button>
          {randomRecipes.length > 0 && (
            <>
              <p className="all-recipes-page__empty-suggestion-title">试试这些热门食谱</p>
              <div className="all-recipes-page__empty-suggestions">
                {randomRecipes.map(r => (
                  <RecipeCard key={r.id} recipe={r} />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          <div className={`all-recipes-page__${view}`}>
            {allRecipes.map(recipe => (
              view === 'list' ? (
                <div key={recipe.id} className="all-recipes-page__list-item">
                  {recipe.coverImage && (
                    <div className="all-recipes-page__list-item-img">
                      <img src={recipe.coverImage} alt={recipe.title} loading="lazy" />
                    </div>
                  )}
                  <div className="all-recipes-page__list-item-info">
                    <h3 className="all-recipes-page__list-item-title">{recipe.title}</h3>
                    {recipe.description && (
                      <p className="all-recipes-page__list-item-desc">{recipe.description.slice(0, 100)}</p>
                    )}
                    <div className="all-recipes-page__list-item-meta">
                      {recipe.category && <span className="all-recipes-page__list-item-tag">{recipe.category}</span>}
                      {recipe.difficulty && <span className={`all-recipes-page__list-item-tag difficulty-${recipe.difficulty}`}>{recipe.difficulty}</span>}
                      {recipe.cookTime && <span>⏱ {recipe.cookTime} 分钟</span>}
                      {typeof recipe.avgRating === 'number' && recipe.avgRating > 0 && <span>⭐ {recipe.avgRating.toFixed(1)}</span>}
                    </div>
                  </div>
                  <a className="all-recipes-page__list-item-link" href={`/recipe/${recipe.id}`}>查看 →</a>
                </div>
              ) : (
                <RecipeCard key={recipe.id} recipe={recipe} />
              )
            ))}
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="all-recipes-page__pagination">
              <button
                className="all-recipes-page__page-btn"
                disabled={page === 1}
                onClick={() => handlePageChange(page - 1)}
              >
                ← 上一页
              </button>

              <div className="all-recipes-page__page-numbers">
                {getPageNumbers().map((p, i) =>
                  p === 'dots' ? (
                    <span key={`dots-${i}`} className="all-recipes-page__page-dots">…</span>
                  ) : (
                    <button
                      key={p}
                      className={`all-recipes-page__page-num${page === p ? ' active' : ''}`}
                      onClick={() => handlePageChange(p)}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>

              <button
                className="all-recipes-page__page-btn"
                disabled={page === totalPages}
                onClick={() => handlePageChange(page + 1)}
              >
                下一页 →
              </button>
            </div>
          )}
        </>
      )}

      {/* ── 返回顶部 ── */}
      {showBackToTop && (
        <button className="all-recipes-page__back-to-top" onClick={scrollToTop} title="返回顶部">
          ↑
        </button>
      )}
    </div>
  )
}
