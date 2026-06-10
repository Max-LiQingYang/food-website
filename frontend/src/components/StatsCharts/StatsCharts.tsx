import { useState, useEffect } from 'react'
import { getStatsTrends } from '../../api'
import FavoritesTrendChart from './FavoritesTrendChart'
import CookingFrequencyChart from './CookingFrequencyChart'
import RatingTrendChart from './RatingTrendChart'
import './StatsCharts.css'

const TABS = [
  { key: 'favorites', label: '收藏增长', icon: '❤️' },
  { key: 'cooking', label: '烹饪频率', icon: '🍳' },
  { key: 'rating', label: '评分变化', icon: '⭐' },
]

const RANGES = [
  { key: 30, label: '近30天' },
  { key: 90, label: '近90天' },
  { key: 365, label: '近一年' },
]

interface StatsChartsProps {
  userId: string | number
}

export default function StatsCharts({ userId }: StatsChartsProps) {
  const [activeTab, setActiveTab] = useState('favorites')
  const [range, setRange] = useState(30)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getStatsTrends(userId, range).then(res => {
      if (!cancelled) {
        setData(res.data || res)
        setLoading(false)
      }
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [userId, range])

  return (
    <section className="stats-charts">
      <div className="stats-charts__header">
        <h2 className="stats-charts__title">📊 数据趋势</h2>
        <div className="stats-charts__ranges">
          {RANGES.map(r => (
            <button
              key={r.key}
              className={`stats-charts__range-btn${range === r.key ? ' stats-charts__range-btn--active' : ''}`}
              onClick={() => setRange(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="stats-charts__tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`stats-charts__tab${activeTab === t.key ? ' stats-charts__tab--active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            <span className="stats-charts__tab-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div className="stats-charts__body">
        {loading ? (
          <div className="stats-charts__skeleton">
            <div className="stats-charts__skeleton-bar" />
          </div>
        ) : !data ? (
          <div className="stats-charts__empty">
            <span>📭</span>
            <p>暂无趋势数据，开始收藏和烹饪就会显示哦～</p>
          </div>
        ) : activeTab === 'favorites' ? (
          <FavoritesTrendChart data={data.favorites || []} />
        ) : activeTab === 'cooking' ? (
          <CookingFrequencyChart data={data.cooking || []} />
        ) : (
          <RatingTrendChart data={data.cooking || []} />
        )}
      </div>
    </section>
  )
}
