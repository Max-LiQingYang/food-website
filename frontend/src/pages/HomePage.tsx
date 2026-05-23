import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getRecipes } from '../api'
import RecipeCard from '../components/RecipeCard'
import RecipeCardSkeleton from '../components/RecipeCardSkeleton'
import SearchAutocomplete from '../components/SearchAutocomplete'
import FilterPanel from '../components/FilterPanel'
import type { FilterState } from '../components/FilterPanel'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import type { Recipe } from '../api'
import './HomePage.css'

const CATEGORIES = ['全部', '中餐', '西餐', '甜点', '日韩', '其他'] as const
const PAGE_SIZE = 12

export default function HomePage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Read filters from URL params
  const initialCategory = searchParams.get('category') || '全部'
  const initialDifficulty = searchParams.get('difficulty') || ''
  const initialMaxCookTime = searchParams.get('maxCookTime')
    ? Number(searchParams.get('maxCookTime'))
    : null
  const initialSortBy = searchParams.get('sortBy') || ''

  const [category, setCategory] = useState(initialCategory)
  const [page, setPage] = useState(1)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    difficulty: initialDifficulty,
    maxCookTime: initialMaxCookTime,
    sortBy: initialSortBy,
  })

  const totalPages = Math.ceil(total / PAGE_SIZE)

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams()
    if (category !== '全部') params.set('category', category)
    if (filters.difficulty) params.set('difficulty', filters.difficulty)
    if (filters.maxCookTime !== null) params.set('maxCookTime', String(filters.maxCookTime))
    if (filters.sortBy) params.set('sortBy', filters.sortBy)
    setSearchParams(params, { replace: true })
  }, [category, filters, setSearchParams])

  // Fetch recipes
  const fetchRecipes = useCallback(async () => {
    setLoading(true)
    const params: Record<string, any> = {
      page,
      pageSize: PAGE_SIZE,
    }
    if (category !== '全部') params.category = category

    // TODO: Backend needs to support these filter params
    // if (filters.difficulty) params.difficulty = filters.difficulty
    // if (filters.maxCookTime !== null) params.maxCookTime = filters.maxCookTime
    // if (filters.sortBy) params.sortBy = filters.sortBy

    try {
      const res: any = await getRecipes(params)
      const data = res.data || res
      const rawList = data.list || []
      setTotal(data.total || 0)

      // Client-side filtering (temporary until backend supports these params)
      let filteredList = rawList
      // TODO: Remove client-side filtering when backend filter params are supported
      if (filters.difficulty) {
        filteredList = filteredList.filter((r: Recipe) => r.difficulty === filters.difficulty)
      }
      if (filters.maxCookTime !== null) {
        const maxTime = filters.maxCookTime
        if (maxTime === 61) {
          filteredList = filteredList.filter((r: Recipe) => (r.cookTime || 0) > 60)
        } else {
          filteredList = filteredList.filter((r: Recipe) => (r.cookTime || 0) <= maxTime)
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

  useEffect(() => {
    fetchRecipes()
  }, [fetchRecipes])

  // Pull-to-refresh
  const { refreshing, pullDistance } = usePullToRefresh({
    onRefresh: fetchRecipes,
  })

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

  return (
    <div className="home-page">
      {/* Pull-to-refresh indicator */}
      {pullDistance > 0 && (
        <div
          className="pull-indicator"
          style={{ height: `${pullDistance}px`, opacity: pullDistance / 60 }}
        >
          {refreshing ? (
            <span className="pull-indicator__spinner" />
          ) : pullDistance >= 60 ? (
            '释放刷新'
          ) : (
            '下拉刷新'
          )}
        </div>
      )}

      {/* 搜索栏 */}
      <form
        className="home-search"
        onSubmit={e => {
          e.preventDefault()
          handleSearchSubmit(searchInput)
        }}
      >
        <SearchAutocomplete
          value={searchInput}
          onChange={setSearchInput}
          onSubmit={handleSearchSubmit}
          placeholder="搜索食谱..."
          inputClassName="home-search__input"
        />
        <button type="submit" className="home-search__btn">
          搜索
        </button>
      </form>

      {/* 分类标签页 - 横向滚动 */}
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

      {/* 筛选面板 */}
      <FilterPanel filters={filters} onChange={setFilters} />

      {/* 加载态 - 骨架屏 */}
      {loading && (
        <div className="home-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <RecipeCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* 食谱卡片网格 */}
      {!loading && recipes.length > 0 && (
        <div className="home-grid">
          {recipes.map(recipe => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}

      {/* 空状态 */}
      {!loading && recipes.length === 0 && (
        <div className="home-empty">
          <div className="home-empty__icon">🍳</div>
          <p className="home-empty__text">暂无食谱</p>
          <p className="home-empty__hint">试试其它筛选条件~</p>
        </div>
      )}

      {/* 分页 */}
      {total > PAGE_SIZE && (
        <div className="home-pagination">
          <button
            className="pagination-btn"
            disabled={page <= 1 || loading}
            onClick={() => goPage(page - 1)}
          >
            ← 上一页
          </button>
          <span className="pagination-info">
            第 {page} / {totalPages} 页
          </span>
          <button
            className="pagination-btn"
            disabled={page >= totalPages || loading}
            onClick={() => goPage(page + 1)}
          >
            下一页 →
          </button>
        </div>
      )}
    </div>
  )
}