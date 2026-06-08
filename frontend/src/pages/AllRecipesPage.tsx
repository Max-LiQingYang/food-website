import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getRecipes } from '../api'
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
  { key: 'rating', label: '⭐ 评分最高' },
  { key: 'time', label: '⏱ 烹饪时间' },
]

export default function AllRecipesPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const initialCategory = searchParams.get('category') || ''
  const initialDifficulty = searchParams.get('difficulty') || ''
  const initialMaxCookTime = searchParams.get('maxCookTime') ? Number(searchParams.get('maxCookTime')) : null
  const initialSortBy = searchParams.get('sortBy') || ''

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

  const totalPages = Math.ceil(total / PAGE_SIZE)

  // Sync URL params
  useEffect(() => {
    const params: Record<string, string> = {}
    if (category) params.category = category
    if (filters.difficulty) params.difficulty = filters.difficulty
    if (filters.maxCookTime !== null) params.maxCookTime = String(filters.maxCookTime)
    if (filters.sortBy) params.sortBy = filters.sortBy
    if (page > 1) params.page = String(page)
    setSearchParams(params, { replace: true })
  }, [category, filters, page, setSearchParams])

  const fetchRecipes = useCallback(async (cat: string, pg: number, f: FilterState) => {
    setLoading(true)
    try {
      const params: Record<string, any> = { page: pg, pageSize: PAGE_SIZE }
      if (cat) params.category = cat
      if (f.difficulty) params.difficulty = f.difficulty
      if (f.maxCookTime !== null) params.maxCookTime = f.maxCookTime
      if (f.sortBy) params.sortBy = f.sortBy

      const res: any = await getRecipes(params)
      // Response interceptor already unwraps once:
      // res = { code: 0, data: { list, total } } → res.data = { list, total }
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

  // Re-fetch when category/page/filters change
  useEffect(() => {
    fetchRecipes(category, page, filters)
  }, [category, page, filters, fetchRecipes])

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

  const { refreshing, pullDistance, statusText, touchHandlers } = usePullToRefresh({
    onRefresh: () => fetchRecipes(category, page, filters),
  })

  usePageTitle('全部食谱')
  useMetaTags({ description: '浏览全部食谱，按分类、难度、烹饪时间筛选，发现美食灵感' })

  // Build page number range
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
    <div className="all-recipes-page" {...touchHandlers}>
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

      <div className="all-recipes-page__header">
        <h1>全部食谱</h1>
        <p className="all-recipes-page__subtitle">共 {total} 道食谱，发现你的下一道拿手菜</p>
      </div>

      {/* 分类标签 */}
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

      {/* 筛选 & 排序 */}
      <div className="all-recipes-page__toolbar">
        <FilterPanel filters={filters} onFilter={handleFilter} />
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

      {/* 食谱网格 */}
      {loading ? (
        <PageSkeleton type="list" />
      ) : allRecipes.length === 0 ? (
        <div className="all-recipes-page__empty">
          <span className="all-recipes-page__empty-icon">🔍</span>
          <p>没有找到匹配的食谱</p>
          <p className="all-recipes-page__empty-hint">换个分类或筛选条件试试</p>
          <button className="all-recipes-page__reset-btn" onClick={() => { setCategory(''); setPage(1); setFilters({ difficulty: '', maxCookTime: null, sortBy: '' }) }}>
            重置筛选
          </button>
        </div>
      ) : (
        <>
          <div className="all-recipes-page__grid">
            {allRecipes.map(recipe => (
              <RecipeCard key={recipe.id} recipe={recipe} />
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
    </div>
  )
}