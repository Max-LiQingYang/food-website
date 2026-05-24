import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getCookingLogStats } from '../api'
import './CookingAnalyticsPage.css'

interface StatsData {
  totalCooked: number
  thisMonthCount: number
  byCategory: Record<string, number>
  byMonth: { month: string; count: number }[]
  averageRating: number
  topRecipes: { recipeId: string; recipeTitle: string; recipeCategory: string; cookCount: number; avgRating: string }[]
  topIngredients: [string, number][]
  flavorProfile: Record<string, number>
  durationByMonth: { month: string; totalMinutes: number; count: number }[]
  weeklyFrequency: number
}

const CATEGORY_COLORS = [
  '#E8663E', '#22c55e', '#eab308', '#3b82f6', '#a855f7',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
]

/** 简易条形图 */
function BarChart({ data, valueKey, labelKey, height = 160 }: {
  data: any[]
  valueKey: string
  labelKey: string
  height?: number
}) {
  if (!data || data.length === 0) return <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>暂无数据</div>
  const maxVal = Math.max(...data.map(d => d[valueKey] || 0), 1)

  return (
    <div className="analytics-bar-chart" style={{ height }}>
      {data.map((d, i) => {
        const val = d[valueKey] || 0
        const pct = Math.max(4, (val / maxVal) * 100)
        return (
          <div key={i} className="analytics-bar-chart__column">
            <div className="analytics-bar-chart__value">{val}</div>
            <div className="analytics-bar-chart__bar-wrapper">
              <div className="analytics-bar-chart__bar" style={{ height: `${pct}%` }} title={`${d[labelKey]}: ${val}`} />
            </div>
            <div className="analytics-bar-chart__label">{d[labelKey]}</div>
          </div>
        )
      })}
    </div>
  )
}

/** 简易雷达图 */
function RadarChart({ data, size = 220 }: { data: Record<string, number>; size?: number }) {
  const entries = Object.entries(data).filter(([, v]) => v > 0)
  if (entries.length === 0) return <div style={{ textAlign: 'center', padding: 30, color: '#999' }}>暂无口味数据</div>

  const cx = size / 2
  const cy = size / 2
  const radius = size * 0.38
  const angleStep = (2 * Math.PI) / entries.length

  const flavorLabels: Record<string, string> = {
    spicy: '🌶️ 辣',
    savory: '🧂 鲜',
    sweet: '🍬 甜',
    sour: '🍋 酸',
    light: '🥬 清淡',
  }

  const points = entries.map(([, val], i) => {
    const angle = angleStep * i - Math.PI / 2
    const r = radius * (val / 100)
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`
  }).join(' ')

  return (
    <div className="radar-chart" style={{ width: size, height: size }}>
      <svg className="radar-chart__svg" viewBox={`0 0 ${size} ${size}`}>
        {/* 背景网格 */}
        {[0.2, 0.4, 0.6, 0.8, 1.0].map(pct => (
          <polygon
            key={pct}
            points={entries.map((_, i) => {
              const angle = angleStep * i - Math.PI / 2
              const r = radius * pct
              return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`
            }).join(' ')}
            fill="none"
            stroke="var(--color-border, #e8e0d8)"
            strokeWidth={1}
          />
        ))}
        {/* 轴线 */}
        {entries.map((_, i) => {
          const angle = angleStep * i - Math.PI / 2
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={cx + radius * Math.cos(angle)}
              y2={cy + radius * Math.sin(angle)}
              stroke="var(--color-border, #e8e0d8)"
              strokeWidth={1}
            />
          )
        })}
        {/* 数据多边形 */}
        <polygon points={points} fill="rgba(232, 102, 62, 0.2)" stroke="#E8663E" strokeWidth={2} />
        {/* 数据点 */}
        {entries.map(([, val], i) => {
          const angle = angleStep * i - Math.PI / 2
          const r = radius * (val / 100)
          return (
            <circle key={i} cx={cx + r * Math.cos(angle)} cy={cy + r * Math.sin(angle)} r={4} fill="#E8663E" />
          )
        })}
      </svg>
      {/* 标签 */}
      {entries.map(([key], i) => {
        const angle = angleStep * i - Math.PI / 2
        const labelR = radius + 22
        const x = cx + labelR * Math.cos(angle)
        const y = cy + labelR * Math.sin(angle)
        return (
          <div
            key={key}
            className="radar-chart__label"
            style={{
              left: x - 16,
              top: y - 8,
              textAlign: 'center',
              transform: Math.abs(angle - Math.PI / 2) < 0.1 ? 'translateX(-50%)' :
                Math.abs(angle + Math.PI / 2) < 0.1 ? 'translateX(-50%)' : '',
            }}
          >
            {flavorLabels[key] || key}
          </div>
        )
      })}
    </div>
  )
}

/** 食材标签云 */
function IngredientCloud({ items }: { items: [string, number][] }) {
  if (!items || items.length === 0) return <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>暂无食材数据</div>
  const maxCount = Math.max(...items.map(([, c]) => c), 1)

  return (
    <div className="ingredient-cloud">
      {items.slice(0, 30).map(([name, count]) => {
        const size = Math.max(12, Math.min(20, 11 + (count / maxCount) * 9))
        const opacity = Math.max(0.5, Math.min(1, 0.4 + (count / maxCount) * 0.6))
        return (
          <span key={name} className="ingredient-cloud__tag" style={{ fontSize: size, opacity }}>
            {name} <span style={{ fontSize: 10, opacity: 0.6 }}>×{count}</span>
          </span>
        )
      })}
    </div>
  )
}

