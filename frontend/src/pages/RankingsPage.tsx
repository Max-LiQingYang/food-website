import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getRankings } from '../api'
import type { RankedRecipe } from '../api'
import { useToast } from '../context/ToastContext'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import './RankingsPage.css'
import PageSkeleton from '../components/PageSkeleton'

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

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
}

const SEASON_LABELS: Record<string, string> = {
  spring: '春',
  summer: '夏',
  autumn: '秋',
  winter: '冬',
}

function renderStars(rating: number): string {
  const full = Math.round(rating)
  const empty = 5 - full
  return '★'.repeat(full) + '☆'.repeat(empty)
}

function rankBadge(rank: number) {
  if (rank === 1) {
    return (
      <div className="rank-card__badge">
        <span className="rank-card__rank-crown">♛</span>
        <span className="rank-card__rank-num rank-card__rank-num--gold">1</span>
      </div>
    )
  }
  if (rank === 2) {
    return (
      <div className="rank-card__badge">
        <span className="rank-card__rank-num rank-card__rank-num--silver">2</span>
      </div>
    )
  }
  if (rank === 3) {
    return (
      <div className="rank-card__badge">
        <span className="rank-card__rank-num rank-card__rank-num--bronze">3</span>
      </div>
    )
  }
  return (
    <div className="rank-card__badge">
      <span className="rank-card__rank-num rank-card__rank-num--normal">{rank}</span>
    </div>
  )
}

function getCardClass(rank: number) {
  if (rank === 1) return 'rank-card--gold'
  if (rank === 2) return 'rank-card--silver'
  if (rank === 3) return 'rank-card--bronze'
  return 'rank-card--normal'
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

  const getPrimaryStat = (item: RankedRecipe) => {
    switch (sortBy) {
      case 'views': return { value: Math.round(item.viewCount ?? 0), label: '浏览' }
      case 'favorites': return { value: Math.round(item.favoriteCount ?? 0), label: '收藏' }
      case 'rating': return { value: item.avgRating ? item.avgRating.toFixed(1) : '-', label: '评分' }
      default: return { value: (item.compositeScore ?? 0).toFixed(1), label: '综合分' }
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

      {/* 加载骨架 */}
      {loading && (
        <PageSkeleton type="list" />
      )}

      {/* 空状态 */}
      {!loading && list.length === 0 && (
        <div className="rankings-page__empty">
          <span className="rankings-page__empty-icon">📭</span>
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

      {/* 排行列表 */}
      {!loading && list.length > 0 && (
        <div className="rankings-page__list">
          {list.map((item) => {
            const primaryStat = getPrimaryStat(item)
            const cardClass = getCardClass(item.rank)
            return (
              <Link
                key={item.id}
                to={`/recipe/${item.id}`}
                className={`rank-card ${cardClass}`}
              >
                {/* 排名徽章 */}
                {rankBadge(item.rank)}

                {/* 封面图 */}
                <div className="rank-card__cover-wrap">
                  {item.coverImage ? (
                    <img
                      className="rank-card__cover-img"
                      src={item.coverImage}
                      alt={item.title}
                      loading="lazy"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.classList.add('cover-error') }}
                    />
                  ) : null}
                  {!item.coverImage && (
                    <div className="rank-card__cover-placeholder">🍽️</div>
                  )}
                  {item.coverImage && (
                    <div className="rank-card__cover-placeholder" style={{ display: 'none' }}>🍽️</div>
                  )}
                </div>

                {/* 卡片信息 */}
                <div className="rank-card__info">
                  <h3 className="rank-card__title">{item.title}</h3>

                  {/* 元信息合并单行：菜系·难度·时长·季节 */}
                  <div className="rank-card__meta-row">
                    <span className="rank-card__meta-category">{item.category}</span>
                    <span className="rank-card__meta-sep">·</span>
                    {item.difficulty && (
                      <>
                        <span className={`rank-card__meta-difficulty ${item.difficulty}`}>
                          {DIFFICULTY_LABELS[item.difficulty] || item.difficulty}
                        </span>
                        <span className="rank-card__meta-sep">·</span>
                      </>
                    )}
                    {item.cookTime ? (
                      <>
                        <span>{item.cookTime}分钟</span>
                        <span className="rank-card__meta-sep">·</span>
                      </>
                    ) : null}
                    {item.season && item.season !== 'all' ? (
                      <span>{SEASON_LABELS[item.season] || item.season}季</span>
                    ) : (
                      <span>全年</span>
                    )}
                  </div>

                  {/* 评分进度条 + 星级 */}
                  {item.avgRating != null && item.avgRating > 0 && (
                    <div className="rank-card__rating-row">
                      <div className="rank-card__progress-bar">
                        <div
                          className="rank-card__progress-fill"
                          style={{ width: `${(item.avgRating / 5) * 100}%` }}
                        />
                      </div>
                      <span className="rank-card__rating-value">{item.avgRating.toFixed(1)}</span>
                      <span className="rank-card__stars">{renderStars(item.avgRating)}</span>
                    </div>
                  )}
                </div>

                {/* 主统计值 */}
                <div className="rank-card__primary-stat">
                  <span className="rank-card__stat-value--primary">
                    {typeof primaryStat.value === 'number'
                      ? primaryStat.value >= 1000
                        ? (primaryStat.value / 1000).toFixed(1) + 'k'
                        : primaryStat.value
                      : parseFloat(primaryStat.value) >= 1000
                        ? (parseFloat(primaryStat.value) / 1000).toFixed(1) + 'k'
                        : primaryStat.value}
                  </span>
                  <span className="rank-card__stat-label">{primaryStat.label}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
