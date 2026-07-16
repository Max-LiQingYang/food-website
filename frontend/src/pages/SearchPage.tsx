import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { searchRecipes, getHotSearches, getRecipes } from '../api'
import RecipeCard from '../components/RecipeCard'
import SearchAutocomplete from '../components/SearchAutocomplete'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import { highlightText } from '../utils/highlightText'
import { useToast } from '../context/ToastContext'
import { CATEGORIES as CATEGORIES_SHARED } from '../constants/categories'
import type { Recipe } from '../api'
import './SearchPage.css'
import PageSkeleton from '../components/PageSkeleton'

const PAGE_SIZE = 12

/** 分类中文映射（用共享常量） */
const CATEGORIES: Record<string, string> = Object.fromEntries(
  CATEGORIES_SHARED.map(c => [c.key, c.label])
)

/** 难度中文映射 */
const DIFFICULTIES: Record<string, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
}

const SORT_OPTIONS: Record<string, string> = {
  newest: '最新发布',
  oldest: '最早发布',
  cookTime_asc: '烹饪时间 ↑',
  cookTime_desc: '烹饪时间 ↓',
}

// ── 视图切换 ──
const VIEW_KEY = 'search_view_mode'
type ViewMode = 'grid' | 'list'

// ── 搜索历史格式（兼容旧数据） ──
interface HistoryItem { text: string; ts: number }

function getSearchHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem('search_history')
    if (!raw) return []
    const parsed = JSON.parse(raw)
    // 兼容旧格式 string[]
    if (parsed.length > 0 && typeof parsed[0] === 'string') {
      return (parsed as string[]).map(text => ({ text, ts: 0 }))
    }
    return parsed as HistoryItem[]
  } catch { return [] }
}

function addToSearchHistory(query: string) {
  const history = getSearchHistory().filter(h => h.text !== query)
  history.unshift({ text: query, ts: Date.now() })
  localStorage.setItem('search_history', JSON.stringify(history.slice(0, 10)))
}

function clearSearchHistory() {
  localStorage.removeItem('search_history')
}

function removeFromSearchHistory(query: string) {
  const history = getSearchHistory().filter(h => h.text !== query)
  localStorage.setItem('search_history', JSON.stringify(history))
}

