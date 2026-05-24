import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getBehaviorHistory, getBehaviorStats, BehaviorEventType, BehaviorStats } from '../api'
import './BrowsingHistory.css'

const eventTypeIcons: Record<BehaviorEventType, string> = {
  view: '👁️',
  favorite: '❤️',
  cook: '🍳',
  share: '📤',
}

const eventTypeLabels: Record<BehaviorEventType, string> = {
  view: '浏览',
  favorite: '收藏',
  cook: '烹饪',
  share: '分享',
}

const filterOptions: Array<{ label: string; value: BehaviorEventType | 'all' }> = [
  { label: '全部', value: 'all' },
  { label: '浏览', value: 'view' },
  { label: '收藏', value: 'favorite' },
  { label: '烹饪', value: 'cook' },
  { label: '分享', value: 'share' },
]

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} 天前`
  return d.toLocaleDateString('zh-CN')
}

const BrowsingHistory: React.FC = () => {
  const [history, setHistory] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState<BehaviorStats | null>(null)
  const [filter, setFilter] = useState<BehaviorEventType | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [limit, setLimit] = useState(20)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getBehaviorHistory({
        limit,
        eventType: filter === 'all' ? undefined : filter,
      }),
      getBehaviorStats(),
    ])
      .then(([historyData, statsData]) => {
        setHistory(historyData.list || [])
        setTotal(historyData.total || 0)
        setStats(statsData)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [filter, limit])

  return (
    <div className="browsing-history-container">
      <div className="browsing-history-header">
        <h3>📜 我的足迹</h3>
        <div className="browsing-filter-tabs">
          {filterOptions.map(opt => (
            <button
              key={opt.value}
              className={`browsing-filter-tab ${filter === opt.value ? 'active' : ''}`}
              onClick={() => { setFilter(opt.value); setLimit(20) }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {stats && (
        <div className="browsing-stats-row">
          <div className="browsing-stat">
            <div className="browsing-stat-number">{stats.viewCount}</div>
            <div className="browsing-stat-label">浏览</div>
          </div>
          <div className="browsing-stat">
            <div className="browsing-stat-number">{stats.favoriteCount}</div>
            <div className="browsing-stat-label">收藏</div>
          </div>
          <div className="browsing-stat">
            <div className="browsing-stat-number">{stats.cookCount}</div>
            <div className="browsing-stat-label">烹饪</div>
          </div>
          <div className="browsing-stat">
            <div className="browsing-stat-number">{stats.shareCount}</div>
            <div className="browsing-stat-label">分享</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="browsing-history-empty">加载中...</div>
      ) : history.length === 0 ? (
        <div className="browsing-history-empty">
          {filter === 'all' ? '暂无浏览记录，快去探索食谱吧！' : '暂无此类记录'}
        </div>
      ) : (
        <>
          <div className="browsing-history-list">
            {history.map(item => (
              <Link
                key={item.id}
                to={`/recipe/${item.recipeId}`}
                className="browsing-history-item"
              >
                <div className="browsing-history-type-icon">
                  {eventTypeIcons[item.eventType as BehaviorEventType] || '📄'}
                </div>
                <div className="browsing-history-info">
                  <div className="browsing-history-title">
                    {item.recipe?.title || '未知食谱'}
                  </div>
                  <div className="browsing-history-meta">
                    {eventTypeLabels[item.eventType as BehaviorEventType] || item.eventType}
                    {item.recipe?.category ? ` · ${item.recipe.category}` : ''}
                    {item.recipe?.difficulty ? ` · ${item.recipe.difficulty}` : ''}
                  </div>
                </div>
                <div className="browsing-history-time">
                  {formatTime(item.timestamp)}
                </div>
              </Link>
            ))}
          </div>
          {total > limit && (
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <button
                className="browsing-filter-tab"
                onClick={() => setLimit(prev => prev + 20)}
              >
                加载更多 ({limit}/{total})
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default BrowsingHistory