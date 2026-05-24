import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { searchRecipes } from '../api'
import RecipeCard from '../components/RecipeCard'
import RecipeCardSkeleton from '../components/RecipeCardSkeleton'
import SearchAutocomplete from '../components/SearchAutocomplete'
import { highlightText } from '../utils/highlightText'
import { useToast } from '../context/ToastContext'
import type { Recipe } from '../api'
import './SearchPage.css'

const PAGE_SIZE = 12

/** 分类中文映射 */
const CATEGORIES: Record<string, string> = {
  chinese: '中餐',
  western: '西餐',
  japanese: '日料',
  korean: '韩料',
  dessert: '甜点',
  thai: '泰式',
  indian: '印式',
  vietnamese: '越式',
}

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

/** 热门搜索词（带图标） */
const HOT_SEARCH_WORDS = [
  { text: '番茄炒蛋', icon: '🍅' },
  { text: '红烧肉', icon: '🥩' },
  { text: '蛋糕', icon: '🎂' },
  { text: '鸡肉', icon: '🍗' },
  { text: '汤', icon: '🥣' },
  { text: '牛肉', icon: '🐂' },
  { text: '素菜', icon: '🥬' },
  { text: '面条', icon: '🍜' },
]

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

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') || ''
  const page = Number(searchParams.get('page')) || 1
  const categoryParam = searchParams.get('category') || ''
  const difficultyParam = searchParams.get('difficulty') || ''
  const sortByParam = searchParams.get('sortBy') || ''

  const [inputValue, setInputValue] = useState(q)
  const [results, setResults] = useState<Recipe[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const [filterCategory, setFilterCategory] = useState(categoryParam)
  const [filterDifficulty, setFilterDifficulty] = useState(difficultyParam)
  const [filterSortBy, setFilterSortBy] = useState(sortByParam)

  const totalPages = Math.ceil(total / PAGE_SIZE)

  // 同步 URL 参数到本地状态
  useEffect(() => {
    setInputValue(q)
    setFilterCategory(categoryParam)
    setFilterDifficulty(difficultyParam)
    setFilterSortBy(sortByParam)
  }, [q, categoryParam, difficultyParam, sortByParam])

  useEffect(() => {
    if (!q.trim()) {
      setResults([])
      setTotal(0)
      return
    }

    setLoading(true)
    const params: any = { q: q.trim(), page, pageSize: PAGE_SIZE }
    if (filterCategory) params.category = filterCategory
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
  }, [q, page, filterCategory, filterDifficulty, filterSortBy])

  const handleSearchSubmit = (query: string) => {
    if (!query.trim()) return
    addToSearchHistory(query.trim())
    const params: Record<string, string> = { q: query.trim(), page: '1' }
    if (filterCategory) params.category = filterCategory
    if (filterDifficulty) params.difficulty = filterDifficulty
    if (filterSortBy) params.sortBy = filterSortBy
    setSearchParams(params)
  }

  const handleFilterChange = (key: string, value: string) => {
    const params: Record<string, string> = { q, page: '1' }
    if (key === 'category') {
      if (value) params.category = value
      setFilterCategory(value)
    } else if (key === 'difficulty') {
      if (value) params.difficulty = value
      setFilterDifficulty(value)
    } else if (key === 'sortBy') {
      if (value) params.sortBy = value
      setFilterSortBy(value)
    }
    // Preserve other filters
    if (key !== 'category' && filterCategory) params.category = filterCategory
    if (key !== 'difficulty' && filterDifficulty) params.difficulty = filterDifficulty
    if (key !== 'sortBy' && filterSortBy) params.sortBy = filterSortBy
    setSearchParams(params)
  }

  const hasActiveFilters = filterCategory || filterDifficulty || filterSortBy
  const hasResults = results.length > 0

  const goPage = (newPage: number) => {
    const params: Record<string, string> = { q, page: String(newPage) }
    if (filterCategory) params.category = filterCategory
    if (filterDifficulty) params.difficulty = filterDifficulty
    if (filterSortBy) params.sortBy = filterSortBy
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

      {/* 标签式筛选栏 — 替代下拉框 */}
      {q && !loading && (
        <div className="search-tag-filters">
          {/* 分类标签 */}
          <div className="search-tag-group">
            <span className="search-tag-group__label">分类</span>
            <div className="search-tag-group__tags">
              <button
                className={`search-filter-tag ${!filterCategory ? 'is-active' : ''}`}
                onClick={() => handleFilterChange('category', '')}
              >
                全部
              </button>
              {Object.entries(CATEGORIES).map(([key, label]) => (
                <button
                  key={key}
                  className={`search-filter-tag ${filterCategory === key ? 'is-active' : ''}`}
                  onClick={() => handleFilterChange('category', key)}
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
                setFilterCategory('')
                setFilterDifficulty('')
                setFilterSortBy('')
                const params: Record<string, string> = { q, page: '1' }
                setSearchParams(params)
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
          {/* 搜索历史 */}
          {getSearchHistory().length > 0 && (
            <div className="search-history">
              <div className="search-history__header">
                <span className="search-history__label">🕐 搜索历史</span>
                <button
                  className="search-history__clear"
                  onClick={() => {
                    clearSearchHistory()
                    // Force re-render
                    setInputValue('')
                  }}
                >
                  清除
                </button>
              </div>
              <div className="search-history__tags">
                {getSearchHistory().map((word, i) => (
                  <button
                    key={i}
                    className="search-history-tag"
                    onClick={() => {
                      setInputValue(word)
                      setTimeout(() => handleSearchSubmit(word), 0)
                    }}
                  >
                    {word}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 热门搜索词 */}
          <div className="search-hot-words">
            <span className="search-hot-words__label">🔥 热门搜索</span>
            <div className="search-hot-words__tags">
              {HOT_SEARCH_WORDS.map(({ text, icon }) => (
                <button
                  key={text}
                  className="search-hot-word"
                  onClick={() => {
                    setInputValue(text)
                    setTimeout(() => handleSearchSubmit(text), 0)
                  }}
                >
                  {icon} {text}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* 加载态 - 骨架屏 */}
      {loading && (
        <div className="search-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <RecipeCardSkeleton key={i} />
          ))}
        </div>
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

      {/* 空状态 — 增强版 */}
      {!loading && q && !hasResults && (
        <div className="search-empty search-empty--no-results">
          <div className="search-empty__icon">🔍</div>
          <p className="search-empty__text">没有找到相关食谱</p>
          <p className="search-empty__hint">试试调整关键词或筛选条件</p>
          <div className="search-empty__suggestions">
            <p className="search-empty__suggestions-label">💡 试试这些热搜词：</p>
            <div className="search-empty__suggestion-tags">
              {HOT_SEARCH_WORDS.slice(0, 4).map(({ text, icon }) => (
                <button
                  key={text}
                  className="search-hot-word"
                  onClick={() => {
                    setInputValue(text)
                    setTimeout(() => handleSearchSubmit(text), 0)
                  }}
                >
                  {icon} {text}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 无搜索词时默认提示 — AI 推荐搜索 */}
      {!q && !loading && (
        <div className="search-empty">
          <div className="search-empty__icon">🍳</div>
          <p className="search-empty__text">输入关键词搜索食谱</p>
          <p className="search-empty__hint">试试搜「番茄炒蛋」「红烧肉」「蛋糕」...</p>
        </div>
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