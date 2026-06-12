import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip
} from 'recharts'
import type { RatingDimensionAverages } from '../../api'
import { DIMENSION_LABELS } from './RatingHistoryModule'

interface RatingRadarProps {
  dimensionAverages: RatingDimensionAverages
  sampleLevel: 'L0' | 'L1' | 'L2' | 'L3' | 'L4'
}

const DIMENSION_ORDER: Array<keyof typeof DIMENSION_LABELS> = ['taste', 'difficulty', 'presentation', 'value']

export default function RatingRadar({ dimensionAverages, sampleLevel }: RatingRadarProps) {
  // 计算有效维度数（count > 0 的）
  const validDims = DIMENSION_ORDER.filter(dim =>
    dimensionAverages[dim] && dimensionAverages[dim].count > 0
  )

  // L1（1-2 条）时不显示雷达图，显示占位
  if (sampleLevel === 'L1' || validDims.length < 3) {
    return (
      <div className="rhm-radar">
        <div className="rhm-section__placeholder">
          <span className="rhm-section__placeholder-icon">🎯</span>
          <span>再评 {Math.max(0, 3 - validDims.length)} 条就能看到口味画像</span>
        </div>
      </div>
    )
  }

  // 构造图表数据
  const chartData = validDims.map(dim => ({
    dimension: DIMENSION_LABELS[dim] || dim,
    value: dimensionAverages[dim].average,
    count: dimensionAverages[dim].count,
    fullMark: 5
  }))

  // 使用 CSS 变量字符串（recharts 会塞到 SVG <path stroke=...>，浏览器原生解析）
  // 主题切换瞬时生效，无 MutationObserver 闪烁
  const gridColor = 'var(--color-border, #e8e0d8)'
  const textColor = 'var(--color-text-secondary, #666)'
  const accentColor = 'var(--color-dim-taste, #e8663e)'
  const fillOpacity = 0.3

  return (
    <div className="rhm-radar">
      <div className="rhm-radar__chart" aria-label="雷达图：用户口味画像">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart
            cx="50%"
            cy="50%"
            outerRadius="65%"
            data={chartData}
            margin={{ top: 10, right: 20, bottom: 10, left: 20 }}
          >
            <PolarGrid stroke={gridColor} />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fill: textColor, fontSize: 12 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 5]}
              tick={false}
              axisLine={false}
            />
            <Radar
              name="平均分"
              dataKey="value"
              stroke={accentColor}
              fill={accentColor}
              fillOpacity={fillOpacity}
              strokeWidth={2}
            />
            <Tooltip
              formatter={(value: number, name: string, props: any) => [
                `${value.toFixed(1)} 分 · 基于 ${props.payload.count} 次评分`,
                props.payload.dimension
              ]}
              contentStyle={{
                background: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                fontSize: '13px',
                boxShadow: 'var(--shadow-md)'
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
