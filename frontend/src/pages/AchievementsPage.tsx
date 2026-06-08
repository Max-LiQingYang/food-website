import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getUserAchievements, type AchievementItem } from '../api'
import AchievementDetailModal from '../components/AchievementDetailModal'
import './AchievementsPage.css'
import PageSkeleton from '../components/PageSkeleton'

type FilterCategory = 'all' | 'publisher' | 'collector' | 'commenter' | 'cook' | 'explorer' | 'social'
type FilterStatus = 'all' | 'unlocked' | 'locked'

const CATEGORY_LABELS: Record<string, string> = {
  publisher: '发布者',
  collector: '收藏家',
  commenter: '评论家',
  cook: '厨神（烹饪）',
  explorer: '探索家',
  social: '社交达人',
}

const CATEGORY_ICONS: Record<string, string> = {
  publisher: '📝',
  collector: '💖',
  commenter: '💬',
  cook: '🍳',
  explorer: '👀',
  social: '👥',
}

export default function AchievementsPage() {
  const { id: routeUserId } = useParams<{ id: string }>()
  const [achievements, setAchievements] = useState<AchievementItem[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>('all')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAch, setSelectedAch] = useState<AchievementItem | null>(null)

  // 当前用户 ID
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('user')
      if (stored) {
        const u = JSON.parse(stored)
        setCurrentUserId(u.id)
      }
    } catch { /* ignore */ }
  }, [])

  const userId = routeUserId || currentUserId || ''

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }
    setLoading(true)
    getUserAchievements(userId)
      .then((res: any) => {
        const list = Array.isArray(res) ? res : (Array.isArray(res.data) ? res.data : [])
        setAchievements(list)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId])

  const unlockedCount = achievements.filter(a => a.unlocked).length
  const totalCount = achievements.length

  const filtered = achievements.filter(ach => {
    // Category filter
    if (categoryFilter !== 'all' && ach.category !== categoryFilter) return false
    // Status filter
    if (statusFilter === 'unlocked' && !ach.unlocked) return false
    if (statusFilter === 'locked' && ach.unlocked) return false
    // Search
    if (searchQuery && !ach.title.includes(searchQuery) && !ach.description.includes(searchQuery)) return false
    return true
  })

  // Group by category
  const grouped = filtered.reduce((acc, ach) => {
    const cat = ach.category || 'other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(ach)
    return acc
  }, {} as Record<string, AchievementItem[]>)

  if (!userId) {
    return (
      <div className="achievements-page">
        <div className="achievements-empty">
          <p>请先登录后查看成就</p>
          <Link to="/login" className="btn btn--primary">登录</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="achievements-page">
      {/* Header */}
      <div className="achievements-header">
        <h1 className="achievements-header__title">🏅 成就系统</h1>
        <p className="achievements-header__stats">
          已解锁 <strong>{unlockedCount}</strong> / {totalCount}
        </p>
        <div className="achievements-header__progress-bar">
          <div
            className="achievements-header__progress-fill"
            style={{ width: totalCount > 0 ? `${(unlockedCount / totalCount) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="achievements-filters">
        {/* Search */}
        <input
          type="text"
          className="achievements-filters__search"
          placeholder="搜索成就…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />

        {/* Category filter */}
        <div className="achievements-filters__tabs">
          {(['all', 'publisher', 'collector', 'commenter', 'cook', 'explorer', 'social'] as const).map(cat => (
            <button
              key={cat}
              className={`achievements-filters__tab ${categoryFilter === cat ? 'achievements-filters__tab--active' : ''}`}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat === 'all' ? '🏠 全部' : `${CATEGORY_ICONS[cat] || ''} ${CATEGORY_LABELS[cat] || cat}`}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="achievements-filters__status">
          {(['all', 'unlocked', 'locked'] as const).map(status => (
            <button
              key={status}
              className={`achievements-filters__status-btn ${statusFilter === status ? `achievements-filters__status-btn--${status}` : ''}`}
              onClick={() => setStatusFilter(status)}
            >
              {status === 'all' ? '全部' : status === 'unlocked' ? '✅ 已解锁' : '🔒 未解锁'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <PageSkeleton type="profile" />
      ) : filtered.length === 0 ? (
        <div className="achievements-empty">
          <p>没有匹配的成就</p>
          <button className="btn btn--outline" onClick={() => { setSearchQuery(''); setCategoryFilter('all'); setStatusFilter('all') }}>
            清除筛选
          </button>
        </div>
      ) : (
        <div className="achievements-groups">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="achievements-group">
              <h2 className="achievements-group__title">
                {CATEGORY_ICONS[cat] || ''} {CATEGORY_LABELS[cat] || cat}
                <span className="achievements-group__count">
                  {items.filter(a => a.unlocked).length}/{items.length}
                </span>
              </h2>
              <div className="achievements-group__grid">
                {items.map(ach => (
                  <div
                    key={ach.type}
                    className={`achievements-card ${ach.unlocked ? '' : 'achievements-card--locked'}`}
                    onClick={() => setSelectedAch(ach)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setSelectedAch(ach) } }}
                  >
                    <div className={`achievements-card__icon ${ach.unlocked ? 'achievements-card__icon--unlocked' : ''}`}>
                      {ach.icon || '🎖️'}
                      {!ach.unlocked && <span className="achievements-card__lock">🔒</span>}
                    </div>
                    <div className="achievements-card__info">
                      <h3 className="achievements-card__title">{ach.title}</h3>
                      <p className="achievements-card__desc">{ach.description}</p>
                      {ach.progress != null && ach.maxProgress != null && (
                        <div className="achievements-card__progress">
                          <div className="achievements-card__progress-bar">
                            <div
                              className="achievements-card__progress-fill"
                              style={{
                                width: `${Math.min(100, (ach.progress / ach.maxProgress) * 100)}%`,
                                background: ach.unlocked ? 'linear-gradient(90deg, #f5a623, #f7c948)' : '#888'
                              }}
                            />
                          </div>
                          <span className="achievements-card__progress-text">
                            {ach.unlocked ? `✅ ${ach.maxProgress}` : `${ach.progress} / ${ach.maxProgress}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedAch && (
        <AchievementDetailModal
          achievement={selectedAch}
          onClose={() => setSelectedAch(null)}
        />
      )}
    </div>
  )
}