import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Pagination from '../components/Pagination'
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  NotificationItem
} from '../api'
import { useAuth } from '../context/AuthContext'
import './NotificationsPage.css'

const NOTIF_ICONS: Record<string, string> = {
  follow: '👤',
  comment: '💬',
  reply: '↩️',
  favorite: '❤️',
  collection_add: '📂',
  meal_plan_reminder: '⏰',
  cooking_log_reminder: '📝',
  achievement_unlock: '🏆',
  challenge_update: '🏅',
  system: '🔔'
}

const NOTIF_TYPES = [
  { value: '', label: '全部' },
  { value: 'follow', label: '关注' },
  { value: 'comment', label: '评论' },
  { value: 'reply', label: '回复' },
  { value: 'favorite', label: '收藏' },
  { value: 'challenge_update', label: '挑战' },
  { value: 'achievement_unlock', label: '成就' },
  { value: 'system', label: '系统' }
]

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  const now = Date.now()
  const diff = now - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
  if (diff < 604800000) return Math.floor(diff / 86400000) + '天前'
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

export default function NotificationsPage() {
  const { isAuthenticated } = useAuth()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [unreadCount, setUnreadCount] = useState(0)
  const [filterType, setFilterType] = useState('')
  const [filterUnread, setFilterUnread] = useState(false)
  const [groupByType, setGroupByType] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) return
    setLoading(true)
    try {
      const res = await getNotifications({
        page,
        pageSize,
        type: filterType || undefined,
        unread: filterUnread || undefined
      })
      setItems(res.list || [])
      setTotal(res.total || 0)
      setUnreadCount(res.unreadCount)
    } catch {
      // ignore
    }
    setLoading(false)
  }, [isAuthenticated, page, pageSize, filterType, filterUnread])

  // 按类型分组
  const groupedItems = useCallback(() => {
    const groups: Record<string, NotificationItem[]> = {}
    for (const item of items) {
      const key = item.type
      if (!groups[key]) groups[key] = []
      groups[key].push(item)
    }
    // 排序：未读优先，按最新时间
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => {
        if (a.isRead !== b.isRead) return a.isRead ? 1 : -1
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
    }
    return groups
  }, [items])

  const toggleGroup = (type: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  // 默认展开有未读的组
  useEffect(() => {
    if (groupByType && items.length > 0) {
      const unreadGroups = [...new Set(items.filter(i => !i.isRead).map(i => i.type))]
      setExpandedGroups(new Set(unreadGroups))
    }
  }, [groupByType, items])

  useEffect(() => { fetchData() }, [fetchData])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id)
      setItems(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch { /* ignore */ }
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead()
      setItems(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch { /* ignore */ }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id)
      setItems(prev => prev.filter(n => n.id !== id))
      setTotal(prev => prev - 1)
    } catch { /* ignore */ }
  }

  if (!isAuthenticated) {
    return (
      <div className="notif-page">
        <div className="notif-page__empty">
          <p>请先登录查看通知</p>
          <Link to="/login">去登录</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="notif-page">
      <div className="notif-page__header">
        <h1 className="notif-page__title">通知</h1>
        {unreadCount > 0 && (
          <button className="notif-page__mark-all" onClick={handleMarkAllRead}>
            全部已读 ({unreadCount})
          </button>
        )}
      </div>

      {/* 筛选栏 */}
      <div className="notif-page__filters">
        <div className="notif-page__type-filter">
          {NOTIF_TYPES.map(t => (
            <button
              key={t.value}
              className={`notif-page__filter-btn ${filterType === t.value ? 'active' : ''}`}
              onClick={() => { setFilterType(t.value); setPage(1) }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="notif-page__filter-options">
          <label className="notif-page__unread-toggle">
            <input
              type="checkbox"
              checked={filterUnread}
              onChange={() => { setFilterUnread(!filterUnread); setPage(1) }}
            />
            仅未读
          </label>
          <button
            className={`notif-page__group-toggle ${groupByType ? 'active' : ''}`}
            onClick={() => setGroupByType(!groupByType)}
            title="按类型分组"
          >
            📂 分组
          </button>
        </div>
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="notif-page__loading">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="notif-page__skeleton">
              <div className="skeleton-box" style={{ width: 40, height: 40, borderRadius: '50%' }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton-box" style={{ width: '80%', height: 14, marginBottom: 8 }} />
                <div className="skeleton-box" style={{ width: '40%', height: 11 }} />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="notif-page__empty">
          <p>暂无通知</p>
        </div>
      ) : groupByType ? (
        /* ── 分组视图 ── */
        <div className="notif-page__groups">
          {Object.entries(groupedItems()).map(([type, typeItems]) => {
            const typeUnread = typeItems.filter(i => !i.isRead).length
            const isExpanded = expandedGroups.has(type)
            const typeLabel = NOTIF_TYPES.find(t => t.value === type)?.label || type
            return (
              <div key={type} className="notif-page__group">
                <button
                  className="notif-page__group-header"
                  onClick={() => toggleGroup(type)}
                >
                  <span className="notif-page__group-header-left">
                    <span className="notif-page__group-icon">{NOTIF_ICONS[type] || '🔔'}</span>
                    <span className="notif-page__group-label">{typeLabel}</span>
                    {typeUnread > 0 && (
                      <span className="notif-page__group-badge">{typeUnread}</span>
                    )}
                  </span>
                  <span className="notif-page__group-count">{typeItems.length}条</span>
                  <span className={`notif-page__group-arrow ${isExpanded ? 'expanded' : ''}`}>▸</span>
                </button>
                {isExpanded && (
                  <div className="notif-page__group-items">
                    {typeItems.map(item => (
                      <div
                        key={item.id}
                        className={`notif-page__item ${item.isRead ? '' : 'notif-page__item--unread'}`}
                      >
                        <div className="notif-page__item-icon">{NOTIF_ICONS[item.type] || '🔔'}</div>
                        <div className="notif-page__item-body">
                          <Link
                            to={item.link || '/notifications'}
                            className="notif-page__item-link"
                            onClick={() => { if (!item.isRead) handleMarkRead(item.id) }}
                          >
                            <p className="notif-page__item-message">{item.message}</p>
                          </Link>
                          <span className="notif-page__item-time">{formatTime(item.createdAt)}</span>
                        </div>
                        <div className="notif-page__item-actions">
                          {!item.isRead && (
                            <button
                              className="notif-page__item-read"
                              onClick={() => handleMarkRead(item.id)}
                              title="标记已读"
                            >
                              ○
                            </button>
                          )}
                          <button
                            className="notif-page__item-delete"
                            onClick={() => handleDelete(item.id)}
                            title="删除"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        /* ── 平铺列表视图 ── */
        <div className="notif-page__list">
          {items.map(item => (
            <div
              key={item.id}
              className={`notif-page__item ${item.isRead ? '' : 'notif-page__item--unread'}`}
            >
              <div className="notif-page__item-icon">{NOTIF_ICONS[item.type] || '🔔'}</div>
              <div className="notif-page__item-body">
                <Link
                  to={item.link || '/notifications'}
                  className="notif-page__item-link"
                  onClick={() => { if (!item.isRead) handleMarkRead(item.id) }}
                >
                  <p className="notif-page__item-message">{item.message}</p>
                </Link>
                <span className="notif-page__item-time">{formatTime(item.createdAt)}</span>
              </div>
              <div className="notif-page__item-actions">
                {!item.isRead && (
                  <button
                    className="notif-page__item-read"
                    onClick={() => handleMarkRead(item.id)}
                    title="标记已读"
                  >
                    ○
                  </button>
                )}
                <button
                  className="notif-page__item-delete"
                  onClick={() => handleDelete(item.id)}
                  title="删除"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 分页 */}
      <Pagination current={page} total={totalPages} onChange={(p) => { setPage(p); window.scrollTo({ top: 0 }) }} />
    </div>
  )
}