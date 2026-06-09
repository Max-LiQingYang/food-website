import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area } from 'recharts'

interface CookingTrendChartProps {
  data: { date: string; count: number }[]
}

export default function CookingTrendChart({ data }: CookingTrendChartProps) {
  const hasData = data.some(d => d.count > 0)
  const totalCount = data.reduce((sum, d) => sum + d.count, 0)
  const avgPerDay = hasData ? (totalCount / data.length).toFixed(1) : '0'

  const formatXAxis = (dateStr: string) => {
    const parts = dateStr.split('-')
    return `${parts[1]}/${parts[2]}`
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    const parts = label.split('-')
    return (
      <div className="chart-tooltip">
        <span>{parts[1]}月{parts[2]}日 · {payload[0].value} 次</span>
      </div>
    )
  }

  if (!hasData) {
    return (
      <div className="dashboard-card cooking-trend-chart">
        <h3 className="dashboard-card__title">📈 近 30 天烹饪频率</h3>
        <div className="chart-empty">
          <span className="chart-empty__icon">📅</span>
          <p className="chart-empty__text">还没有烹饪记录</p>
          <a href="/cooking-journal" className="chart-empty__cta">记第一道菜</a>
        </div>
      </div>
    )
  }

  // Compute interval for mobile: show every 4th label
  const interval = Math.max(0, Math.floor(data.length / 7))

  return (
    <div className="dashboard-card cooking-trend-chart">
      <h3 className="dashboard-card__title">📈 近 30 天烹饪频率</h3>
      <div className="cooking-trend-chart__container">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <defs>
              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-c1)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--chart-c1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatXAxis}
              tick={{ fontSize: 12, fill: 'var(--color-chart-axis)' }}
              axisLine={{ stroke: 'var(--color-chart-grid)' }}
              interval={interval}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12, fill: 'var(--color-chart-axis)' }}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="count"
              stroke="var(--chart-c1)"
              strokeWidth={2.5}
              dot={{ r: 3, fill: 'var(--chart-c1)', stroke: '#fff', strokeWidth: 1 }}
              activeDot={{ r: 5, fill: 'var(--chart-c1)', stroke: '#fff', strokeWidth: 1 }}
              animationDuration={600}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="cooking-trend-chart__summary">
        共做 {totalCount} 道菜 · 日均 {avgPerDay} 道
      </div>
    </div>
  )
}
