import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDrafts, saveDraft, updateDraft, deleteDraft, publishDraft, Draft } from '../api'
import { useToast } from '../context/ToastContext'
import Pagination from '../components/Pagination'
import './DraftsPage.css'
import PageSkeleton from '../components/PageSkeleton'

export default function DraftsPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [publishing, setPublishing] = useState<string | null>(null)
  const pageSize = 20

  const loadDrafts = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getDrafts({ page, pageSize, status: statusFilter || undefined })
      setDrafts(data.drafts)
      setTotal(data.total)
    } catch (err) {
      showToast('加载草稿失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, showToast])

  useEffect(() => { loadDrafts() }, [loadDrafts])

  async function handleDelete(id: string) {
    if (!confirm('确定删除此草稿？')) return
    try {
      await deleteDraft(id)
      showToast('草稿已删除', 'success')
      loadDrafts()
    } catch {
      showToast('删除失败', 'error')
    }
  }

  async function handlePublish(id: string) {
    try {
      setPublishing(id)
      const result = await publishDraft(id)
      showToast('食谱已发布！', 'success')
      navigate('/recipe/' + result.recipe.id)
    } catch {
      showToast('发布失败，请检查标题等必填字段', 'error')
    } finally {
      setPublishing(null)
    }
  }

  function getStatusText(status: string) {
    switch (status) {
      case 'draft': return '草稿'
      case 'scheduled': return '定时发布'
      case 'published': return '已发布'
      default: return status
    }
  }

  function getStatusClass(status: string) {
    return 'draft-status-' + status
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="drafts-page">
      <div className="drafts-container">
        <div className="drafts-header">
          <h1>我的草稿</h1>
          <button className="drafts-new-btn" onClick={() => navigate('/recipe/new')}>
            + 新建食谱
          </button>
        </div>

        <div className="drafts-filters">
          {['', 'draft', 'scheduled', 'published'].map(s => (
            <button
              key={s}
              className={`drafts-filter-btn ${statusFilter === s ? 'active' : ''}`}
              onClick={() => { setStatusFilter(s); setPage(1) }}
            >
              {s === '' ? '全部' : getStatusText(s)}
            </button>
          ))}
        </div>

        {loading ? (
          <PageSkeleton type="list" />
        ) : drafts.length === 0 ? (
          <div className="drafts-empty">
            <p>暂无草稿</p>
            <button className="drafts-new-btn" onClick={() => navigate('/recipe/new')}>开始创作</button>
          </div>
        ) : (
          <div className="drafts-list">
            {drafts.map(draft => (
              <div key={draft.id} className={`draft-card ${getStatusClass(draft.status)}`}>
                <div className="draft-card-main">
                  <div className="draft-card-info">
                    <h3>{draft.title || '(无标题)'}</h3>
                    <p className="draft-card-meta">
                      <span className={`draft-badge ${getStatusClass(draft.status)}`}>
                        {getStatusText(draft.status)}
                      </span>
                      <span>{draft.category || '未分类'}</span>
                      <span>更新于 {new Date(draft.updatedAt).toLocaleDateString('zh-CN')}</span>
                    </p>
                    {draft.description && (
                      <p className="draft-card-desc">{draft.description.slice(0, 100)}</p>
                    )}
                  </div>
                  <div className="draft-card-actions">
                    {draft.status !== 'published' && (
                      <>
                        <button
                          className="draft-action-btn publish-btn"
                          onClick={() => handlePublish(draft.id)}
                          disabled={publishing === draft.id}
                        >
                          {publishing === draft.id ? '发布中...' : '发布'}
                        </button>
                        <button
                          className="draft-action-btn edit-btn"
                          onClick={() => navigate('/recipe/new?draft=' + draft.id)}
                        >
                          编辑
                        </button>
                      </>
                    )}
                    <button
                      className="draft-action-btn delete-btn"
                      onClick={() => handleDelete(draft.id)}
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Pagination current={page} total={totalPages} onChange={(p) => setPage(p)} />
      </div>
    </div>
  )
}