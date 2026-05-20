import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFavoriteList, removeFavorite } from '../api'
import './FavoriteList.css'

// ── 类型定义 ──────────────────────────────────────────────────────────────────

interface Recipe {
  id: string
  title: string
  coverImage?: string
  author?: string
  cookTime?: number
}

interface FavoriteItem {
  id: number
  userId: string
  recipeId: string
  createdAt: string
  recipe?: Recipe | null
  removing?: boolean
}

interface Pagination {
  page: number
  pageSize: number
  total: number
}

// ── 工具函数 ──────────────────────────────────────────────────────────────────

function formatDate(isoString?: string): string {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// ── 组件 ──────────────────────────────────────────────────────────────────────

export default function FavoriteList() {
  const navigate = useNavigate()
  const listTopRef = useRef<HTMLDivElement>(null)

  const [loading, setLoading] = useState(false)
  const [list, setList] = useState<FavoriteItem[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 12,
    total: 0
  })

  const totalPages = Math.ceil(pagination.total / pagination.pageSize)

  async function fetchList(page = 1) {
    setLoading(true)
    try {
      const res = await getFavoriteList({ page, pageSize: pagination.pageSize })
      setList(
        (res.data.list || []).map((item: FavoriteItem) => ({ ...item, removing: false }))
      )
      setPagination(prev => ({ ...prev, total: res.data.total || 0, page }))
    } catch {
      // 加载失败静默处理
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchList()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function unfavorite(item: FavoriteItem) {
    if (item.removing || !item.recipe) return
    setList(prev =>
      prev.map(i => (i.id === item.id ? { ...i, removing: true } : i))
    )
    try {
      await removeFavorite(item.recipe.id)
      setList(prev => prev.filter(i => i.id !== item.id))
      setPagination(prev => ({ ...prev, total: prev.total - 1 }))
    } catch {
      setList(prev =>
        prev.map(i => (i.id === item.id ? { ...i, removing: false } : i))
      )
    }
  }

  function goPage(page: number) {
    fetchList(page)
    setTimeout(() => {
      listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
  }

  // ── 骨架屏 ──────────────────────────────────────────────────────────────────

  if (loading && list.length === 0) {
    return (
      <div className="favorite-list" ref={listTopRef}>
        <div className="favorite-list__header">
          <h2 className="favorite-list__title">我的收藏</h2>
          <span className="favorite-list__count">加载中…</span>
        </div>
        <div className="favorite-list__grid">
          {Array.from({ length: 6 }).map((_, n) => (
            <div key={n} className="recipe-card recipe-card--skeleton">
              <div className="recipe-card__cover skeleton-box" />
              <div className="recipe-card__info">
                <div className="skeleton-box skeleton-box--title" />
                <div className="skeleton-box skeleton-box--meta" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── 空状态 ──────────────────────────────────────────────────────────────────

  if (!loading && list.length === 0) {
    return (
      <div className="favorite-list" ref={listTopRef}>
        <div className="favorite-list__header">
          <h2 className="favorite-list__title">我的收藏</h2>
          <span className="favorite-list__count">共 0 个食谱</span>
        </div>
        <div className="favorite-list__empty">
          <div className="empty-icon">🍳</div>
          <p className="empty-text">还没有收藏任何食谱</p>
          <p className="empty-hint">去逛逛发现喜欢的菜品吧~</p>
          <button className="btn btn--primary" onClick={() => navigate('/')}>
            去探索
          </button>
        </div>
      </div>
    )
  }

  // ── 列表 ─────────────────────────────────────────────────────────────────────

  return (
    <div className="favorite-list" style={{ position: 'relative' }}>
      <div className="favorite-list__header" ref={listTopRef}>
        <h2 className="favorite-list__title">我的收藏</h2>
        <span className="favorite-list__count">共 {pagination.total} 个食谱</span>
      </div>

      <div className="favorite-list__grid">
        {list.map(item =>
          !item.recipe ? (
            <div key={item.id} className="recipe-card">
              <div className="recipe-card__cover recipe-card__cover--deleted">
                <div className="recipe-card__deleted-icon">🍽️</div>
                <span className="recipe-card__deleted-badge">已删除</span>
              </div>
              <div className="recipe-card__info">
                <h3 className="recipe-card__title recipe-card__title--deleted">
                  食谱已不存在
                </h3>
                <p className="recipe-card__author">该食谱已被作者删除</p>
                <p className="recipe-card__date">收藏于 {formatDate(item.createdAt)}</p>
              </div>
            </div>
          ) : (
            <div
              key={item.id}
              className="recipe-card"
              onClick={() => navigate(`/recipe/${item.recipe!.id}`)}
            >
              <div className="recipe-card__cover">
                <img
                  src={item.recipe.coverImage || '/images/default-recipe.jpg'}
                  alt={item.recipe.title}
                  loading="lazy"
                />
                <span className="recipe-card__cooktime">
                  ⏱ {item.recipe.cookTime || '—'} 分钟
                </span>
              </div>
              <div className="recipe-card__info">
                <h3 className="recipe-card__title">{item.recipe.title}</h3>
                <p className="recipe-card__author">
                  👨🍳 {item.recipe.author || '未知作者'}
                </p>
                <p className="recipe-card__date">
                  收藏于 {formatDate(item.createdAt)}
                </p>
              </div>
              <button
                className="recipe-card__unfav"
                disabled={item.removing}
                aria-label={`取消收藏：${item.recipe.title}`}
                onClick={e => { e.stopPropagation(); unfavorite(item) }}
              >
                {item.removing ? '⋯' : '❤️'}
              </button>
            </div>
          )
        )}
      </div>

      {/* 分页 */}
      {pagination.total > pagination.pageSize && (
        <div className="favorite-list__pagination">
          <button
            className="pagination-btn"
            disabled={pagination.page <= 1 || loading}
            onClick={() => goPage(pagination.page - 1)}
          >
            ← 上一页
          </button>
          <span className="pagination-info">
            第 {pagination.page} / {totalPages} 页
          </span>
          <button
            className="pagination-btn"
            disabled={pagination.page >= totalPages || loading}
            onClick={() => goPage(pagination.page + 1)}
          >
            下一页 →
          </button>
        </div>
      )}

      {/* 翻页加载遮罩 */}
      {loading && list.length > 0 && (
        <div className="favorite-list__overlay">
          <div className="overlay-spinner" />
        </div>
      )}
    </div>
  )
}
