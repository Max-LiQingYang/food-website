import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getCollection,
  updateCollection,
  removeRecipeFromCollection,
  type CollectionDetail,
  type Recipe,
} from '../api'
import { useToast } from '../context/ToastContext'
import EmptyState from '../components/EmptyState'
import './CollectionsDetailPage.css'

export default function CollectionsDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const [collection, setCollection] = useState<CollectionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [showEdit, setShowEdit] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchDetail = async () => {
    if (!id) return
    setLoading(true)
    try {
      const res: any = await getCollection(id)
      const data = res.data ?? res
      setCollection(data as CollectionDetail)
      setEditName(data.name ?? '')
      setEditDesc(data.description ?? '')
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleRemoveRecipe = async (recipeId: string) => {
    if (!id || removingId) return
    if (!window.confirm('确定从收藏夹中移除这个食谱吗？')) return

    setRemovingId(recipeId)
    try {
      await removeRecipeFromCollection(id, recipeId)
      toast.success('已从收藏夹移除')
      setCollection(prev => {
        if (!prev) return prev
        return {
          ...prev,
          recipes: prev.recipes.filter(r => r.id !== recipeId),
          recipeCount: prev.recipeCount - 1,
        }
      })
    } catch (err: any) {
      toast.error(err?.message || '移除失败')
    } finally {
      setRemovingId(null)
    }
  }

  const handleSaveEdit = async () => {
    if (!id || !editName.trim()) {
      toast.warning('名称不能为空')
      return
    }
    setSaving(true)
    try {
      await updateCollection(id, { name: editName.trim(), description: editDesc.trim() || undefined })
      toast.success('已保存')
      setCollection(prev => prev ? { ...prev, name: editName.trim(), description: editDesc.trim() || undefined } : prev)
      setShowEdit(false)
    } catch (err: any) {
      toast.error(err?.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="coll-detail-page">
        <div className="coll-detail-page__skeleton">
          <div className="skeleton-box" style={{ height: 28, width: '40%' }} />
          <div className="skeleton-box" style={{ height: 16, width: '25%', marginTop: 8 }} />
          <div className="coll-detail-page__grid">
            {[1, 2, 3].map(n => (
              <div key={n} className="recipe-card recipe-card--skeleton">
                <div className="recipe-card__cover skeleton-box" style={{ height: 140 }} />
                <div className="recipe-card__info">
                  <div className="skeleton-box" style={{ height: 18, width: '70%' }} />
                  <div className="skeleton-box" style={{ height: 14, width: '50%', marginTop: 6 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── 404 ──
  if (notFound) {
    return (
      <div className="coll-detail-page">
        <div className="detail-notfound">
          <div className="detail-notfound__icon">📁</div>
          <h2>收藏夹不存在</h2>
          <p>该收藏夹可能已被删除</p>
          <button className="btn btn--primary" onClick={() => navigate('/collections')}>
            返回收藏夹
          </button>
        </div>
      </div>
    )
  }

  if (!collection) return null

  // ── Detail ──
  return (
    <div className="coll-detail-page">
      <button className="coll-detail-page__back" onClick={() => navigate('/collections')}>
        ← 返回收藏夹列表
      </button>

      <div className="coll-detail-page__header">
        <div className="coll-detail-page__info">
          <h1 className="coll-detail-page__title">📁 {collection.name}</h1>
          {collection.description && (
            <p className="coll-detail-page__desc">{collection.description}</p>
          )}
          <p className="coll-detail-page__count">
            {collection.recipes?.length ?? 0} 个食谱
          </p>
        </div>
        <button
          className="coll-detail-page__edit-btn"
          onClick={() => setShowEdit(true)}
        >
          ✏️ 编辑
        </button>
      </div>

      {(!collection.recipes || collection.recipes.length === 0) ? (
        <EmptyState
          icon="🍽️"
          title="收藏夹中还没有食谱"
          description="去逛逛发现喜欢的菜品吧~"
          ctaText="去探索"
          ctaLink="/"
          variant="default"
        />
      ) : (
        <div className="coll-detail-page__grid">
          {collection.recipes.map((recipe: Recipe) => (
            <div
              key={recipe.id}
              className="recipe-card"
              onClick={() => navigate(`/recipe/${recipe.id}`)}
            >
              <div className="recipe-card__cover">
                {recipe.coverImage ? (
                  <img src={recipe.coverImage} alt={recipe.title} loading="lazy" />
                ) : (
                  <div className="recipe-card__cover-placeholder">🍽️</div>
                )}
              </div>
              <div className="recipe-card__info">
                <h3 className="recipe-card__title">{recipe.title}</h3>
                <p className="recipe-card__author">👨‍🍳 {recipe.author || '未知作者'}</p>
                {recipe.category && (
                  <span className="recipe-card__category">{recipe.category}</span>
                )}
              </div>
              <button
                className="recipe-card__remove-btn"
                disabled={removingId === recipe.id}
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemoveRecipe(recipe.id)
                }}
                title="从收藏夹移除"
              >
                {removingId === recipe.id ? '⏳' : '✕'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <div className="collection-modal__backdrop" onClick={() => setShowEdit(false)}>
          <div className="collection-modal" onClick={e => e.stopPropagation()}>
            <button
              className="collection-modal__close"
              onClick={() => setShowEdit(false)}
              aria-label="关闭"
            >
              ×
            </button>
            <h3 className="collection-modal__title">编辑收藏夹</h3>
            <label className="collection-modal__label">名称</label>
            <input
              className="collection-modal__input"
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              maxLength={50}
              placeholder="收藏夹名称"
            />
            <label className="collection-modal__label">描述</label>
            <input
              className="collection-modal__input"
              type="text"
              value={editDesc}
              onChange={e => setEditDesc(e.target.value)}
              maxLength={200}
              placeholder="描述（选填）"
            />
            <div className="collection-modal__actions">
              <button
                type="button"
                className="collection-modal__btn collection-modal__btn--cancel"
                onClick={() => setShowEdit(false)}
              >
                取消
              </button>
              <button
                type="button"
                className="collection-modal__btn collection-modal__btn--submit"
                onClick={handleSaveEdit}
                disabled={saving || !editName.trim()}
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}