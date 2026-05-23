import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getRankings } from '../api'
import type { RankedRecipe } from '../api'
import { useToast } from '../context/ToastContext'
import RecipeCard from '../components/RecipeCard'
import './RankingsPage.css'

const PERIODS = [
  { key: 'all', label: '全部' },
  { key: 'month', label: '本月' },
  { key: 'week', label: '本周' },
]

export default function RankingsPage() {
  const [period, setPeriod] = useState('all')
  const [list, setList] = useState<RankedRecipe[]>([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  useEffect(() => {
    setLoading(true)
    getRankings(period)
      .then(res => setList(res.list || []))
      .catch(() => toast.error('加载排行榜失败'))
      .finally(() => setLoading(false))
  }, [period])

  const rankEmoji = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  return (
    <div className="rankings-page">
      <div className="rankings-page__header">
        <h1>🏆 食谱排行榜</h1>
        <p className="rankings-page__subtitle">
          综合收藏数、评论数多维度评分，发现最受欢迎的食谱
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

      {/* 加载状态 */}
      {loading && (
        <div className="rankings-page__loading">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rank-card-skeleton">
              <div className="skeleton-img" />
              <div className="skeleton-info">
                <div className="skeleton-line w-60" />
                <div className="skeleton-line w-40" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 排名列表 */}
      {!loading && list.length === 0 && (
        <div className="rankings-page__empty">
          <p>暂无数据</p>
          <Link to="/" className="rankings-page__back-link">去首页逛逛 →</Link>
        </div>
      )}

      {!loading && list.length > 0 && (
        <div className="rankings-page__list">
          {list.map(item => (
            <div key={item.id} className="rank-card">
              {/* 排名徽章 */}
              <div className="rank-card__badge">{rankEmoji(item.rank)}</div>

              {/* 分数柱 */}
              <div className="rank-card__score-bar">
                <div
                  className="rank-card__score-fill"
                  style={{ height: `${Math.min((item.compositeScore / 100) * 100, 100)}%` }}
                />
              </div>

              {/* 卡片信息 */}
              <div className="rank-card__content">
                <RecipeCard recipe={item} />
              </div>

              {/* 综合评分 */}
              <div className="rank-card__stats">
                <div className="rank-card__stat">
                  <span className="rank-card__stat-value">{item.compositeScore}</span>
                  <span className="rank-card__stat-label">综合分</span>
                </div>
                <div className="rank-card__stat">
                  <span className="rank-card__stat-value">{item.favoriteCount}</span>
                  <span className="rank-card__stat-label">收藏</span>
                </div>
                <div className="rank-card__stat">
                  <span className="rank-card__stat-value">{item.commentCount}</span>
                  <span className="rank-card__stat-label">评论</span>
                </div>
                {item.qualityLabel && (
                  <span className="rank-card__quality-tag">{item.qualityLabel}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}