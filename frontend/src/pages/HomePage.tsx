import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRecipes } from '../api'
import RecipeCard from '../components/RecipeCard'
import type { Recipe } from '../api'
import './HomePage.css'

const CATEGORIES = ['全部', '中餐', '西餐', '甜点', '日韩', '其他'] as const
const PAGE_SIZE = 12

export default function HomePage() {
  const navigate = useNavigate()

  const [category, setCategory] = useState('全部')
  const [page, setPage] = useState(1)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')

  const totalPages = Math.ceil(total / PAGE_SIZE)

  useEffect(() => {
    setLoading(true)
    const params: { page: number; pageSize: number; category?: string } = {
      page,
      pageSize: PAGE_SIZE,
    }
    if (category !== '全部') {
      params.category = category
    }
    getRecipes(params)
      .then((res: any) => {
        const data = res.data || res
        setRecipes(data.list || [])
        setTotal(data.total || 0)
      })
      .catch(() => {
        setRecipes([])
        setTotal(0)
      })
      .finally(() => setLoading(false))
  }, [category, page])

  const handleCategoryChange = (cat: string) => {
    if (cat === category) return
    setCategory(cat)
    setPage(1)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchInput.trim()) return
    navigate(`/search?q=${encodeURIComponent(searchInput.trim())}`)
  }

  const goPage = (newPage: number) => {
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="home-page">
      {/* 搜索栏 */}
      <form className="home-search" onSubmit={handleSearch}>
        <input
          type="text"
          className="home-search__input"
          placeholder="搜索食谱..."
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
        />
        <button type="submit" className="home-search__btn">搜索</button>
      </form>

      {/* 分类标签页 */}
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

      {/* 加载态 - 骨架屏 */}
      {loading && (
        <div className="home-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="home-card-skeleton">
              <div className="skeleton-box skeleton-cover" />
              <div className="skeleton-body">
                <div className="skeleton-box skeleton-title" />
                <div className="skeleton-box skeleton-meta" />
              </div>
            </div>
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
          <p className="home-empty__hint">稍后再来看看吧~</p>
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