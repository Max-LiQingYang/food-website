import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { DashboardNutritionRadar } from '../../api'

interface NutritionRadarChartProps {
  data: DashboardNutritionRadar
}

const DIMENSIONS = [
  { key: 'calories', label: '热量' },
  { key: 'protein', label: '蛋白质' },
  { key: 'fat', label: '脂肪' },
  { key: 'carbs', label: '碳水' },
  { key: 'fiber', label: '纤维' },
  { key: 'sodium', label: '钠' },
]

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="chart-tooltip">
      <span>{item.payload.label} {Math.round(item.value)}%</span>
    </div>
  )
}

export default function NutritionRadarChart({ data }: NutritionRadarChartProps) {
  const hasData = DIMENSIONS.some(d => (data.actual[d.key as keyof typeof data.actual] || 0) > 0)

  if (!hasData) {
    return (
      <div className="dashboard-card">
        <h3 className="dashboard-card__title">🥗 近 7 天营养摄入</h3>
        <div className="chart-empty">
          <span className="chart-empty__icon">🥗</span>
          <p className="chart-empty__text">记录饮食后可查看营养分布</p>
          <a href="/cooking-journal" className="chart-empty__cta">记今天的第一餐</a>
        </div>
      </div>
    )
  }

  const chartData = DIMENSIONS.map(d => ({
    dim: d.key,
    label: d.label,
    actual: data.actual[d.key as keyof typeof data.actual] || 0,
    goal: 100,
  }))

  return (
    <div className="dashboard-card">
      <h3 className="dashboard-card__title">🥗 近 7 天营养摄入</h3>
      <div className="radar-chart__container">
        <ResponsiveContainer width="100%" height={280}>
          <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="var(--color-chart-grid)" />
            <PolarAngleAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }} />
            <PolarRadiusAxis angle={30} domain={[0, 120]} tick={{ fontSize: 10, fill: 'var(--color-chart-axis)' }} />
            <Tooltip content={<CustomTooltip />} />
            <Radar
              name="实际摄入"
              dataKey="actual"
              stroke="var(--chart-c1)"
              fill="var(--chart-c1)"
              fillOpacity={0.35}
              animationDuration={600}
            />
            <Radar
              name="目标"
              dataKey="goal"
              stroke="var(--chart-c8)"
              strokeDasharray="4 4"
              fill="none"
              animationDuration={600}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, color: 'var(--color-text-secondary)' }}
              iconType="circle"
              iconSize={8}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