/** 相对时间格式化 */
function formatRelativeTime(ts: number): string {
  if (!ts) return ''
  const diff = Date.now() - ts
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 7) return `${days} 天前`
  if (days < 30) return `${Math.floor(days / 7)} 周前`
  return `${Math.floor(days / 30)} 月前`
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') || ''
  const page = Number(searchParams.get('page')) || 1
  const categoryParam = searchParams.get('category') || ''
  const categoriesParam = searchParams.get('categories') || ''
  const difficultyParam = searchParams.get('difficulty') || ''
  const sortByParam = searchParams.get('sortBy') || ''

  const [inputValue, setInputValue] = useState(q)
  const [results, setResults] = useState<Recipe[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const toast = useToast()

  /** 多选分类 */
  const [filterCategories, setFilterCategories] = useState<string[]>(
    categoriesParam ? categoriesParam.split(',').map(s => s.trim()).filter(Boolean) :
    categoryParam ? [categoryParam] : []
  )
  const [filterDifficulty, setFilterDifficulty] = useState(difficultyParam)
  const [filterSortBy, setFilterSortBy] = useState(sortByParam)

  // 动态热门搜索词
  const [hotSearches, setHotSearches] = useState<Array<{ text: string; count: number }>>([])
  const [hotLoading, setHotLoading] = useState(false)
  const [historyRev, setHistoryRev] = useState(0)

  // ── A1: 视图切换 ──
  const [view, setView] = useState<ViewMode>(
    (localStorage.getItem(VIEW_KEY) as ViewMode) || 'grid'
  )
  const handleViewChange = useCallback((v: ViewMode) => {
    setView(v)
    localStorage.setItem(VIEW_KEY, v)
  }, [])

  // ── A3: 空结果随机推荐 ──
  const [randomRecipes, setRandomRecipes] = useState<Recipe[]>([])

  // ── C2: 移动端筛选抽屉 ──
  const [drawerOpen, setDrawerOpen] = useState(false)

  const totalPages = Math.ceil(total / PAGE_SIZE)

  // 同步 URL 参数到本地状态
  useEffect(() => {
    setInputValue(q)
    setFilterCategories(
      categoriesParam ? categoriesParam.split(',').map(s => s.trim()).filter(Boolean) :
      categoryParam ? [categoryParam] : []
    )
    setFilterDifficulty(difficultyParam)
    setFilterSortBy(sortByParam)
  }, [q, categoryParam, categoriesParam, difficultyParam, sortByParam])

  useEffect(() => {
    if (!q.trim()) {
      setResults([])
      setTotal(0)
      return
    }

    setLoading(true)
    const params: any = { q: q.trim(), page, pageSize: PAGE_SIZE }
    if (filterCategories.length > 0) params.categories = filterCategories.join(',')
    if (filterDifficulty) params.difficulty = filterDifficulty
    if (filterSortBy) params.sortBy = filterSortBy

    setError(null)
    searchRecipes(params)
      .then((res: any) => {
        const list = res.data?.list || res.list || []
        setResults(list)
        const foundTotal = res.data?.total || res.total || 0
        setTotal(foundTotal)

        if (foundTotal === 0 && page === 1) {
          toast.info('没有找到相关食谱，试试其他关键词或调整筛选条件')
        }
      })
      .catch((err) => {
        setError(err)
        setResults([])
        setTotal(0)
      })
      .finally(() => setLoading(false))
  }, [q, page, filterCategories, filterDifficulty, filterSortBy])

  // 加载热门搜索词
  useEffect(() => {
    if (!q) {
      setHotLoading(true)
      getHotSearches()
        .then((res: any) => {
          const data = res.data?.data || res.data
          const list = data?.list || []
          setHotSearches(list)
        })
        .catch(() => setHotSearches([]))
        .finally(() => setHotLoading(false))
    }
  }, [q])

  // ── A3: 空结果时加载随机推荐 ──
  useEffect(() => {
    if (!loading && q && total === 0 && page === 1 && randomRecipes.length === 0) {
      getRecipes({ sortBy: 'hot', pageSize: 12 })
        .then((res: any) => {
          const data = res.data || res
          const list: Recipe[] = data.list || []
          // 随机抽 3 道
          const shuffled = [...list].sort(() => Math.random() - 0.5)
          setRandomRecipes(shuffled.slice(0, 3))
        })
        .catch(() => setRandomRecipes([]))
    }
  }, [loading, q, total, page])

  // 重置随机推荐（新搜索时）
  useEffect(() => {
    setRandomRecipes([])
  }, [q])

  const buildUrlParams = (overrides: Record<string, string> = {}) => {
    const params: Record<string, string> = { ...overrides }
    if (!params.q) params.q = q
    if (!params.page) params.page = '1'
    if (filterCategories.length > 0) params.categories = filterCategories.join(',')
    else delete params.categories
    if (filterDifficulty) params.difficulty = filterDifficulty
    if (filterSortBy) params.sortBy = filterSortBy
    return params
  }

  const handleSearchSubmit = (query: string) => {
    if (!query.trim()) return
    addToSearchHistory(query.trim())
    setSearchParams(buildUrlParams({ q: query.trim(), page: '1' }))
  }

  const handleCategoryToggle = (catKey: string) => {
    const next = filterCategories.includes(catKey)
      ? filterCategories.filter(c => c !== catKey)
      : [...filterCategories, catKey]
    setFilterCategories(next)
    setSearchParams(buildUrlParams({ categories: next.join(',') }))
  }

  const handleFilterChange = (key: string, value: string) => {
    if (key === 'category' || key === 'categories') {
      if (value) {
        setFilterCategories([value])
        setSearchParams(buildUrlParams({ categories: value }))
      } else {
        setFilterCategories([])
        setSearchParams(buildUrlParams({ categories: '' }))
      }
    } else if (key === 'difficulty') {
      setFilterDifficulty(value)
      setSearchParams(buildUrlParams({ difficulty: value }))
    } else if (key === 'sortBy') {
      setFilterSortBy(value)
      setSearchParams(buildUrlParams({ sortBy: value }))
    }
  }

  // ── A2: 筛选摘要 chip ──
  const filterSummary = useMemo(() => {
    const parts: Array<{ key: string; label: string; removeKey: string; removeValue: string }> = []
    filterCategories.forEach(c => {
      parts.push({ key: `cat-${c}`, label: CATEGORIES[c] || c, removeKey: 'categories', removeValue: c })
    })
    if (filterDifficulty) {
      parts.push({ key: 'diff', label: DIFFICULTIES[filterDifficulty] || filterDifficulty, removeKey: 'difficulty', removeValue: '' })
    }
    if (filterSortBy) {
      parts.push({ key: 'sort', label: SORT_OPTIONS[filterSortBy] || filterSortBy, removeKey: 'sortBy', removeValue: '' })
    }
    return parts
  }, [filterCategories, filterDifficulty, filterSortBy])

  const removeFilter = (item: typeof filterSummary[number]) => {
    if (item.removeKey === 'categories') {
      const next = filterCategories.filter(c => c !== item.removeValue)
      setFilterCategories(next)
      setSearchParams(buildUrlParams({ categories: next.join(',') }))
    } else if (item.removeKey === 'difficulty') {
      setFilterDifficulty('')
      setSearchParams(buildUrlParams({ difficulty: '' }))
    } else if (item.removeKey === 'sortBy') {
      setFilterSortBy('')
      setSearchParams(buildUrlParams({ sortBy: '' }))
    }
  }

  // ── A4: 热门搜索归一化 ──
  const maxHotCount = useMemo(() => {
    if (hotSearches.length === 0) return 1
    return Math.max(...hotSearches.map(h => h.count), 1)
  }, [hotSearches])

  const hasActiveFilters = filterCategories.length > 0 || filterDifficulty || filterSortBy
  const hasResults = results.length > 0

  const goPage = (newPage: number) => {
    const params = buildUrlParams({ page: String(newPage) })
    setSearchParams(params)
  }

  return (
    <div className="search-page">
      {/* 搜索栏 */}
      <form
        className="search-bar"
        onSubmit={e => {
          e.preventDefault()
          handleSearchSubmit(inputValue)
        }}
      >
        <div className="search-bar__input-wrap">
          <span className="search-bar__icon">🔍</span>
          <SearchAutocomplete
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSearchSubmit}
            placeholder="搜索食谱..."
            inputClassName="search-input search-input--autocomplete"
            showHotSearches={false}
          />
          {/* C1: 语音搜索按钮（UI占位） */}
          <button
            type="button"
            className="search-bar__voice"
            aria-label="语音搜索（暂未开放）"
            title="语音搜索"
            tabIndex={-1}
          >
            🎤
          </button>
        </div>
        <button type="submit" className="search-btn">
          搜索
        </button>
      </form>

      {/* 结果信息行 + 视图切换 */}
      {q && (
        <div className="search-result-info-row">
          <div className="search-result-info">
            <span className="search-result-info__count">
              搜索「{q}」{loading ? '...' : `，共找到 `}<strong>{total}</strong> 个食谱
            </span>
            {/* A2: 筛选摘要 chip */}
            {filterSummary.length > 0 && !loading && (
              <>
                <span className="search-result-info__divider" />
                <span className="search-result-info__chips">
                  {filterSummary.map(item => (
                    <span key={item.key} className="search-chip">
                      {item.label}
                      <button
                        className="search-chip__remove"
                        onClick={() => removeFilter(item)}
                        aria-label={`移除筛选：${item.label}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </span>
              </>
            )}
          </div>
          {/* A1: 视图切换 */}
          {!loading && hasResults && (
            <div className="search-view-toggle" role="group" aria-label="切换视图">
              <button
                className={`search-view-btn ${view === 'grid' ? 'is-active' : ''}`}
                onClick={() => handleViewChange('grid')}
                aria-label="网格视图"
                aria-pressed={view === 'grid'}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>
              </button>
              <button
                className={`search-view-btn ${view === 'list' ? 'is-active' : ''}`}
                onClick={() => handleViewChange('list')}
                aria-label="列表视图"
                aria-pressed={view === 'list'}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="2" width="14" height="3" rx="1"/><rect x="1" y="7" width="14" height="3" rx="1"/><rect x="1" y="12" width="14" height="3" rx="1"/></svg>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 标签式筛选栏（桌面端） */}
      {q && !loading && (
        <div className="search-tag-filters search-tag-filters--desktop">
          {/* 分类标签 - 多选 */}
          <div className="search-tag-group">
            <span className="search-tag-group__label">分类</span>
            <div className="search-tag-group__tags">
              <button
                className={`search-filter-tag ${filterCategories.length === 0 ? 'is-active' : ''}`}
                onClick={() => {
                  setFilterCategories([])
                  setSearchParams(buildUrlParams({ categories: '' }))
                }}
              >
                全部
              </button>
              {Object.entries(CATEGORIES).map(([key, label]) => (
                <button
                  key={key}
                  className={`search-filter-tag ${filterCategories.includes(key) ? 'is-active' : ''}`}
                  onClick={() => handleCategoryToggle(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 难度标签 */}
          <div className="search-tag-group">
            <span className="search-tag-group__label">难度</span>
            <div className="search-tag-group__tags">
              <button
                className={`search-filter-tag ${!filterDifficulty ? 'is-active' : ''}`}
                onClick={() => handleFilterChange('difficulty', '')}
              >
                不限
              </button>
              {Object.entries(DIFFICULTIES).map(([key, label]) => (
                <button
                  key={key}
                  className={`search-filter-tag ${filterDifficulty === key ? 'is-active' : ''}`}
                  onClick={() => handleFilterChange('difficulty', key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 排序标签 */}
          <div className="search-tag-group">
            <span className="search-tag-group__label">排序</span>
            <div className="search-tag-group__tags">
              <button
                className={`search-filter-tag ${!filterSortBy ? 'is-active' : ''}`}
                onClick={() => handleFilterChange('sortBy', '')}
              >
                默认
              </button>
              {Object.entries(SORT_OPTIONS).map(([key, label]) => (
                <button
                  key={key}
                  className={`search-filter-tag ${filterSortBy === key ? 'is-active' : ''}`}
                  onClick={() => handleFilterChange('sortBy', key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 清除所有筛选 */}
          {hasActiveFilters && (
            <button
              className="search-filter-clear-all"
              onClick={() => {
                setFilterCategories([])
                setFilterDifficulty('')
                setFilterSortBy('')
                setSearchParams({ q, page: '1' })
              }}
            >
              ✕ 清除筛选
            </button>
          )}
        </div>
      )}

      {/* C2: 移动端筛选按钮（仅移动端显示） */}
      {q && !loading && (
        <button
          className="search-drawer-trigger"
          onClick={() => setDrawerOpen(true)}
          aria-label="打开筛选面板"
        >
          🔽 筛选{hasActiveFilters ? ` (${filterSummary.length})` : ''}
        </button>
      )}

      {/* C2: 移动端筛选抽屉 */}
      {drawerOpen && (
        <>
          <div className="search-drawer-overlay" onClick={() => setDrawerOpen(false)} />
          <div className="search-drawer" role="dialog" aria-label="筛选面板">
            <div className="search-drawer__handle" />
            <div className="search-drawer__header">
              <span className="search-drawer__title">筛选条件</span>
              <button className="search-drawer__close" onClick={() => setDrawerOpen(false)}>✕</button>
            </div>
            <div className="search-drawer__body">
              {/* 分类 */}
              <div className="search-drawer__section">
                <span className="search-drawer__section-label">分类</span>
                <div className="search-drawer__options">
                  <label className={`search-drawer__option ${filterCategories.length === 0 ? 'is-active' : ''}`}>
                    <input
                      type="radio"
                      name="drawer-category"
                      checked={filterCategories.length === 0}
                      onChange={() => {
                        setFilterCategories([])
                        setSearchParams(buildUrlParams({ categories: '' }))
                      }}
                    />
                    全部
                  </label>
                  {Object.entries(CATEGORIES).map(([key, label]) => (
                    <label key={key} className={`search-drawer__option ${filterCategories.includes(key) ? 'is-active' : ''}`}>
                      <input
                        type="checkbox"
                        checked={filterCategories.includes(key)}
                        onChange={() => handleCategoryToggle(key)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              {/* 难度 */}
              <div className="search-drawer__section">
                <span className="search-drawer__section-label">难度</span>
                <div className="search-drawer__options">
                  <label className={`search-drawer__option ${!filterDifficulty ? 'is-active' : ''}`}>
                    <input
                      type="radio"
                      name="drawer-difficulty"
                      checked={!filterDifficulty}
                      onChange={() => handleFilterChange('difficulty', '')}
                    />
                    不限
                  </label>
                  {Object.entries(DIFFICULTIES).map(([key, label]) => (
                    <label key={key} className={`search-drawer__option ${filterDifficulty === key ? 'is-active' : ''}`}>
                      <input
                        type="radio"
                        name="drawer-difficulty"
                        checked={filterDifficulty === key}
                        onChange={() => handleFilterChange('difficulty', key)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              {/* 排序 */}
              <div className="search-drawer__section">
                <span className="search-drawer__section-label">排序</span>
                <div className="search-drawer__options">
                  <label className={`search-drawer__option ${!filterSortBy ? 'is-active' : ''}`}>
                    <input
                      type="radio"
                      name="drawer-sort"
                      checked={!filterSortBy}
                      onChange={() => handleFilterChange('sortBy', '')}
                    />
                    默认
                  </label>
                  {Object.entries(SORT_OPTIONS).map(([key, label]) => (
                    <label key={key} className={`search-drawer__option ${filterSortBy === key ? 'is-active' : ''}`}>
                      <input
                        type="radio"
                        name="drawer-sort"
                        checked={filterSortBy === key}
                        onChange={() => handleFilterChange('sortBy', key)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="search-drawer__footer">
              {hasActiveFilters && (
                <button
                  className="search-drawer__reset"
                  onClick={() => {
                    setFilterCategories([])
                    setFilterDifficulty('')
                    setFilterSortBy('')
                    setSearchParams({ q, page: '1' })
                  }}
                >
                  重置
                </button>
              )}
              <button className="search-drawer__confirm" onClick={() => setDrawerOpen(false)}>
                确定
              </button>
            </div>
          </div>
        </>
      )}

      {/* 搜索历史和热门搜索 - 无搜索词时展示 */}
      {!q && !loading && (
        <>
          {/* A5: 搜索历史带时间戳 */}
          {getSearchHistory().length > 0 && (
            <div className="search-history">
              <div className="search-history__header">
                <span className="search-history__label">🕐 搜索历史</span>
                <button
                  className="search-history__clear"
                  onClick={() => {
                    clearSearchHistory()
                    setHistoryRev(v => v + 1)
                  }}
                >
                  清除全部
                </button>
              </div>
              <div className="search-history__tags">
                {getSearchHistory().map((item, i) => (
                  <span key={`${item.text}-${i}`} className="search-history-tag-wrap">
                    <button
                      className="search-history-tag"
                      onClick={() => {
                        setInputValue(item.text)
                        setTimeout(() => handleSearchSubmit(item.text), 0)
                      }}
                    >
                      {item.text}
                      {item.ts ? (
                        <span className="search-history-tag__time">{formatRelativeTime(item.ts)}</span>
                      ) : null}
                    </button>
                    <button
                      className="search-history-tag__del"
                      onClick={e => {
                        e.stopPropagation()
                        removeFromSearchHistory(item.text)
                        setHistoryRev(v => v + 1)
                      }}
                      title="删除此条"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* A4: 热门搜索词视觉升级（带排名 + 热度条） */}
          <div className="search-hot-words">
            <span className="search-hot-words__label">🔥 热门搜索</span>
            {hotLoading ? (
              <div className="search-hot-words__loading">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className="search-hot-words__loading-item" />
                ))}
              </div>
            ) : hotSearches.length > 0 ? (
              <div className="search-hot-words__cards">
                {hotSearches.slice(0, 10).map(({ text, count }, idx) => (
                  <button
                    key={text}
                    className={`search-hot-card ${idx < 3 ? 'search-hot-card--top' : ''}`}
                    onClick={() => {
                      setInputValue(text)
                      setTimeout(() => handleSearchSubmit(text), 0)
                    }}
                  >
                    <span className={`search-hot-card__rank ${idx < 3 ? 'search-hot-card__rank--top' : ''}`}>
                      {idx + 1}
                    </span>
                    <span className="search-hot-card__text">{text}</span>
                    <div className="search-hot-card__bar-track">
                      <div
                        className={`search-hot-card__bar-fill ${idx < 3 ? 'search-hot-card__bar-fill--top' : ''}`}
                        style={{ width: `${Math.max((count / maxHotCount) * 100, 8)}%` }}
                      />
                    </div>
                    <span className="search-hot-card__count">{count}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </>
      )}

      {/* 加载态 - 骨架屏 */}
      {loading && (
        <PageSkeleton type="list" />
      )}

      {/* 错误状态 */}
      {!loading && error && (
        <ErrorState
          errorCode="ERR_SEARCH_500"
          onRetry={() => handleSearchSubmit(q)}
        />
      )}

      {/* A1: 结果列表 — 网格 / 列表 */}
      {!loading && !error && hasResults && (
        <div className={`search-grid ${view === 'list' ? 'search-grid--list' : 'search-grid--grid'} recipe-grid`}>
          {useMemo(() => (
            view === 'grid' ? (
              results.map(recipe => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  highlightQuery={q}
                />
              ))
            ) : (
              results.map(recipe => (
                <Link to={`/recipe/${recipe.id}`} key={recipe.id} className="search-list-item">
                  <div className="search-list-item__thumb">
                    <img src={recipe.coverImage} alt="" loading="lazy" />
                  </div>
                  <div className="search-list-item__body">
                    <h3
                      className="search-list-item__title"
                      dangerouslySetInnerHTML={{ __html: highlightText(recipe.title, q) }}
                    />
                    <p className="search-list-item__desc">
                      {recipe.description || recipe.story || '点击查看详细做法'}
                    </p>
                    <div className="search-list-item__meta">
                      <span>⏱ {recipe.cookTime || '-'} 分钟</span>
                      <span className="dot">·</span>
                      <span>👤 {recipe.author || '匿名'}</span>
                      {recipe.avgRating ? (
                        <>
                          <span className="dot">·</span>
                          <span>⭐ {recipe.avgRating.toFixed(1)}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className="search-list-item__action" aria-hidden="true">›</div>
                </Link>
              ))
            )
          ), [results, view, q])}
        </div>
      )}

      {/* A3: 空结果趣味引导 + 随机推荐 */}
      {!loading && !error && q && !hasResults && (
        <>
          <EmptyState
            variant="no-search"
            icon="🔍"
            title="没有找到相关食谱"
            description="试试调整关键词或筛选条件"
            hotTags={(hotSearches.length > 0 ? hotSearches.slice(0, 8) : [
              { text: '番茄炒蛋' }, { text: '红烧肉' }, { text: '蛋糕' }, { text: '牛肉' }
            ]).map(item => ({
              text: item.text,
              onClick: () => {
                setInputValue(item.text)
                setTimeout(() => handleSearchSubmit(item.text), 0)
              }
            }))}
          />
          {randomRecipes.length > 0 && (
            <div className="search-recommend">
              <h3 className="search-recommend__title">
                没找到「{q}」的食谱，试试这些热门：
              </h3>
              <div className="search-recommend__grid">
                {randomRecipes.map(r => (
                  <Link to={`/recipe/${r.id}`} key={r.id} className="search-recommend-card">
                    <div className="search-recommend-card__thumb">
                      <img src={r.coverImage} alt="" loading="lazy" />
                    </div>
                    <div className="search-recommend-card__body">
                      <span className="search-recommend-card__title">{r.title}</span>
                      <div className="search-recommend-card__meta">
                        {r.cookTime ? <span>⏱ {r.cookTime}分钟</span> : null}
                        {r.avgRating ? <span>⭐ {r.avgRating.toFixed(1)}</span> : null}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* 无搜索词时默认提示 */}
      {!q && !loading && (
        <EmptyState
          icon="🍳"
          title="输入关键词搜索食谱"
          description="试试搜「番茄炒蛋」「红烧肉」「蛋糕」..."
          variant="compact"
        />
      )}

      {/* 分页 */}
      {total > PAGE_SIZE && (
        <div className="search-pagination">
          <button className="pagination-btn" disabled={page <= 1} onClick={() => goPage(page - 1)}>
            ← 上一页
          </button>
          <span className="pagination-info">
            第 {page} / {totalPages} 页
          </span>
          <button
            className="pagination-btn"
            disabled={page >= totalPages}
            onClick={() => goPage(page + 1)}
          >
            下一页 →
          </button>
        </div>
      )}
    </div>
  )
}
