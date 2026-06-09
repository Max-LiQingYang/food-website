import { useState, useEffect, useCallback, useRef } from 'react'
import type React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getRecipes, getFeaturedRecipes } from '../api'
import RecipeCard from '../components/RecipeCard'
import RecipeCardSkeleton from '../components/RecipeCardSkeleton'
import SearchAutocomplete from '../components/SearchAutocomplete'
import FilterPanel from '../components/FilterPanel'
import HeroSection from '../components/HeroSection'
import PersonalizedDailyPick from '../components/PersonalizedDailyPick'
import { usePageTitle, useMetaTags } from '../hooks/useSEO'
import type { FilterState } from '../components/FilterPanel'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import { useDeferredMount } from '../hooks/useDeferredMount'
import type { Recipe } from '../api'
import './HomePage.css'
import PageSkeleton from '../components/PageSkeleton'

const CATEGORIES = ['全部', '中餐', '西餐', '甜点', '日韩', '其他'] as const
const PAGE_SIZE = 12

interface HeroRecipe {
  id: string
  title: string
  image: string
  category?: string
}

function makeRippleHandler() {
  return (e: React.MouseEvent<HTMLElement>) => {
    const target = e.currentTarget
    const rect = target.getBoundingClientRect()
    target.style.setProperty('--ripple-x', `${e.clientX - rect.left}px`)
    target.style.setProperty('--ripple-y', `${e.clientY - rect.top}px`)
  }
}

function DailyPickSkeletonPlaceholder() {
  return (
    <div className="deferred-section__placeholder" aria-hidden="true">
      正在加载今日推荐…
    </div>
  )
}

