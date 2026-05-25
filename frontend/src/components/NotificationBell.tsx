import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  getUnreadNotificationCount,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  NotificationItem
} from '../api'
import { useAuth } from '../context/AuthContext'
import './NotificationBell.css'

const NOTIF_ICONS: Record<string, string> = {
  follow: '👤',
  comment: '💬',
  reply: '↩️',
  favorite: '❤️',
  collection_add: '📂',
  meal_plan_reminder: '⏰',
  cooking_log_reminder: '📝',
  achievement_unlock: '🏆',
  system: '🔔'
}

export default function NotificationBell() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [unreadCount, setUnreadCount] = useState(0)
  const [recent, setRecent] = useState<NotificationItem[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval>>()

  const fetchUnread = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      const res = await getUnreadNotificationCount()
      setUnreadCount(res.count)
    } catch {
      // ignore
    }
  }, [isAuthenticated])

  const fetchRecent = useCallback(async () => {
    if (!isAuthenticated) return
    setLoading(true)
    try {
      const res = await getNotifications({ pageSize: 5 })
      setRecent(res.list || [])
      setUnreadCount(res.unreadCount)
    } catch {
      // ignore
    }
    setLoading(false)
  }, [isAuthenticated])

  // 每30秒轮询未读数
  useEffect(() => {
    fetchUnread()
    pollRef.current = setInterval(fetchUnread, 30000)
    return () => clearInterval(pollRef.current)
  }, [fetchUnread])

  const handleToggle = () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    const next = !open
    setOpen(next)
    if (next) fetchRecent()
  }

  // 点击外部关闭
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const handleMarkRead = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await markNotificationRead(id)
      setRecent(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch {
      // ignore
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead()
      setRecent(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch {
      // ignore
    }
  }

  const handleItemClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      try {
        await markNotificationRead(item.id)
        setUnreadCount(prev => Math.max(0, prev - 1))
      } catch {
        // ignore
      }
    }
    setOpen(false)
  }

  if (!isAuthenticated) return null

  const hasUnread = unreadCount > 0

  return (
    <div className="notif-bell" ref={dropdownRef}>
      <button
        className={`notif-bell__btn ${hasUnread ? 'has-unread' : ''}`}
        onClick={handleToggle}
        aria-label={`通知${hasUnread ? `（${unreadCount}条未读）` : ''}`}
        title="通知"
      >
        🔔
        {hasUnread && <span className="notif-bell__badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="notif-bell__dropdown">
          <div className="notif-bell__header">
            <span className="notif-bell__title">通知</span>
            {unreadCount > 0 && (
              <button className="notif-bell__mark-all" onClick={handleMarkAllRead}>
                全部已读
              </button>
            )}
          </div>

          <div className="notif-bell__list">
            {loading ? (
              <div className="notif-bell__loading">加载中...</div>
            ) : recent.length === 0 ? (
              <div className="notif-bell__empty">暂无通知</div>
            ) : (
              recent.map(item => (
                <Link
                  key={item.id}
                  to={item.link || '/notifications'}
                  className={`notif-bell__item ${item.isRead ? '' : 'notif-bell__item--unread'}`}
                  onClick={() => handleItemClick(item)}
                >
                  <span className="notif-bell__item-icon">{NOTIF_ICONS[item.type] || '🔔'}</span>
                  <span className="notif-bell__item-text">{item.message}</span>
                  <button
                    className="notif-bell__item-read-btn"
                    onClick={(e) => handleMarkRead(item.id, e)}
                    title={item.isRead ? '已读' : '标记已读'}
                  >
                    {item.isRead ? '◉' : '○'}
                  </button>
                </Link>
              ))
            )}
          </div>

          <Link to="/notifications" className="notif-bell__footer" onClick={() => setOpen(false)}>
            查看全部通知
          </Link>
        </div>
      )}
    </div>
  )
}