import { useState, useEffect } from 'react'
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

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') || ''
  const page = Number(searchParams.get('page')) || 1

  const [inputValue, setInputValue] = useState(q)
  const [results, setResults] = useState<Recipe[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const totalPages = Math.ceil(total / PAGE_SIZE)

  useEffect(() => {
    setInputValue(q)
  }, [q])

  useEffect(() => {
    if (!q.trim()) {
      setResults([])
      setTotal(0)
      return
    }

    setLoading(true)
    searchRecipes({ q: q.trim(), page, pageSize: PAGE_SIZE })
      .then((res: any) => {
        const list = res.data?.list || res.list || []
        setResults(list)
        const foundTotal = res.data?.total || res.total || 0
        setTotal(foundTotal)

        // No results toast
        if (foundTotal === 0 && page === 1) {
          toast.info('没有找到相关食谱，试试其他关键词')
        }
      })
      .catch(() => {
        setResults([])
        setTotal(0)
      })
      .finally(() => setLoading(false))
  }, [q, page])

  const handleSearchSubmit = (query: string) => {
    if (!query.trim()) return
    setSearchParams({ q: query.trim(), page: '1' })
  }

  const goPage = (newPage: number) => {
    setSearchParams({ q, page: String(newPage) })
  }

  return (
    <div className="search-page">
      {/* 搜索栏 - 使用自动补全组件 */}
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

      {q && (
        <p className="search-result-info">
          搜索「{q}」{loading ? '...' : `，共找到 ${total} 个食谱`}
        </p>
      )}

      {/* 加载态 - 骨架屏 */}
      {loading && (
        <div className="search-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <RecipeCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* 结果列表 - 带关键词高亮 */}
      {!loading && results.length > 0 && (
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

      {/* 空状态 */}
      {!loading && q && results.length === 0 && (
        <div className="search-empty">
          <div className="search-empty__icon">🔍</div>
          <p className="search-empty__text">没有找到相关食谱</p>
          <p className="search-empty__hint">试试其他关键词</p>
        </div>
      )}

      {/* 无搜索词时 */}
      {!q && !loading && (
        <div className="search-empty">
          <div className="search-empty__icon">🍳</div>
          <p className="search-empty__text">输入关键词搜索食谱</p>
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