import { useState } from 'react'
import './NutritionCard.css'

export interface NutritionData {
  calories: number
  protein: number
  fat: number
  carbs: number
  fiber: number
  sodium?: number
}

interface RingItem {
  key: keyof NutritionData
  label: string
  unit: string
  color: string
  bgColor: string
  /** 每日推荐参考值 (DV) */
  dv: number
  /** 占环形百分比的分母 */ 
  maxRing: number
}

const RING_ITEMS: RingItem[] = [
  { key: 'calories', label: '热量', unit: 'kcal', color: '#E8663E', bgColor: 'rgba(232,102,62,0.15)', dv: 2000, maxRing: 1000 },
  { key: 'protein', label: '蛋白质', unit: 'g', color: '#FF8C42', bgColor: 'rgba(255,140,66,0.15)', dv: 65, maxRing: 80 },
  { key: 'fat', label: '脂肪', unit: 'g', color: '#faad14', bgColor: 'rgba(250,173,20,0.15)', dv: 65, maxRing: 80 },
  { key: 'carbs', label: '碳水', unit: 'g', color: '#52c41a', bgColor: 'rgba(82,196,26,0.15)', dv: 300, maxRing: 120 },
  { key: 'fiber', label: '膳食纤维', unit: 'g', color: '#1890ff', bgColor: 'rgba(24,144,255,0.15)', dv: 25, maxRing: 30 },
  { key: 'sodium', label: '钠', unit: 'mg', color: '#9b59b6', bgColor: 'rgba(155,89,182,0.15)', dv: 2300, maxRing: 2500 },
]

const R = 36
const CX = 40
const CY = 40
const CIRCUMFERENCE = 2 * Math.PI * R

export default function NutritionCard({ nutrition }: { nutrition: NutritionData }) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  return (
    <section className="nutrition-card">
      <div className="nutrition-card__grid">
        {RING_ITEMS.map(item => {
          const rawValue = nutrition[item.key] ?? 0
          const value = Math.max(0, rawValue)
          const displayValue = Number.isInteger(value) ? String(value) : value.toFixed(1)
          const percent = Math.min(value / item.dv, 1)
          const dashOffset = CIRCUMFERENCE - Math.min(value / item.maxRing, 1) * CIRCUMFERENCE
          const isExpanded = expandedKey === item.key

          return (
            <div
              key={item.key}
              className={`nutrition-ring-item ${isExpanded ? 'is-expanded' : ''}`}
              onClick={() => setExpandedKey(isExpanded ? null : item.key)}
            >
              <svg
                className="nutrition-ring-svg"
                viewBox="0 0 80 80"
                width="72"
                height="72"
              >
                <circle
                  cx={CX} cy={CY} r={R}
                  fill="none"
                  stroke={item.bgColor}
                  strokeWidth="5"
                />
                {value > 0 && (
                  <circle
                    cx={CX} cy={CY} r={R}
                    fill="none"
                    stroke={item.color}
                    strokeWidth="5"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    transform="rotate(-90 40 40)"
                    className="nutrition-ring-arc"
                  />
                )}
                <text
                  x={CX} y={CY - 2}
                  textAnchor="middle"
                  fill="currentColor"
                  fontSize="14"
                  fontWeight="700"
                >
                  {displayValue}
                </text>
                <text
                  x={CX} y={CY + 12}
                  textAnchor="middle"
                  fill="var(--color-text-muted, #999)"
                  fontSize="8"
                >
                  {item.unit}
                </text>
              </svg>

              <span className="nutrition-ring-label">{item.label}</span>

              {isExpanded && (
                <div className="nutrition-ring-dv">
                  <span className="dv-bar" style={{ '--dv-width': `${Math.round(percent * 100)}%` } as any}>
                    <span className="dv-fill" />
                  </span>
                  <span className="dv-text">
                    {Math.round(percent * 100)}% DV
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <p className="nutrition-card__hint">点击营养素查看每日摄入量占比</p>
    </section>
  )
}