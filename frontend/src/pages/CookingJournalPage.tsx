import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getCookingLogs, createCookingLog, updateCookingLog, deleteCookingLog, getCookingLogStats } from '../api'
import { getRecipeById } from '../api'
import { useAuth } from '../context/AuthContext'
import { getEnhancedCookingStats, searchCookingLogs, getCookingLogDetail } from '../api'
import { useToast } from '../context/ToastContext'
import Pagination from '../components/Pagination'
import type { CookingLog, CookingLogStats } from '../api'
import './CookingJournalPage.css'

export default function CookingJournalPage() {
  const { isAuthenticated } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [logs, setLogs] = useState<CookingLog[]>([])
  const [stats, setStats] = useState<CookingLogStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 20

  // 添加/编辑弹窗
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    recipeId: '',
    recipeIdInput: '',
    rating: 5,
    notes: '',
    duration: '',
    cookedAt: new Date().toISOString().slice(0, 10),
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [recipeTitle, setRecipeTitle] = useState('')

  // 统计视图切换
  const [view, setView] = useState<'list' | 'stats'>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchDateStart, setSearchDateStart] = useState('')
  const [searchDateEnd, setSearchDateEnd] = useState('')
  const [searchMinRating, setSearchMinRating] = useState(0)
  const [showSearch, setShowSearch] = useState(false)
  const [enhancedStats, setEnhancedStats] = useState<any>(null)

  // 自动加载 stats
  useEffect(() => {
    loadStats()
  }, [])

  const loadLogs = useCallback(async (p: number, search?: any) => {
    setLoading(true)
    try {
      const params: any = { page: p, pageSize }
      if (search?.q) params.q = search.q
      if (search?.startDate) params.startDate = search.startDate
      if (search?.endDate) params.endDate = search.endDate
      if (search?.minRating) params.minRating = search.minRating

      if (search?.q || search?.startDate || search?.endDate || search?.minRating) {
        const res = await searchCookingLogs(params)
        setLogs(res.logs || [])
        setTotal(res.total || 0)
        setPage(res.page || 1)
      } else {
        const res = await getCookingLogs({ page: p, pageSize })
        setLogs(res.list || [])
        setTotal(res.total || 0)
        setPage(res.page || 1)
      }
    } catch {
      showToast('加载烹饪日志失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  const loadStats = async () => {
    try {
      const s = await getCookingLogStats()
      setStats(s)
    } catch { /* silent */ }
    try {
      const es = await getEnhancedCookingStats()
      setEnhancedStats(es)
    } catch { /* silent */ }
  }

  useEffect(() => {
    const hasSearch = searchQuery || searchDateStart || searchDateEnd || searchMinRating
    loadLogs(page, hasSearch ? { q: searchQuery, startDate: searchDateStart, endDate: searchDateEnd, minRating: searchMinRating } : undefined)
  }, [page, loadLogs, searchQuery, searchDateStart, searchDateEnd, searchMinRating])

  // 获取食谱标题
  const fetchRecipeTitle = async (id: string) => {
    if (!id.trim()) {
      setRecipeTitle('')
      return
    }
    try {
      const recipe = await getRecipeById(id.trim())
      setRecipeTitle(recipe.title || '')
      setFormData(prev => ({ ...prev, recipeId: id.trim() }))
    } catch {
      setRecipeTitle('未找到食谱')
    }
  }

  // 打开添加表单
  const openAddForm = () => {
    setEditingId(null)
    setFormData({
      recipeId: '',
      recipeIdInput: '',
      rating: 5,
      notes: '',
      duration: '',
      cookedAt: new Date().toISOString().slice(0, 10),
    })
    setRecipeTitle('')
    setShowForm(true)
  }

  // 打开编辑表单
  const openEditForm = (log: CookingLog) => {
    setEditingId(log.id)
    setFormData({
      recipeId: log.recipeId,
      recipeIdInput: log.recipeId,
      rating: log.rating,
      notes: log.notes || '',
      duration: log.duration?.toString() || '',
      cookedAt: log.cookedAt,
    })
    setRecipeTitle(log.recipeTitle)
    setShowForm(true)
  }

  // 提交表单
  const handleSubmit = async () => {
    if (!formData.recipeId.trim()) {
      showToast('请输入食谱 ID', 'warning')
      return
    }
    try {
      const data = {
        recipeId: formData.recipeId.trim(),
        rating: formData.rating,
        notes: formData.notes || undefined,
        duration: formData.duration ? parseInt(formData.duration, 10) : undefined,
        cookedAt: formData.cookedAt || undefined,
      }
      if (editingId) {
        await updateCookingLog(editingId, data)
        showToast('日志已更新', 'success')
      } else {
        await createCookingLog(data)
        showToast('日志已记录', 'success')
      }
      setShowForm(false)
      loadLogs(page)
      loadStats()
    } catch (err: any) {
      showToast(err?.response?.data?.message || '保存失败', 'error')
    }
  }

  // 删除日志
  const handleDelete = async (id: string) => {
    if (!confirm('确定删除这条烹饪记录？')) return
    try {
      await deleteCookingLog(id)
      showToast('已删除', 'success')
      loadLogs(page)
      loadStats()
    } catch {
      showToast('删除失败', 'error')
    }
  }

  // 星星评分
  const renderStars = (rating: number) => {
    return '⭐'.repeat(rating) + '☆'.repeat(5 - rating)
  }

  if (!isAuthenticated) {
    navigate('/login')
    return null
  }

  return (
    <div className="cooking-journal">
      <div className="cooking-journal__header">
        <h1 className="cooking-journal__title">📖 烹饪日志</h1>
        <div className="cooking-journal__header-actions">
          <button
            className={`cooking-journal__search-btn ${showSearch ? 'active' : ''}`}
            onClick={() => setShowSearch(!showSearch)}
            title="搜索和筛选"
          >
            🔍
          </button>
          <div className="cooking-journal__view-toggle">
            <button
              className={`cooking-journal__view-btn ${view === 'list' ? 'active' : ''}`}
              onClick={() => setView('list')}
            >
              📋 记录
            </button>
            <button
              className={`cooking-journal__view-btn ${view === 'stats' ? 'active' : ''}`}
              onClick={() => setView('stats')}
            >
              📊 统计
            </button>
          </div>
          <button className="cooking-journal__add-btn" onClick={openAddForm}>
            + 记录烹饪
          </button>
        </div>
      </div>

      {/* 搜索面板 */}
      {showSearch && (
        <div className="cooking-journal__search-panel fade-in" style={{ marginBottom: 16 }}>
          <div className="cooking-journal__search-row">
            <input
              type="text"
              className="cooking-journal__search-input"
              placeholder="搜索食谱名称..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1) }}
            />
            <input
              type="date"
              className="cooking-journal__search-date"
              value={searchDateStart}
              onChange={e => { setSearchDateStart(e.target.value); setPage(1) }}
              title="开始日期"
            />
            <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>至</span>
            <input
              type="date"
              className="cooking-journal__search-date"
              value={searchDateEnd}
              onChange={e => { setSearchDateEnd(e.target.value); setPage(1) }}
              title="结束日期"
            />
          </div>
          <div className="cooking-journal__search-row" style={{ marginTop: 8 }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>最低评分：</label>
            <div className="cooking-journal__rating-select-sm">
              {[0, 1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  className={`cooking-journal__rating-star-sm ${searchMinRating === n ? 'active' : ''}`}
                  onClick={() => setSearchMinRating(n)}
                >
                  {n === 0 ? '全部' : n + '⭐'}
                </button>
              ))}
            </div>
            {(searchQuery || searchDateStart || searchDateEnd || searchMinRating > 0) && (
              <button
                className="cooking-journal__search-clear"
                onClick={() => {
                  setSearchQuery('')
                  setSearchDateStart('')
                  setSearchDateEnd('')
                  setSearchMinRating(0)
                  setPage(1)
                }}
              >
                清除筛选
              </button>
            )}
          </div>
        </div>
      )}

      {/* 统计视图 */}
      {view === 'stats' && (
        <div className="cooking-journal__stats">
          <div className="cooking-journal__stats-grid">
            <div className="cooking-journal__stat-card">
              <span className="cooking-journal__stat-number">{stats?.totalCooked || enhancedStats?.achievement?.totalCooking || 0}</span>
              <span className="cooking-journal__stat-label">总烹饪次数</span>
            </div>
            <div className="cooking-journal__stat-card">
              <span className="cooking-journal__stat-number">{stats?.thisMonthCount || 0}</span>
              <span className="cooking-journal__stat-label">本月烹饪</span>
            </div>
            <div className="cooking-journal__stat-card">
              <span className="cooking-journal__stat-number">{stats?.averageRating || 0}</span>
              <span className="cooking-journal__stat-label">平均评分</span>
            </div>
            <div className="cooking-journal__stat-card">
              <span className="cooking-journal__stat-number">{enhancedStats?.weeklyCount || 0}</span>
              <span className="cooking-journal__stat-label">本周烹饪</span>
            </div>
          </div>
          {enhancedStats?.achievement && (
            <div className="cooking-journal__stats-grid" style={{ marginTop: 8 }}>
              <div className="cooking-journal__stat-card cooking-journal__stat-card--small">
                <span className="cooking-journal__stat-number">{enhancedStats.achievement.totalRecipesCooked}</span>
                <span className="cooking-journal__stat-label">已做食谱</span>
              </div>
              <div className="cooking-journal__stat-card cooking-journal__stat-card--small">
                <span className="cooking-journal__stat-number">{enhancedStats.achievement.totalRatings}</span>
                <span className="cooking-journal__stat-label">已评分次数</span>
              </div>
            </div>
          )}
          {enhancedStats?.dailyTrend && enhancedStats.dailyTrend.length > 0 && (
            <div className="cooking-journal__chart">
              <h3 className="cooking-journal__chart-title">近30天趋势</h3>
              <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 100, overflowX: 'auto', paddingBottom: 20 }}>
                {enhancedStats.dailyTrend.map((d: any, i: number) => {
                  const maxCount = Math.max(...enhancedStats.dailyTrend.map((x: any) => x.count), 1)
                  const height = (d.count / maxCount) * 80
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 28 }} title={`${d.date}: ${d.count}次`}>
                      <div style={{ height: height, width: 16, background: 'var(--color-primary)', borderRadius: '4px 4px 0 0', opacity: 0.7 + (d.count / maxCount) * 0.3 }} />
                      <span style={{ fontSize: '0.6rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>{d.date.slice(5)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 月度趋势（条形图） */}
          <div className="cooking-journal__chart">
            <h3 className="cooking-journal__chart-title">月度趋势</h3>
            <div className="cooking-journal__chart-bars">
              {stats.byMonth.map((m) => {
                const maxCount = Math.max(...stats.byMonth.map(x => x.count), 1)
                const height = (m.count / maxCount) * 100
                return (
                  <div key={m.month} className="cooking-journal__chart-bar-container">
                    <span className="cooking-journal__chart-value">{m.count}</span>
                    <div
                      className="cooking-journal__chart-bar"
                      style={{ height: `${height}%` }}
                    />
                    <span className="cooking-journal__chart-label">{m.month.slice(5)}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 分类分布 */}
          <div className="cooking-journal__chart">
            <h3 className="cooking-journal__chart-title">分类分布</h3>
            <div className="cooking-journal__category-list">
              {Object.entries(stats.byCategory).map(([cat, count]) => (
                <div key={cat} className="cooking-journal__category-item">
                  <span className="cooking-journal__category-name">{cat === 'other' ? '其他' : cat}</span>
                  <div className="cooking-journal__category-bar-bg">
                    <div
                      className="cooking-journal__category-bar"
                      style={{ width: `${(count / stats.totalCooked) * 100}%` }}
                    />
                  </div>
                  <span className="cooking-journal__category-count">{count}</span>
                </div>
              ))}
              {Object.keys(stats.byCategory).length === 0 && (
                <div className="cooking-journal__chart-empty">暂无数据</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 列表视图 */}
      {view === 'list' && (
        <>
          {loading ? (
            <div className="cooking-journal">
              <div className="cooking-journal__header">
                <div className="skeleton-box" style={{ width: 200, height: 28, marginBottom: 8, borderRadius: 6 }} />
                <div className="skeleton-box" style={{ width: 120, height: 16, marginBottom: 20, borderRadius: 6 }} />
              </div>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="cooking-journal__item" style={{ display: 'flex', gap: 12, padding: 16, marginBottom: 12, background: 'var(--color-card)', borderRadius: 12, boxShadow: 'var(--shadow-sm)' }}>
                  <div className="skeleton-box" style={{ width: 60, height: 60, borderRadius: 8, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton-box" style={{ width: '60%', height: 16, marginBottom: 8, borderRadius: 6 }} />
                    <div className="skeleton-box" style={{ width: '40%', height: 14, marginBottom: 4, borderRadius: 6 }} />
                    <div className="skeleton-box" style={{ width: '70%', height: 14, borderRadius: 6 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="cooking-journal__empty">
              <p>还没有烹饪记录</p>
              <button className="cooking-journal__add-btn" onClick={openAddForm}>记录第一次烹饪</button>
            </div>
          ) : (
            <div className="cooking-journal__list">
              {logs.map(log => (
                <div key={log.id} className="cooking-journal__card">
                  <div className="cooking-journal__card-main">
                    <div className="cooking-journal__card-info">
                      <h3 className="cooking-journal__card-title">{log.recipeTitle}</h3>
                      <div className="cooking-journal__card-meta">
                        <span>{renderStars(log.rating)}</span>
                        <span>📅 {log.cookedAt}</span>
                        {log.duration && <span>⏱️ {log.duration}分钟</span>}
                        {log.recipeCategory && <span className="cooking-journal__card-cat">{log.recipeCategory}</span>}
                      </div>
                      {log.notes && <p className="cooking-journal__card-notes">{log.notes}</p>}
                    </div>
                    <div className="cooking-journal__card-actions">
                      <button className="cooking-journal__action-btn" onClick={() => openEditForm(log)}>✏️</button>
                      <button className="cooking-journal__action-btn cooking-journal__action-btn--delete" onClick={() => handleDelete(log.id)}>🗑️</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 分页 */}
          <Pagination current={page} total={Math.ceil(total / pageSize)} onChange={(p) => { setPage(p); window.scrollTo({ top: 0 }) }} />
        </>
      )}

      {/* 添加/编辑弹窗 */}
      {showForm && (
        <div className="cooking-journal__overlay" onClick={() => setShowForm(false)}>
          <div className="cooking-journal__modal" onClick={e => e.stopPropagation()}>
            <div className="cooking-journal__modal-header">
              <h3>{editingId ? '编辑日志' : '记录烹饪'}</h3>
              <button className="cooking-journal__modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>

            <div className="cooking-journal__form-group">
              <label>食谱 ID</label>
              <div className="cooking-journal__recipe-id-input">
                <input
                  type="text"
                  value={formData.recipeIdInput}
                  onChange={e => {
                    setFormData(prev => ({ ...prev, recipeIdInput: e.target.value }))
                    fetchRecipeTitle(e.target.value)
                  }}
                  placeholder="输入食谱 ID"
                  disabled={!!editingId}
                />
                {recipeTitle && (
                  <span className={`cooking-journal__recipe-title-preview ${recipeTitle === '未找到食谱' ? 'error' : ''}`}>
                    {recipeTitle}
                  </span>
                )}
              </div>
            </div>

            <div className="cooking-journal__form-row">
              <div className="cooking-journal__form-group">
                <label>评分</label>
                <div className="cooking-journal__rating-select">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      className={`cooking-journal__rating-star ${n <= formData.rating ? 'active' : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, rating: n }))}
                    >
                      {n <= formData.rating ? '⭐' : '☆'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="cooking-journal__form-group">
                <label>烹饪时长（分钟）</label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={e => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                  placeholder="可选"
                  min="1"
                />
              </div>
            </div>

            <div className="cooking-journal__form-group">
              <label>烹饪日期</label>
              <input
                type="date"
                value={formData.cookedAt}
                onChange={e => setFormData(prev => ({ ...prev, cookedAt: e.target.value }))}
              />
            </div>

            <div className="cooking-journal__form-group">
              <label>笔记</label>
              <textarea
                value={formData.notes}
                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="记录你的烹饪心得、改进点..."
                rows={3}
              />
            </div>

            <button className="cooking-journal__submit-btn" onClick={handleSubmit}>
              {editingId ? '💾 保存修改' : '📝 记录'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}