export default function CookingAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState<StatsData | null>(null)

  useEffect(() => {
    setLoading(true)
    getCookingLogStats()
      .then((res: any) => {
        setStats(res.data || res)
      })
      .catch(() => setError('加载统计数据失败'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="cooking-analytics"><div className="cooking-analytics__loading">加载分析数据...</div></div>
  if (error) return <div className="cooking-analytics"><div className="cooking-analytics__error">{error}</div></div>
  if (!stats || stats.totalCooked === 0) {
    return (
      <div className="cooking-analytics">
        <div className="cooking-analytics__header">
          <h1 className="cooking-analytics__title">📊 烹饪数据分析</h1>
          <p className="cooking-analytics__subtitle">记录你的烹饪之旅</p>
        </div>
        <div className="cooking-analytics__empty">
          <div className="cooking-analytics__empty-icon">🍳</div>
          <p>还没有烹饪记录</p>
          <Link to="/cooking-log" className="btn btn--primary" style={{ marginTop: 12, display: 'inline-block' }}>
            开始记录
          </Link>
        </div>
      </div>
    )
  }

  const topRecipes = stats.topRecipes || []
  const topIngredients = stats.topIngredients || []

  return (
    <div className="cooking-analytics">
      <div className="cooking-analytics__header">
        <h1 className="cooking-analytics__title">📊 烹饪数据分析</h1>
        <p className="cooking-analytics__subtitle">基于你的 {stats.totalCooked} 次烹饪记录</p>
      </div>

      {/* 概览卡片 */}
      <div className="cooking-analytics__overview">
        <div className="cooking-analytics__card">
          <div className="cooking-analytics__card-icon">🍳</div>
          <div className="cooking-analytics__card-value">{stats.totalCooked}</div>
          <div className="cooking-analytics__card-label">总烹饪次数</div>
        </div>
        <div className="cooking-analytics__card">
          <div className="cooking-analytics__card-icon">📅</div>
          <div className="cooking-analytics__card-value">{stats.thisMonthCount}</div>
          <div className="cooking-analytics__card-label">本月烹饪</div>
        </div>
        <div className="cooking-analytics__card">
          <div className="cooking-analytics__card-icon">📆</div>
          <div className="cooking-analytics__card-value">{stats.weeklyFrequency > 0 ? stats.weeklyFrequency : '-'}</div>
          <div className="cooking-analytics__card-label">每周平均</div>
        </div>
        <div className="cooking-analytics__card">
          <div className="cooking-analytics__card-icon">⭐</div>
          <div className="cooking-analytics__card-value">{stats.averageRating || '-'}</div>
          <div className="cooking-analytics__card-label">平均评分</div>
        </div>
      </div>

      {/* 月烹饪频率折线图 */}
      <div className="cooking-analytics__chart-section">
        <h3 className="cooking-analytics__chart-title">📈 烹饪频率</h3>
        <BarChart
          data={stats.byMonth}
          valueKey="count"
          labelKey="month"
        />
      </div>

      {/* 月度烹饪时长 */}
      {stats.durationByMonth && stats.durationByMonth.some(d => d.totalMinutes > 0) && (
        <div className="cooking-analytics__chart-section">
          <h3 className="cooking-analytics__chart-title">⏱️ 月度烹饪时长</h3>
          <BarChart
            data={stats.durationByMonth}
            valueKey="totalMinutes"
            labelKey="month"
          />
        </div>
      )}

      {/* 双栏布局 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
        {/* 最常做菜TOP10 */}
        <div className="cooking-analytics__chart-section" style={{ marginBottom: 0 }}>
          <h3 className="cooking-analytics__chart-title">🏆 最常做菜 TOP10</h3>
          {topRecipes.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>暂无数据</div>
          ) : (
            <ul className="analytics-top-list">
              {topRecipes.map((r, i) => (
                <li key={r.recipeId || i} className="analytics-top-list__item">
                  <div className={`analytics-top-list__rank ${i < 3 ? `analytics-top-list__rank--${i + 1}` : 'analytics-top-list__rank--other'}`}>
                    {i + 1}
                  </div>
                  <Link to={`/recipe/${r.recipeId}`} className="analytics-top-list__name">
                    {r.recipeTitle || `食谱 #${r.recipeId}`}
                  </Link>
                  <div className="analytics-top-list__stats">
                    <span>×{r.cookCount}次</span>
                    {r.avgRating > 0 && (
                      <span className="analytics-top-list__rating" style={{ marginLeft: 8 }}>
                        ★ {parseFloat(r.avgRating).toFixed(1)}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 口味偏好雷达图 */}
        <div className="cooking-analytics__chart-section" style={{ marginBottom: 0 }}>
          <h3 className="cooking-analytics__chart-title">🎯 口味偏好</h3>
          <RadarChart data={stats.flavorProfile} />
        </div>
      </div>

      {/* 食材使用频率 */}
      <div className="cooking-analytics__chart-section">
        <h3 className="cooking-analytics__chart-title">🥬 食材使用频率 TOP30</h3>
        <IngredientCloud items={topIngredients} />
      </div>

      {/* 分类分布 */}
      {stats.byCategory && Object.keys(stats.byCategory).length > 0 && (
        <div className="cooking-analytics__chart-section">
          <h3 className="cooking-analytics__chart-title">📂 菜系分类分布</h3>
          <div className="analytics-category-list">
            {Object.entries(stats.byCategory)
              .sort(([, a], [, b]) => b - a)
              .map(([cat, count], i) => (
                <div key={cat} className="analytics-category-item">
                  <div className="analytics-category-item__color" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                  <span className="analytics-category-item__name">{cat}</span>
                  <span className="analytics-category-item__count">×{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}