import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import type { RatingTrendPoint } from '../../api'

interface RatingTrendChartProps {
  trend: { interval: 'month'; points: RatingTrendPoint[] }
  range: 'all' | '30d' | '90d' | '1y'
  onRangeChange: (r: 'all' | '30d' | '90d' | '1y') => void
}

const RANGES: Array<{ key: 'all' | '30d' | '90d' | '1y'; label: string }> = [
  { key: '30d', label: '近 30 天' },
  { key: '90d', label: '近 90 天' },
  { key: '1y', label: '近 1 年' },
  { key: 'all', label: '全部' }
]

/** 4 维色卡（与 UI §2.1 + global.css 变量保持一致） */
const DIM_COLORS = {
  taste: 'var(--color-dim-taste, #e8663e)',
  difficulty: 'var(--color-dim-difficulty, #52c41a)',
  presentation: 'var(--color-dim-presentation, #1890ff)',
  value: 'var(--color-dim-value, #faad14)'
}

const DIM_LABELS = {
  taste: '口味',
  difficulty: '难度',
  presentation: '卖相',
  value: '性价比'
}

export default function RatingTrendChart({ trend, range, onRangeChange }: RatingTrendChartProps) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const check = () => setIsDark(document.body.classList.contains('dark'))
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  // 数据点 < 3 → 显示占位
  if (!trend.points || trend.points.length < 3) {
    return (
      <div className="rhm-trend">
        <div className="rhm-trend__header">
          <div className="rhm-trend__ranges" role="tablist" aria-label="时间范围">
            {RANGES.map(r => (
              <button
                key={r.key}
                className={`rhm-trend__range-btn${range === r.key ? ' rhm-trend__range-btn--active' : ''}`}
                onClick={() => onRangeChange(r.key)}
                role="tab"
                aria-selected={range === r.key}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="rhm-section__placeholder">
          <span className="rhm-section__placeholder-icon">📈</span>
          <span>再评几条就能看到评分趋势</span>
        </div>
      </div>
    )
  }

  const gridColor = isDark ? '#374151' : '#e5e7eb'
  const textColor = isDark ? '#9ca3af' : '#6b7280'

  return (
    <div className="rhm-trend">
      <div className="rhm-trend__header">
        <div className="rhm-trend__ranges" role="tablist" aria-label="时间范围">
          {RANGES.map(r => (
            <button
              key={r.key}
              className={`rhm-trend__range-btn${range === r.key ? ' rhm-trend__range-btn--active' : ''}`}
              onClick={() => onRangeChange(r.key)}
              role="tab"
              aria-selected={range === r.key}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div className="rhm-trend__chart" aria-label="折线图：4 维度评分趋势">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trend.points} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 11, fill: textColor }}
              stroke={gridColor}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[1, 5]}
              ticks={[1, 2, 3, 4, 5]}
              tick={{ fontSize: 11, fill: textColor }}
              stroke={gridColor}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                fontSize: '12px',
                boxShadow: 'var(--shadow-md)'
              }}
              labelStyle={{ color: 'var(--color-text)', fontWeight: 600 }}
            />
            <Line
              type="monotone"
              dataKey="taste"
              stroke={DIM_COLORS.taste}
              strokeWidth={2}
              dot={{ r: 3 }}
              name={DIM_LABELS.taste}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="difficulty"
              stroke={DIM_COLORS.difficulty}
              strokeWidth={2}
              dot={{ r: 3 }}
              name={DIM_LABELS.difficulty}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="presentation"
              stroke={DIM_COLORS.presentation}
              strokeWidth={2}
              dot={{ r: 3 }}
              name={DIM_LABELS.presentation}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={DIM_COLORS.value}
              strokeWidth={2}
              dot={{ r: 3 }}
              name={DIM_LABELS.value}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
