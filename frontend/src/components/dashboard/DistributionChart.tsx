import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface DistributionItem {
  name: string
  value: number
}

interface DistributionChartProps {
  data: DistributionItem[]
  title: string
  icon: string
  emptyIcon: string
  emptyText: string
  emptyCta?: string
  emptyLink?: string
  showCenterTotal?: boolean
  isCuisine?: boolean
}

const CHART_COLORS = [
  'var(--chart-c1)', 'var(--chart-c2)', 'var(--chart-c3)', 'var(--chart-c4)',
  'var(--chart-c5)', 'var(--chart-c6)', 'var(--chart-c7)', 'var(--chart-c8)',
]

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const item = payload[0]
  const total = item.payload.total || 0
  const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0
  return (
    <div className="chart-tooltip">
      <span>{item.name}：{item.value} 次 / {pct}%</span>
    </div>
  )
}

function CenterLabel({ total }: { total: number }) {
  return (
    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
      <tspan x="50%" dy="-8" fontSize={24} fontWeight={700} fill="var(--color-text)">{total}</tspan>
      <tspan x="50%" dy="18" fontSize={12} fill="var(--color-text-secondary)">次</tspan>
    </text>
  )
}

export default function DistributionChart({ data, title, icon, emptyIcon, emptyText, emptyCta, emptyLink, showCenterTotal, isCuisine }: DistributionChartProps) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const hasData = data.length > 0
  const total = data.reduce((s, d) => s + d.value, 0)
  const topItem = data[0]

  if (!hasData) {
    return (
      <div className="dashboard-card">
        <h3 className="dashboard-card__title">{icon} {title}</h3>
        <div className="chart-empty">
          <span className="chart-empty__icon">{emptyIcon}</span>
          <p className="chart-empty__text">{emptyText}</p>
          {emptyCta && emptyLink && <a href={emptyLink} className="chart-empty__cta">{emptyCta}</a>}
        </div>
      </div>
    )
  }

  const enrichedData = data.map(d => ({ ...d, total }))

  if (isMobile) {
    // BarChart for mobile
    return (
      <div className="dashboard-card">
        <h3 className="dashboard-card__title">{icon} {title}</h3>
        {isCuisine && topItem && (
          <div className="distribution__top">🍜 最常做：{topItem.name}</div>
        )}
        <div className="pie-chart__container">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={enrichedData} layout="vertical" margin={{ left: 20, right: 20 }}>
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-chart-axis)' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} width={60} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {enrichedData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  // PieChart for desktop
  return (
    <div className="dashboard-card">
      <h3 className="dashboard-card__title">{icon} {title}</h3>
      {isCuisine && topItem && (
        <div className="distribution__top">🍜 最常做：{topItem.name}</div>
      )}
      <div className="pie-chart__container">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={enrichedData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={showCenterTotal ? 60 : 0}
              outerRadius={90}
              paddingAngle={2}
              label={isCuisine ? ({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%` : undefined}
              labelLine={isCuisine}
              animationDuration={800}
            >
              {enrichedData.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            {showCenterTotal && <CenterLabel total={total} />}
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 11, color: 'var(--color-text-secondary)' }}
              iconType="circle"
              iconSize={8}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
