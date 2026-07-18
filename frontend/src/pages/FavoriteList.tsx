import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFavoriteList, removeFavorite, getMealPlans } from '../api'
import EmptyState from '../components/EmptyState'
import Pagination from '../components/Pagination'
import FavoriteNoteModal from '../components/FavoriteNoteModal'
import './FavoriteList.css'
import PageSkeleton from '../components/PageSkeleton'
import { getMotionSafeScrollBehavior } from '../context/MotionPreferenceContext'
import { useCrossFlowToast } from '../components/CrossFlowToast'

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
  note: string | null
  createdAt: string
  recipe?: Recipe | null
  removing?: boolean
}

interface PaginationState {
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
    day: 'numeric',
  })
}

// ── 组件 ──────────────────────────────────────────────────────────────────────

export default function FavoriteList() {
  const navigate = useNavigate()
  const listTopRef = useRef<HTMLDivElement>(null)
  const crossFlowToast = useCrossFlowToast()

  const [loading, setLoading] = useState(false)
  const [list, setList] = useState<FavoriteItem[]>([])
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 12,
    total: 0,
  })
  // AC5: meal plan recipe IDs for cross-reference
  const [mealPlanRecipeIds, setMealPlanRecipeIds] = useState<Set<string>>(new Set())

  // 备注弹窗状态
  const [noteModalVisible, setNoteModalVisible] = useState(false)
  const [noteTargetItem, setNoteTargetItem] = useState<FavoriteItem | null>(null)

  const totalPages = Math.ceil(pagination.total / pagination.pageSize)

  async function fetchList(page = 1) {
    setLoading(true)
    try {
      const res = await getFavoriteList({ page, pageSize: pagination.pageSize })
      setList((res.data.list || []).map((item: FavoriteItem) => ({ ...item, removing: false })))
      setPagination(prev => ({ ...prev, total: res.data.total || 0, page }))
    } catch {
      // 加载失败静默处理
    } finally {
      setLoading(false)
    }
  }

  // AC5: Fetch current week's meal plans and cross-reference with favorites
  async function fetchMealPlanStatus() {
    try {
      const now = new Date()
      const day = now.getDay()
      const diff = now.getDate() - day + (day === 0 ? -6 : 1)
      now.setDate(diff)
      const weekStart = now.toISOString().slice(0, 10)
      const plans = await getMealPlans(weekStart)
      const recipeIds = new Set<string>()
      if (plans && plans.length > 0) {
        for (const plan of plans) {
          if (plan.meals) {
            for (const meal of plan.meals) {
              if (meal.recipeId) recipeIds.add(meal.recipeId)
            }
          }
        }
      }
      setMealPlanRecipeIds(recipeIds)
    } catch {
      // Silent fail - meal plan status is optional enhancement
    }
  }

  useEffect(() => {
    fetchList()
    fetchMealPlanStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function unfavorite(item: FavoriteItem) {
    if (item.removing || !item.recipe) return
    setList(prev => prev.map(i => (i.id === item.id ? { ...i, removing: true } : i)))
    try {
      await removeFavorite(item.recipe.id)
      setList(prev => prev.filter(i => i.id !== item.id))
      setPagination(prev => ({ ...prev, total: prev.total - 1 }))
    } catch {
      setList(prev => prev.map(i => (i.id === item.id ? { ...i, removing: false } : i)))
    }
  }

  function goPage(page: number) {
    fetchList(page)
    setTimeout(() => {
      listTopRef.current?.scrollIntoView({ behavior: getMotionSafeScrollBehavior(), block: 'start' })
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
        <PageSkeleton type="list" />
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
        <EmptyState
          icon="🍳"
          title="还没有收藏任何食谱"
          description="去逛逛发现喜欢的菜品吧~"
          ctaText="去探索"
          ctaLink="/"
          variant="default"
        />
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
                <h3 className="recipe-card__title recipe-card__title--deleted">食谱已不存在</h3>
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
                <span className="recipe-card__cooktime">⏱ {item.recipe.cookTime || '—'} 分钟</span>
              </div>
              <div className="recipe-card__info">
                <h3 className="recipe-card__title">{item.recipe.title}</h3>
                <p className="recipe-card__author">👨🍳 {item.recipe.author || '未知作者'}</p>
                <p className="recipe-card__date">收藏于 {formatDate(item.createdAt)}</p>
                {/* AC5: meal plan status badge */}
                {mealPlanRecipeIds.has(item.recipe.id) && (
                  <span
                    className="recipe-card__meal-plan-badge"
                    aria-label="已加入餐单"
                  >
                    ✓ 已加入餐单
                  </span>
                )}
              </div>
              {/* 备注预览 */}
              {item.note && (
                <div
                  className="note-preview"
                  onClick={e => {
                    e.stopPropagation()
                    setNoteTargetItem(item)
                    setNoteModalVisible(true)
                  }}
                >
                  <span className="note-preview__icon">📝</span>
                  <span className="note-preview__text">{item.note}</span>
                </div>
              )}
              <button
                className="recipe-card__unfav"
                disabled={item.removing}
                aria-label={`取消收藏：${item.recipe.title}`}
                onClick={e => {
                  e.stopPropagation()
                  unfavorite(item)
                }}
              >
                {item.removing ? '⋯' : '❤️'}
              </button>
            </div>
          )
        )}
      </div>

      {/* 分页 */}
      <Pagination current={pagination.page} total={totalPages} onChange={goPage} />

      {/* 翻页加载遮罩 */}
      {loading && list.length > 0 && (
        <div className="favorite-list__overlay">
          <div className="overlay-spinner" />
        </div>
      )}

      {/* 备注编辑弹窗 */}
      {noteTargetItem && (
        <FavoriteNoteModal
          visible={noteModalVisible}
          onClose={() => { setNoteModalVisible(false); setNoteTargetItem(null) }}
          recipeId={noteTargetItem.recipeId}
          initialNote={noteTargetItem.note}
          onSaved={(newNote) => {
            setList(prev => prev.map(i =>
              i.id === noteTargetItem.id ? { ...i, note: newNote } : i
            ))
          }}
        />
      )}
    </div>
  )
}
