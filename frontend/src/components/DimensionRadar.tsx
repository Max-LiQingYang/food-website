import { useEffect, useState } from 'react'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip
} from 'recharts'

/** 单维度平均数据 */
interface DimensionValue {
  average: number
  count: number
}

interface DimensionRadarProps {
  /** 四维平均数据，key 为维度名（taste/difficulty/presentation/value） */
  data: Record<string, DimensionValue> | null | undefined
  /** 雷达图尺寸 */
  size?: 'sm' | 'md' | 'lg'
  /**
   * 多色模式：迭代 #134 扩展（ARCH §7 风险表第 7 条）。
   * true → 每个维度用对应色卡（--color-dim-*），分别画 4 条 Radar 叠加
   * false（默认）→ 保留原有单色行为，向后兼容
   */
  multiColor?: boolean
  /**
   * 自定义 Tooltip 格式化函数（迭代 #134 扩展）
   * 入参：(value, name, props) 同 Recharts Tooltip formatter
   * 缺省：默认显示 "维度名 X.X 分"
   */
  tooltipFormatter?: (value: number, name: string, props: any) => [string, string]
}

/** 维度中文映射 */
const DIMENSION_LABELS: Record<string, string> = {
  taste: '口味',
  difficulty: '难度',
  presentation: '卖相',
  value: '性价比'
}

/** 维度显示顺序 */
const DIMENSION_ORDER = ['taste', 'difficulty', 'presentation', 'value']

/** 尺寸 → 容器宽高映射 */
const SIZE_MAP: Record<string, number> = { sm: 160, md: 220, lg: 300 }

/** 4 维色卡（暗色 + 浅色双值） */
const DIM_COLORS = {
  taste: { light: '#e8663e', dark: '#f59e6e' },
  difficulty: { light: '#52c41a', dark: '#7ed957' },
  presentation: { light: '#1890ff', dark: '#5ab0ff' },
  value: { light: '#faad14', dark: '#ffc857' }
}

export default function DimensionRadar({
  data,
  size = 'md',
  multiColor = false,
  tooltipFormatter
}: DimensionRadarProps) {
  const [isDark, setIsDark] = useState(false)

  // 空值守卫 — review #3 P0
  if (!data || Object.keys(data).length === 0) {
    return null
  }

  // 过滤掉 count === 0 的维度（无数据不展示）
  const chartData = DIMENSION_ORDER
    .filter(dim => data[dim] && data[dim].count > 0)
    .map(dim => ({
      dimension: DIMENSION_LABELS[dim] || dim,
      dimKey: dim,
      value: data[dim].average,
      count: data[dim].count,
      fullMark: 5
    }))

  // 全部维度无数据 → 显示空态文案
  if (chartData.length === 0) {
    return (
      <div className="dimension-radar-empty" style={{ width: SIZE_MAP[size], height: SIZE_MAP[size] }}>
        <div className="dimension-radar-empty__icon">📊</div>
        <span className="dimension-radar-empty__text">暂无维度评分数据</span>
      </div>
    )
  }

  // 监听暗色模式（仅通过 body.dark class — §8 铁律）
  useEffect(() => {
    const check = () => {
      const bodyDark = document.body.classList.contains('dark')
      setIsDark(bodyDark)
    }
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const containerSize = SIZE_MAP[size] || 220
  const gridColor = isDark ? '#374151' : '#e5e7eb'
  const textColor = isDark ? '#9ca3af' : '#6b7280'
  const accentColor = isDark ? '#f87171' : '#d4532b'
  const fillOpacity = isDark ? 0.4 : 0.3

  return (
    <div className="dimension-radar-container" style={{ width: containerSize, height: containerSize }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart
          cx="50%"
          cy="50%"
          outerRadius="65%"
          data={chartData}
          margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <PolarGrid stroke={gridColor} />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fill: textColor, fontSize: 11 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 5]}
            tick={false}
            axisLine={false}
          />
          {multiColor ? (
            // 多色模式：每个维度画一条独立 Radar
            DIMENSION_ORDER.filter(dim => data[dim] && data[dim].count > 0).map(dim => {
              const colors = DIM_COLORS[dim as keyof typeof DIM_COLORS]
              const stroke = isDark ? colors.dark : colors.light
              return (
                <Radar
                  key={dim}
                  name={DIMENSION_LABELS[dim] || dim}
                  dataKey={(entry: any) => entry.dimKey === dim ? entry.value : 0}
                  stroke={stroke}
                  fill={stroke}
                  fillOpacity={fillOpacity * 0.6}
                  strokeWidth={1.5}
                  isAnimationActive={false}
                />
              )
            })
          ) : (
            // 兼容模式：单色 Radar
            <Radar
              name="平均分"
              dataKey="value"
              stroke={accentColor}
              fill={accentColor}
              fillOpacity={fillOpacity}
              strokeWidth={2}
            />
          )}
          {tooltipFormatter && (
            <Tooltip
              formatter={tooltipFormatter}
              contentStyle={{
                background: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                fontSize: '12px',
                boxShadow: 'var(--shadow-md)'
              }}
            />
          )}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
