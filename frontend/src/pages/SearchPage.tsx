import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { searchRecipes, getHotSearches } from '../api'
import RecipeCard from '../components/RecipeCard'
import RecipeCardSkeleton from '../components/RecipeCardSkeleton'
import SearchAutocomplete from '../components/SearchAutocomplete'
import EmptyState from '../components/EmptyState'
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

/** localStorage 搜索历史 */
function getSearchHistory(): string[] {
  try {
    const raw = localStorage.getItem('search_history')
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function addToSearchHistory(query: string) {
  const history = getSearchHistory().filter(h => h !== query)
  history.unshift(query)
  localStorage.setItem('search_history', JSON.stringify(history.slice(0, 10)))
}

function clearSearchHistory() {
  localStorage.removeItem('search_history')
}

function removeFromSearchHistory(query: string) {
  const history = getSearchHistory().filter(h => h !== query)
  localStorage.setItem('search_history', JSON.stringify(history))
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
  const toast = useToast()

  /** 多选分类：支持 categories 数组参数或旧的 single category */
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
      .catch(() => {
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
        </div>
        <button type="submit" className="search-btn">
          搜索
        </button>
      </form>

      {/* 结果信息 */}
      {q && (
        <p className="search-result-info">
          搜索「{q}」{loading ? '...' : `，共找到 ${total} 个食谱`}
        </p>
      )}

      {/* 标签式筛选栏 */}
      {q && !loading && (
        <div className="search-tag-filters">
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

      {/* 搜索历史和热门搜索 - 无搜索词时展示 */}
      {!q && !loading && (
        <>
          {getSearchHistory().length > 0 && (
            <div className="search-history">
              <div className="search-history__header">
                <span className="search-history__label">🕐 搜索历史</span>
                <button
                  className="search-history__clear"
                  onClick={() => {
                    clearSearchHistory()
                    setInputValue('')
                  }}
                >
                  清除全部
                </button>
              </div>
              <div className="search-history__tags">
                {getSearchHistory().map((word, i) => (
                  <span key={i} className="search-history-tag-wrap">
                    <button
                      className="search-history-tag"
                      onClick={() => {
                        setInputValue(word)
                        setTimeout(() => handleSearchSubmit(word), 0)
                      }}
                    >
                      {word}
                    </button>
                    <button
                      className="search-history-tag__del"
                      onClick={e => {
                        e.stopPropagation()
                        removeFromSearchHistory(word)
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

          <div className="search-hot-words">
            <span className="search-hot-words__label">🔥 热门搜索</span>
            {hotLoading ? (
              <div className="search-hot-words__loading">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className="search-hot-words__loading-item" />
                ))}
              </div>
            ) : hotSearches.length > 0 ? (
              <div className="search-hot-words__tags">
                {hotSearches.map(({ text }) => (
                  <button
                    key={text}
                    className="search-hot-word"
                    onClick={() => {
                      setInputValue(text)
                      setTimeout(() => handleSearchSubmit(text), 0)
                    }}
                  >
                    {text}
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

      {/* 结果列表 */}
      {!loading && hasResults && (
        <div className="search-grid">
          {results.map(recipe => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              highlightQuery={q}
            />
          ))}
        </div>
      )}

      {/* 空状态 - 无结果 */}
      {!loading && q && !hasResults && (
        <EmptyState
          icon="🔍"
          title="没有找到相关食谱"
          description="试试调整关键词或筛选条件"
          variant="search"
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