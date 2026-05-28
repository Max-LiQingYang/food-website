import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getRankings } from '../api'
import type { RankedRecipe } from '../api'
import { useToast } from '../context/ToastContext'
import RecipeCard from '../components/RecipeCard'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import './RankingsPage.css'

const PERIODS = [
  { key: 'weekly', label: '📅 周榜' },
  { key: 'monthly', label: '📆 月榜' },
  { key: 'alltime', label: '🏆 总榜' },
]

const SORT_OPTIONS = [
  { key: 'composite', label: '🔥 综合' },
  { key: 'views', label: '👁️ 浏览' },
  { key: 'favorites', label: '❤️ 收藏' },
  { key: 'rating', label: '⭐ 评分' },
]

const SEASON_ICONS: Record<string, string> = {
  'spring': '🌸',
  'summer': '☀️',
  'autumn': '🍂',
  'winter': '❄️',
}

const SEASON_LABELS: Record<string, string> = {
  'spring': '春',
  'summer': '夏',
  'autumn': '秋',
  'winter': '冬',
}

export default function RankingsPage() {
  const [period, setPeriod] = useState('alltime')
  const [sortBy, setSortBy] = useState('composite')
  const [list, setList] = useState<RankedRecipe[]>([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  const fetchData = useCallback(() => {
    setLoading(true)
    getRankings(period, sortBy)
      .then(res => setList(res.list || []))
      .catch(() => toast.error('加载排行榜失败'))
      .finally(() => setLoading(false))
  }, [period, sortBy])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const { refreshing, pullDistance, statusText, touchHandlers } = usePullToRefresh({ onRefresh: fetchData })

  const rankEmoji = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  const getPrimaryStat = (item: RankedRecipe) => {
    switch (sortBy) {
      case 'views': return { value: item.viewCount ?? 0, label: '浏览' }
      case 'favorites': return { value: item.favoriteCount, label: '收藏' }
      case 'rating': return { value: item.avgRating ? item.avgRating.toFixed(1) : '-', label: '评分' }
      default: return { value: item.compositeScore, label: '综合分' }
    }
  }

  return (
    <div className="rankings-page pull-to-refresh-container" {...touchHandlers}>
      {pullDistance > 0 && (
        <div className="pull-indicator" style={{ height: `${pullDistance}px`, opacity: pullDistance / 60 }}>
          {refreshing ? (
            <>
              <span className="pull-indicator__spinner" />
              <span className="pull-indicator__text">{statusText === 'done' ? '✅ 刷新完成' : '刷新中...'}</span>
            </>
          ) : (
            <span className="pull-indicator__text">
              <span className="pull-indicator__arrow" style={{ transform: pullDistance >= 60 ? 'rotate(180deg)' : 'rotate(0deg)' }}>↓</span>
              {pullDistance >= 60 ? '释放刷新' : '下拉刷新'}
            </span>
          )}
        </div>
      )}
      <div className="rankings-page__header">
        <h1>🏆 食谱排行榜</h1>
        <p className="rankings-page__subtitle">
          按综合、浏览、收藏、评分多维度发现最受欢迎的食谱
        </p>
      </div>

      {/* 时间段切换 */}
      <div className="rankings-page__tabs">
        {PERIODS.map(p => (
          <button
            key={p.key}
            className={`rankings-page__tab${period === p.key ? ' active' : ''}`}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* 排序方式切换 */}
      <div className="rankings-page__sort">
        {SORT_OPTIONS.map(s => (
          <button
            key={s.key}
            className={`rankings-page__sort-btn${sortBy === s.key ? ' active' : ''}`}
            onClick={() => setSortBy(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* 加载骨架屏 */}
      {loading && (
        <div className="rankings-page__loading">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="rank-card-skeleton rank-card-skeleton--enhanced">
              <div className="skeleton-badge" />
              <div className="skeleton-bar" />
              <div className="skeleton-main">
                <div className="skeleton-img" />
                <div className="skeleton-info">
                  <div className="skeleton-line w-70" />
                  <div className="skeleton-line w-50" />
                  <div className="skeleton-line w-30" />
                </div>
              </div>
              <div className="skeleton-stats">
                <div className="skeleton-line w-40" />
                <div className="skeleton-line w-40" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 排名列表 */}
      {!loading && list.length === 0 && (
        <div className="rankings-page__empty">
          <div className="rankings-page__empty-icon">📭</div>
          <p className="rankings-page__empty-text">
            {period === 'weekly'
              ? '本周暂无热门食谱数据' 
              : period === 'monthly'
                ? '本月暂无热门食谱数据'
                : '暂无食谱数据'}
          </p>
          <p className="rankings-page__empty-hint">食材少的时候别着急，试试换个时间范围或排序方式</p>
          <Link to="/" className="rankings-page__back-link">去首页逛逛 →</Link>
        </div>
      )}

      {!loading && list.length > 0 && (
        <div className="rankings-page__list">
          {list.map((item, idx) => {
            const primaryStat = getPrimaryStat(item)
            return (
              <div key={item.id} className={`rank-card rank-card--${item.rank <= 3 ? 'top' : 'normal'}`}>
                {/* 排名徽章 */}
                <div className="rank-card__badge">
                  <span className={`rank-card__rank-num rank-${item.rank}`}>{rankEmoji(item.rank)}</span>
                </div>

                {/* 分数柱 */}
                <div className="rank-card__score-bar">
                  <div
                    className="rank-card__score-fill"
                    style={{ height: `${Math.min(((item.rank <= 3 ? 100 - (item.rank - 1) * 25 : Math.max(100 - item.rank * 4, 10)) / 100) * 100, 100)}%` }}
                  />
                </div>

                {/* 卡片信息 */}
                <div className="rank-card__content">
                  <RecipeCard recipe={item} />
                </div>

                {/* 统计区 */}
                <div className="rank-card__stats">
                  <div className="rank-card__primary-stat">
                    <span className="rank-card__stat-value rank-card__stat-value--primary">
                      {typeof primaryStat.value === 'number' && primaryStat.value >= 1000
                        ? (primaryStat.value / 1000).toFixed(1) + 'k'
                        : primaryStat.value}
                    </span>
                    <span className="rank-card__stat-label">{primaryStat.label}</span>
                  </div>
                  {(sortBy !== 'rating' && item.avgRating != null && item.avgRating > 0) && (
                    <div className="rank-card__stat">
                      <span className="rank-card__stat-value">{item.avgRating.toFixed(1)}</span>
                      <span className="rank-card__stat-label">⭐</span>
                    </div>
                  )}
                  {item.season && item.season !== 'all' && (
                    <div className="rank-card__season-tag" title={`${SEASON_LABELS[item.season] || item.season}季推荐`}>
                      {SEASON_ICONS[item.season] || '📅'}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}