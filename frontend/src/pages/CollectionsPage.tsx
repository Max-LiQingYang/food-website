import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  type Collection,
} from '../api'
import { useToast } from '../context/ToastContext'
import EmptyState from '../components/EmptyState'
import './CollectionsPage.css'

export default function CollectionsPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  const fetchCollections = useCallback(async () => {
    setLoading(true)
    try {
      const res: any = await getCollections()
      setCollections(res.data?.list ?? res.list ?? [])
    } catch {
      toast.error('加载收藏夹失败')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchCollections()
  }, [fetchCollections])

  // Focus name input when modal opens
  useEffect(() => {
    if (showModal && nameRef.current) {
      nameRef.current.focus()
    }
  }, [showModal])

  const openCreate = () => {
    setEditingId(null)
    setFormName('')
    setFormDesc('')
    setShowModal(true)
  }

  const openEdit = (col: Collection) => {
    setEditingId(col.id)
    setFormName(col.name)
    setFormDesc(col.description ?? '')
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) {
      toast.warning('请输入收藏夹名称')
      return
    }

    setSubmitting(true)
    try {
      if (editingId) {
        await updateCollection(editingId, { name: formName.trim(), description: formDesc.trim() || undefined })
        toast.success('收藏夹已更新')
      } else {
        await createCollection({ name: formName.trim(), description: formDesc.trim() || undefined })
        toast.success('收藏夹已创建')
      }
      setShowModal(false)
      fetchCollections()
    } catch (err: any) {
      toast.error(err?.message || '操作失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这个收藏夹吗？')) return
    setDeletingId(id)
    try {
      await deleteCollection(id)
      toast.success('收藏夹已删除')
      setCollections(prev => prev.filter(c => c.id !== id))
    } catch (err: any) {
      toast.error(err?.message || '删除失败')
    } finally {
      setDeletingId(null)
    }
  }

  // ── Skeleton ──
  if (loading && collections.length === 0) {
    return (
      <div className="collections-page">
        <div className="collections-page__header">
          <h1 className="collections-page__title">我的收藏夹</h1>
        </div>
        <div className="collections-page__grid">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="collection-card collection-card--skeleton">
              <div className="skeleton-box" style={{ height: 20, width: '60%' }} />
              <div className="skeleton-box" style={{ height: 14, width: '80%', marginTop: 8 }} />
              <div className="skeleton-box" style={{ height: 14, width: '40%', marginTop: 6 }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Empty ──
  if (!loading && collections.length === 0) {
    return (
      <div className="collections-page">
        <div className="collections-page__header">
          <h1 className="collections-page__title">我的收藏夹</h1>
        </div>
        <EmptyState
          icon="📁"
          title="还没有收藏夹"
          description="创建收藏夹来整理你喜欢的食谱吧~"
          ctaText="+ 创建收藏夹"
          ctaOnClick={openCreate}
          variant="default"
        />

        {showModal && (
          <div className="collection-modal__backdrop" onClick={() => setShowModal(false)}>
            <div className="collection-modal" onClick={e => e.stopPropagation()}>
              <h3 className="collection-modal__title">
                {editingId ? '编辑收藏夹' : '创建收藏夹'}
              </h3>
              <form onSubmit={handleSubmit}>
                <input
                  ref={nameRef}
                  className="collection-modal__input"
                  type="text"
                  placeholder="收藏夹名称"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  maxLength={50}
                />
                <input
                  className="collection-modal__input"
                  type="text"
                  placeholder="描述（选填）"
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  maxLength={200}
                />
                <div className="collection-modal__actions">
                  <button
                    type="button"
                    className="collection-modal__btn collection-modal__btn--cancel"
                    onClick={() => setShowModal(false)}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="collection-modal__btn collection-modal__btn--submit"
                    disabled={submitting || !formName.trim()}
                  >
                    {submitting ? '保存中...' : editingId ? '保存' : '创建'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── List ──
  return (
    <div className="collections-page">
      <div className="collections-page__header">
        <h1 className="collections-page__title">我的收藏夹</h1>
        <button className="btn btn--primary" onClick={openCreate}>
          + 创建收藏夹
        </button>
      </div>

      <div className="collections-page__grid">
        {collections.map(col => (
          <div
            key={col.id}
            className="collection-card"
            onClick={() => navigate(`/collections/${col.id}`)}
          >
            <div className="collection-card__icon">📁</div>
            <h3 className="collection-card__name">{col.name}</h3>
            {col.description && (
              <p className="collection-card__desc">{col.description}</p>
            )}
            <p className="collection-card__count">
              {col.recipeCount ?? 0} 个食谱
            </p>

            <div className="collection-card__actions" onClick={e => e.stopPropagation()}>
              <button
                className="collection-card__edit-btn"
                onClick={() => openEdit(col)}
                title="编辑"
              >
                ✏️
              </button>
              <button
                className="collection-card__del-btn"
                onClick={() => handleDelete(col.id)}
                disabled={deletingId === col.id}
                title="删除"
              >
                {deletingId === col.id ? '⏳' : '🗑️'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="collection-modal__backdrop" onClick={() => setShowModal(false)}>
          <div className="collection-modal" onClick={e => e.stopPropagation()}>
            <button
              className="collection-modal__close"
              onClick={() => setShowModal(false)}
              aria-label="关闭"
            >
              ×
            </button>
            <h3 className="collection-modal__title">
              {editingId ? '编辑收藏夹' : '创建收藏夹'}
            </h3>
            <form onSubmit={handleSubmit}>
              <label className="collection-modal__label">名称</label>
              <input
                ref={nameRef}
                className="collection-modal__input"
                type="text"
                placeholder="收藏夹名称"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                maxLength={50}
                required
              />
              <label className="collection-modal__label">描述</label>
              <input
                className="collection-modal__input"
                type="text"
                placeholder="描述（选填）"
                value={formDesc}
                onChange={e => setFormDesc(e.target.value)}
                maxLength={200}
              />
              <div className="collection-modal__actions">
                <button
                  type="button"
                  className="collection-modal__btn collection-modal__btn--cancel"
                  onClick={() => setShowModal(false)}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="collection-modal__btn collection-modal__btn--submit"
                  disabled={submitting || !formName.trim()}
                >
                  {submitting ? '保存中...' : editingId ? '保存' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}