function DeferredSection({ children }: { children: React.ReactNode }) {
  const { ref, shouldMount } = useDeferredMount<HTMLDivElement>()
  return (
    <div ref={ref} className="deferred-section">
      {shouldMount ? children : <DailyPickSkeletonPlaceholder />}
    </div>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const initialCategory = searchParams.get('category') || '全部'
  const initialDifficulty = searchParams.get('difficulty') || ''
  const initialMaxCookTime = searchParams.get('maxCookTime') ? Number(searchParams.get('maxCookTime')) : null
  const initialSortBy = searchParams.get('sortBy') || ''

  const [category, setCategory] = useState(initialCategory)
  const [page, setPage] = useState(1)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [featuredRecipes, setFeaturedRecipes] = useState<HeroRecipe[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [filters, setFilters] = useState<FilterState>({
    difficulty: initialDifficulty,
    maxCookTime: initialMaxCookTime,
    sortBy: initialSortBy,
  })
  const [heroLoaded, setHeroLoaded] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  // Show full layout (hero + extras) only when category is 全部 and no filters
  const showFullLayout = category === '全部' && !filters.difficulty && filters.maxCookTime === null && !filters.sortBy

  const totalPages = Math.ceil(total / PAGE_SIZE)

  useEffect(() => {
    const params = new URLSearchParams()
    if (category !== '全部') params.set('category', category)
    if (filters.difficulty) params.set('difficulty', filters.difficulty)
    if (filters.maxCookTime !== null) params.set('maxCookTime', String(filters.maxCookTime))
    if (filters.sortBy) params.set('sortBy', filters.sortBy)
    setSearchParams(params, { replace: true })
  }, [category, filters, setSearchParams])

  const fetchRecipes = useCallback(async () => {
    // Cancel any in-flight request to prevent stale overwrites
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    const params: Record<string, any> = { page, pageSize: PAGE_SIZE }
    if (category !== '全部') params.category = category
    if (filters.sortBy) params.sortBy = filters.sortBy
    if (filters.difficulty) params.difficulty = filters.difficulty
    if (filters.maxCookTime !== null) params.maxCookTime = filters.maxCookTime

    try {
      const res: any = await getRecipes(params)
      // If aborted by a newer request, discard this response
      if (controller.signal.aborted) return
      const data = res.data || res
      setRecipes(data.list || [])
      setTotal(data.total || 0)
    } catch (err: any) {
      if (err?.name === 'CanceledError' || controller.signal.aborted) return
      setRecipes([])
      setTotal(0)
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false)
      }
    }
  }, [category, page, filters])

  // Load hero data — 直接拉精选 3 条，零浪费
  useEffect(() => {
    let cancelled = false
    getFeaturedRecipes()
      .then((res: any) => {
        if (cancelled) return
        const data = res.data?.data || res.data || res
        const list: Recipe[] = Array.isArray(data) ? data : data.list || []
        setFeaturedRecipes(
          list.map(r => ({
            id: r.id,
            title: r.title,
            image: r.coverImage || '',
            category: r.category,
          }))
        )
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setHeroLoaded(true) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    fetchRecipes()
  }, [fetchRecipes])

  const { refreshing, pullDistance, statusText, touchHandlers } = usePullToRefresh({ onRefresh: fetchRecipes })

  const handleCategoryChange = (cat: string) => {
    if (cat === category) return
    setCategory(cat)
    setPage(1)
  }

  const handleSearchSubmit = (query: string) => {
    navigate(`/search?q=${encodeURIComponent(query)}`)
  }

  const goPage = (newPage: number) => {
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Build featured recipes for hero from fetched data
  const heroRecipes = heroLoaded && featuredRecipes.length > 0
    ? featuredRecipes
    : undefined

  // SEO meta
  usePageTitle('美食食谱 - 三餐四季，与美食相伴')
  useMetaTags({
    description: '美食食谱分享平台 —— 发现中餐、西餐、甜点、日韩等多国美食菜谱。家常菜、私房菜、烘焙甜品，简单易学，让烹饪成为享受。',
  })

  return (
    <div className="home-page pull-to-refresh-container" {...touchHandlers}>
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

      {/* ── 精选轮播 ── */}
      {showFullLayout && <HeroSection recipes={heroRecipes} />}

      {/* ── 今日推荐（视口内才挂载） ── */}
      {showFullLayout && (
        <DeferredSection>
          <PersonalizedDailyPick />
        </DeferredSection>
      )}

      {/* ── 搜索栏 ── */}
      <form className="home-search" onSubmit={e => { e.preventDefault(); handleSearchSubmit(searchInput) }}>
        <SearchAutocomplete
          value={searchInput}
          onChange={setSearchInput}
          onSubmit={handleSearchSubmit}
          placeholder="搜索食谱..."
          inputClassName="home-search__input"
        />
        <button type="submit" className="home-search__btn ripple-host" onMouseDown={makeRippleHandler()}>搜索</button>
      </form>

      {/* ── 分类标签 ── */}
      <div className="home-categories">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`home-category ripple-host ${category === cat ? 'active' : ''}`}
            onMouseDown={makeRippleHandler()}
            onClick={() => handleCategoryChange(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── 筛选面板 ── */}
      <FilterPanel filters={filters} onChange={setFilters} />

      {/* ── 食谱主网格 ── */}
      <section className="home-section">
        {!showFullLayout && (
          <h2 className="home-section__title">
            <span className="home-section__icon">🔍</span>
            搜索结果
          </h2>
        )}

        {loading && (
          <PageSkeleton type="home" />
        )}

        {!loading && recipes.length > 0 && (
          <div className="home-grid list-stagger">
            {recipes.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} />)}
          </div>
        )}

        {!loading && recipes.length === 0 && (
          <div className="home-empty">
            <div className="home-empty__icon">🍳</div>
            <p className="home-empty__text">暂无食谱</p>
            <p className="home-empty__hint">试试其它筛选条件~</p>
          </div>
        )}
      </section>

      {/* ── 分页 ── */}
      {total > PAGE_SIZE && (
        <div className="home-pagination">
          <button className="pagination-btn" disabled={page <= 1 || loading} onClick={() => goPage(page - 1)}>
            ← 上一页
          </button>
          <span className="pagination-info">第 {page} / {totalPages} 页</span>
          <button className="pagination-btn" disabled={page >= totalPages || loading} onClick={() => goPage(page + 1)}>
            下一页 →
          </button>
        </div>
      )}
    </div>
  )
}
