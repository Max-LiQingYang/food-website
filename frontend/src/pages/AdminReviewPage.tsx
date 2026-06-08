import { useState, useEffect } from 'react'
import { getReviewQueue, submitReviewBatch, getReviewHistory, ReviewQueueItem } from '../api'
import { useToast } from '../context/ToastContext'
import './AdminReviewPage.css'
import PageSkeleton from '../components/PageSkeleton'

export default function AdminReviewPage() {
  const { showToast } = useToast()
  const [queue, setQueue] = useState<ReviewQueueItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'queue' | 'history'>('queue')
  const [history, setHistory] = useState<{ items: any[]; total: number }>({ items: [], total: 0 })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (tab === 'queue') {
      setLoading(true)
      getReviewQueue()
        .then(setQueue)
        .catch(() => showToast('加载审核队列失败', 'error'))
        .finally(() => setLoading(false))
    } else {
      setLoading(true)
      getReviewHistory()
        .then(data => setHistory({ items: data.items, total: data.total }))
        .catch(() => showToast('加载审核历史失败', 'error'))
        .finally(() => setLoading(false))
    }
  }, [tab, showToast])

  function toggleSelect(type: string, id: string) {
    const key = type + ':' + id
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function selectAll(type: string, ids: string[]) {
    const keys = ids.map(id => type + ':' + id)
    const allSelected = keys.every(k => selected.has(k))
    setSelected(prev => {
      const next = new Set(prev)
      if (allSelected) keys.forEach(k => next.delete(k))
      else keys.forEach(k => next.add(k))
      return next
    })
  }

  async function handleBatchReview(action: string) {
    if (selected.size === 0) {
      showToast('请先选择要审核的项目', 'warning')
      return
    }
    try {
      setProcessing(true)
      const items = Array.from(selected).map(key => {
        const [type, id] = key.split(':')
        return { type, id, action }
      })
      const result = await submitReviewBatch(items)
      showToast(`审核完成: ${result.results.length} 项`, 'success')
      setSelected(new Set())
      // Reload
      const fresh = await getReviewQueue()
      setQueue(fresh)
    } catch {
      showToast('批量审核失败', 'error')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) return (
    <div className="admin-review-page">
      <PageSkeleton type="profile" />
    </div>
  )

  return (
    <div className="admin-review-page">
      <div className="review-container">
        <h1>内容审核面板</h1>

        <div className="review-tabs">
          <button className={`review-tab ${tab === 'queue' ? 'active' : ''}`} onClick={() => setTab('queue')}>
            审核队列 {queue ? `(${queue.recipes.total + queue.comments.total})` : ''}
          </button>
          <button className={`review-tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
            审核历史 ({history.total})
          </button>
        </div>

        {tab === 'queue' && queue && (
          <>
            {/* Action bar */}
            {selected.size > 0 && (
              <div className="review-actions">
                <span>已选 {selected.size} 项</span>
                <button className="review-action-btn approve-btn" onClick={() => handleBatchReview('approved')} disabled={processing}>
                  ✅ 通过
                </button>
                <button className="review-action-btn reject-btn" onClick={() => handleBatchReview('rejected')} disabled={processing}>
                  ❌ 拒绝
                </button>
                <button className="review-action-btn flag-btn" onClick={() => handleBatchReview('flagged')} disabled={processing}>
                  ⚠️ 标记
                </button>
              </div>
            )}

            {/* Recipes */}
            <div className="review-section">
              <h2>食谱审核 <span className="review-count">{queue.recipes.total}</span></h2>
              {queue.recipes.items.length === 0 ? (
                <p className="review-empty">暂无待审核食谱</p>
              ) : (
                <>
                  <div className="review-select-all">
                    <label>
                      <input type="checkbox" checked={queue.recipes.items.every(r => selected.has('recipe:' + r.id))} onChange={() => selectAll('recipe', queue.recipes.items.map(r => r.id))} />
                      全选食谱
                    </label>
                  </div>
                  {queue.recipes.items.map(r => (
                    <div key={r.id} className="review-item recipe-item">
                      <input type="checkbox" checked={selected.has('recipe:' + r.id)} onChange={() => toggleSelect('recipe', r.id)} />
                      <div className="review-item-info">
                        <strong>{r.title}</strong>
                        <div className="review-item-meta">
                          <span>分类: {r.category || '未分类'}</span>
                          <span>质量: {r.qualityScore ?? 'N/A'}</span>
                          <span>浏览: {r.viewCount || 0}</span>
                          <span>收藏: {r.favoriteCount || 0}</span>
                        </div>
                      </div>
                      <span className="review-item-date">{new Date(r.createdAt).toLocaleDateString('zh-CN')}</span>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Comments */}
            <div className="review-section">
              <h2>评论审核 <span className="review-count">{queue.comments.total}</span></h2>
              {queue.comments.items.length === 0 ? (
                <p className="review-empty">暂无待审核评论</p>
              ) : (
                <>
                  <div className="review-select-all">
                    <label>
                      <input type="checkbox" checked={queue.comments.items.every(c => selected.has('comment:' + c.id))} onChange={() => selectAll('comment', queue.comments.items.map(c => c.id))} />
                      全选评论
                    </label>
                  </div>
                  {queue.comments.items.map(c => (
                    <div key={c.id} className="review-item comment-item">
                      <input type="checkbox" checked={selected.has('comment:' + c.id)} onChange={() => toggleSelect('comment', c.id)} />
                      <div className="review-item-info">
                        <p className="review-comment-text">{c.content}</p>
                        <div className="review-item-meta">
                          <span>用户: {c.user?.username || c.userId}</span>
                          <span>评分: {c.rating ? '★'.repeat(c.rating) : '无'}</span>
                          <span>❤️ {c.likesCount || 0}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </>
        )}

        {tab === 'history' && (
          <div className="review-section">
            <h2>审核记录</h2>
            {history.items.length === 0 ? (
              <p className="review-empty">暂无审核记录</p>
            ) : (
              history.items.map((h, i) => (
                <div key={h.id || i} className="history-item">
                  <div className="history-badge" data-action={h.action}>
                    {h.action === 'approved' ? '✅' : h.action === 'rejected' ? '❌' : '⚠️'}
                  </div>
                  <div className="history-info">
                    <span className="history-type">{h.reviewableType === 'recipe' ? '食谱' : '评论'}</span>
                    <span>ID: {h.reviewableId?.slice(0, 8)}...</span>
                    {h.reason && <span className="history-reason">{h.reason}</span>}
                  </div>
                  <span className="history-date">{new Date(h.createdAt).toLocaleString('zh-CN')}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}