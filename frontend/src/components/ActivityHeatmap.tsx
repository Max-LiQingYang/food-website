import { useState, useEffect } from 'react'
import { getActivityHeatmap, type ActivityHeatmapDay } from '../api'
import './ActivityHeatmap.css'

interface ActivityHeatmapProps {
  userId: string
  days?: number
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

const LEVEL_COLORS = ['0', '1', '2', '3', '4', '5']

function getLevel(total: number, maxTotal: number): number {
  if (maxTotal === 0) return 0
  const ratio = total / maxTotal
  if (ratio === 0) return 0
  if (ratio <= 0.2) return 1
  if (ratio <= 0.4) return 2
  if (ratio <= 0.6) return 3
  if (ratio <= 0.8) return 4
  return 5
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

export default function ActivityHeatmap({ userId, days = 30 }: ActivityHeatmapProps) {
  const [daily, setDaily] = useState<ActivityHeatmapDay[]>([])
  const [maxTotal, setMaxTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [tooltip, setTooltip] = useState<{ text: string; show: boolean }>({ text: '', show: false })

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    getActivityHeatmap(userId, days)
      .then((res: any) => {
        const d = res.data ?? res
        setDaily(d.daily || [])
        setMaxTotal(d.maxTotal || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId, days])

  if (loading) {
    return <div className="heatmap-loading">加载活动数据...</div>
  }

  if (daily.length === 0) {
    return null
  }

  return (
    <div className="activity-heatmap">
      <h4 className="activity-heatmap__title">
        🔥 近期烹饪活动
        <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--color-text-muted, #999)' }}>
          近{days}天
        </span>
      </h4>

      <div className="activity-heatmap__grid"
        onMouseLeave={() => setTooltip({ text: '', show: false })}
      >
        {daily.map((day, i) => {
          const level = getLevel(day.total, maxTotal)
          return (
            <div
              key={day.date}
              className={`activity-heatmap__cell activity-heatmap__cell--${level}`}
              onMouseEnter={(e) => {
                const text = `${formatDate(day.date)} · ${day.total}次活动 (食谱${day.recipeCount} 收藏${day.favoriteCount} 评论${day.commentCount})`
                setTooltip({ text, show: true })
              }}
              onMouseMove={(e) => {
                // tooltip follows mouse within grid
              }}
            />
          )
        })}
      </div>

      {/* 悬浮提示 */}
      {tooltip.show && (
        <div className="activity-heatmap__tooltip">
          {tooltip.text}
        </div>
      )}

      {/* 图例 */}
      <div className="activity-heatmap__legend">
        <span className="activity-heatmap__legend-label">少</span>
        {LEVEL_COLORS.map(l => (
          <span key={l} className={`activity-heatmap__legend-swatch activity-heatmap__cell--${l}`} />
        ))}
        <span>多</span>
      </div>
    </div>
  )
}