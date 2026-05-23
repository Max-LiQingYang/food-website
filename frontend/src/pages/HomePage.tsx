import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getRecipes } from '../api'
import RecipeCard from '../components/RecipeCard'
import RecipeCardSkeleton from '../components/RecipeCardSkeleton'
import SearchAutocomplete from '../components/SearchAutocomplete'
import FilterPanel from '../components/FilterPanel'
import HeroSection from '../components/HeroSection'
import CategoryCards from '../components/CategoryCards'
import FeaturedSection from '../components/FeaturedSection'
import { usePageTitle, useMetaTags } from '../hooks/useSEO'
import type { FilterState } from '../components/FilterPanel'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import type { Recipe } from '../api'
import './HomePage.css'

const CATEGORIES = ['全部', '中餐', '西餐', '甜点', '日韩', '其他'] as const
const PAGE_SIZE = 12
const FEATURED_TITLES = ['宫保鸡丁', '提拉米苏', '西红柿炒鸡蛋']

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
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [filters, setFilters] = useState<FilterState>({
    difficulty: initialDifficulty,
    maxCookTime: initialMaxCookTime,
    sortBy: initialSortBy,
  })

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
    setLoading(true)
    const params: Record<string, any> = { page, pageSize: PAGE_SIZE }
    if (category !== '全部') params.category = category

    try {
      const res: any = await getRecipes(params)
      const data = res.data || res
      const rawList = data.list || []
      setTotal(data.total || 0)

      let filteredList = rawList
      if (filters.difficulty) {
        filteredList = filteredList.filter((r: Recipe) => r.difficulty === filters.difficulty)
      }
      if (filters.maxCookTime !== null) {
        if (filters.maxCookTime === 61) {
          filteredList = filteredList.filter((r: Recipe) => (r.cookTime || 0) > 60)
        } else {
          filteredList = filteredList.filter((r: Recipe) => (r.cookTime || 0) <= filters.maxCookTime)
        }
      }
      if (filters.sortBy === 'rating') {
        filteredList = [...filteredList].sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0))
      } else if (filters.sortBy === 'time') {
        filteredList = [...filteredList].sort((a: any, b: any) => (a.cookTime || 999) - (b.cookTime || 999))
      }
      setRecipes(filteredList)
    } catch {
      setRecipes([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [category, page, filters])

  // Load full recipe list for hero + featured sections (only once)
  useEffect(() => {
    getRecipes({ page: 1, pageSize: 55 }).then((res: any) => {
      const data = res.data || res
      setAllRecipes(data.list || [])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    fetchRecipes()
  }, [fetchRecipes])

  const { refreshing, pullDistance } = usePullToRefresh({ onRefresh: fetchRecipes })

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
  const heroRecipes = allRecipes.length > 0
    ? FEATURED_TITLES.map(title => allRecipes.find(r => r.title === title)).filter(Boolean).map(r => ({
        id: r!.id,
        title: r!.title,
        image: r!.coverImage || '',
        category: r!.category,
      }))
    : undefined

  // Featured section: use API endpoint
  const [showFeatured, setShowFeatured] = useState(true)

  // SEO meta
  usePageTitle("美食食谱 - 三餐四季，与美食相伴")
  useMetaTags({
    description: "美食食谱分享平台 —— 发现中餐、西餐、甜点、日韩等多国美食菜谱。家常菜、私房菜、烘焙甜品，简单易学，让烹饪成为享受。",
  })

  // Show category is 全部 and no filters
  const showFullLayout = category === '全部' && !filters.difficulty && filters.maxCookTime === null && !filters.sortBy

  return (
    <div className="home-page">
      {pullDistance > 0 && (
        <div className="pull-indicator" style={{ height: `${pullDistance}px`, opacity: pullDistance / 60 }}>
          {refreshing ? <span className="pull-indicator__spinner" /> : pullDistance >= 60 ? '释放刷新' : '下拉刷新'}
        </div>
      )}

      {/* ── 精选轮播 ── */}
      {showFullLayout && <HeroSection recipes={heroRecipes} />}

      {/* ── 分类快速入口 ── */}
      {showFullLayout && <CategoryCards />}

      {/* ── 搜索栏 ── */}
      <form className="home-search" onSubmit={e => { e.preventDefault(); handleSearchSubmit(searchInput) }}>
        <SearchAutocomplete
          value={searchInput}
          onChange={setSearchInput}
          onSubmit={handleSearchSubmit}
          placeholder="搜索食谱..."
          inputClassName="home-search__input"
        />
        <button type="submit" className="home-search__btn">搜索</button>
      </form>

      {/* ── 分类标签 ── */}
      <div className="home-categories">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`home-category ${category === cat ? 'active' : ''}`}
            onClick={() => handleCategoryChange(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── 筛选面板 ── */}
      <FilterPanel filters={filters} onChange={setFilters} />

      {/* ── 编辑精选区 ── */}
      {showFullLayout && showFeatured && <FeaturedSection />}

      {/* ── 全部食谱（或搜索结果） ── */}
      <section className="home-section">
        <h2 className="home-section__title">
          <span className="home-section__icon">{showFullLayout ? '📋' : '🔍'}</span>
          {showFullLayout ? '全部食谱' : '搜索结果'}
        </h2>

        {loading && (
          <div className="home-grid">
            {Array.from({ length: 6 }).map((_, i) => <RecipeCardSkeleton key={i} />)}
          </div>
        )}

        {!loading && recipes.length > 0 && (
          <div className="home-grid">
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