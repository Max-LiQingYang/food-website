import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { searchRecipes } from '../api'
import RecipeCard from '../components/RecipeCard'
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
        setResults(res.data?.list || res.list || [])
        setTotal(res.data?.total || res.total || 0)
      })
      .catch(() => {
        setResults([])
        setTotal(0)
      })
      .finally(() => setLoading(false))
  }, [q, page])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return
    setSearchParams({ q: inputValue.trim(), page: '1' })
  }

  const goPage = (newPage: number) => {
    setSearchParams({ q, page: String(newPage) })
  }

  return (
    <div className="search-page">
      {/* 搜索栏 */}
      <form className="search-bar" onSubmit={handleSearch}>
        <input
          type="text"
          className="search-input"
          placeholder="搜索食谱..."
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
        />
        <button type="submit" className="search-btn">
          搜索
        </button>
      </form>

      {q && (
        <p className="search-result-info">
          搜索「{q}」{loading ? '...' : `，共找到 ${total} 个食谱`}
        </p>
      )}

      {/* 加载态 */}
      {loading && (
        <div className="search-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="recipe-card recipe-card--skeleton">
              <div className="recipe-card__cover skeleton-box" />
              <div className="recipe-card__info">
                <div className="skeleton-box skeleton-box--title" />
                <div className="skeleton-box skeleton-box--meta" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 结果列表 */}
      {!loading && results.length > 0 && (
        <div className="search-grid">
          {results.map(recipe => (
            <RecipeCard key={recipe.id} recipe={recipe} />
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
