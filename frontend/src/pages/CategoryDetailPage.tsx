import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CATEGORIES, getCategoryInfo } from '../constants/categories'
import { getRecipes } from '../api'
import RecipeCard from '../components/RecipeCard'
import './CategoryDetailPage.css'
import PageSkeleton from '../components/PageSkeleton'

const PAGE_SIZE = 12

export default function CategoryDetailPage() {
  const { name } = useParams<{ name: string }>()
  const navigate = useNavigate()
  const catInfo = name ? getCategoryInfo(name) : null

  const [recipes, setRecipes] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!name || !catInfo) return
    setLoading(true)
    setError('')
    getRecipes({ page: 1, pageSize: PAGE_SIZE, category: name })
      .then(res => {
        // res 已由响应拦截器解包: res = { code: 0, data: { list, total } }
        // 兼容两种数据格式
        const data = res.data || res
        setRecipes(data.list || [])
        setTotal(data.total || 0)
        setPage(1)
      })
      .catch(() => setError('网络异常，请稍后重试'))
      .finally(() => setLoading(false))
  }, [name])

  const loadMore = () => {
    if (loading || recipes.length >= total) return
    const nextPage = page + 1
    setLoading(true)
    getRecipes({ page: nextPage, pageSize: PAGE_SIZE, category: name })
      .then(res => {
        const data = res.data || res
        setRecipes(prev => [...prev, ...(data.list || [])])
        setPage(nextPage)
      })
      .catch(() => setError('加载更多失败'))
      .finally(() => setLoading(false))
  }

  // 如果分类名无效
  if (!catInfo && name) {
    return (
      <div className="category-detail__empty">
        <span className="category-detail__empty-icon">🤷</span>
        <p>未找到「{name}」分类</p>
        <button className="category-detail__back-btn" onClick={() => navigate('/')}>
          返回首页
        </button>
      </div>
    )
  }

  return (
    <div className="category-detail">
      {/* 分类头部 */}
      <div
        className="category-detail__header"
        style={{ '--cat-color': catInfo?.color || '#888' } as React.CSSProperties}
      >
        <button className="category-detail__back" onClick={() => navigate(-1)} aria-label="返回">
          ←
        </button>
        <div className="category-detail__header-info">
          <span className="category-detail__header-icon">{catInfo?.icon}</span>
          <h1 className="category-detail__header-title">{catInfo?.label}</h1>
          {catInfo?.description && (
            <p className="category-detail__header-desc">{catInfo.description}</p>
          )}
        </div>
      </div>

      {/* 食谱统计 */}
      {!loading && !error && (
        <div className="category-detail__meta">
          共 {total} 道食谱
        </div>
      )}

      {/* 内容区 */}
      {loading && recipes.length === 0 ? (
        <PageSkeleton type="list" />
      ) : error ? (
        <div className="category-detail__empty">
          <span className="category-detail__empty-icon">⚠️</span>
          <p>{error}</p>
          <button className="category-detail__back-btn" onClick={() => navigate('/')}>
            返回首页
          </button>
        </div>
      ) : recipes.length === 0 ? (
        <div className="category-detail__empty">
          <span className="category-detail__empty-icon">🍽️</span>
          <p>该分类暂无食谱</p>
          <button className="category-detail__back-btn" onClick={() => navigate('/')}>
            返回首页
          </button>
        </div>
      ) : (
        <>
          <div className="category-detail__grid">
            {recipes.map(r => (
              <RecipeCard key={r.id} recipe={r} />
            ))}
          </div>

          {/* 加载更多按钮 */}
          {recipes.length < total && (
            <div className="category-detail__load-more">
              <button
                className="category-detail__load-btn"
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? '加载中...' : `加载更多（${recipes.length}/${total}）`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}