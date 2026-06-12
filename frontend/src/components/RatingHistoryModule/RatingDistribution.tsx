import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts'
import type { RatingDistribution as RatingDistributionType } from '../../api'
import { DIMENSION_LABELS } from './RatingHistoryModule'

interface RatingDistributionProps {
  distribution: RatingDistributionType
  sampleLevel: 'L0' | 'L1' | 'L2' | 'L3' | 'L4'
}

const DIMS: Array<keyof typeof DIMENSION_LABELS> = ['taste', 'difficulty', 'presentation', 'value']

/** 单维度色卡 */
const DIM_COLOR = {
  taste: 'var(--color-dim-taste, #e8663e)',
  difficulty: 'var(--color-dim-difficulty, #52c41a)',
  presentation: 'var(--color-dim-presentation, #1890ff)',
  value: 'var(--color-dim-value, #faad14)'
}

export default function RatingDistribution({ distribution, sampleLevel }: RatingDistributionProps) {
  return (
    <div className="rhm-dist" aria-label="4 维评分分布">
      {DIMS.map(dim => {
        const buckets = distribution[dim] || {}
        const data = [1, 2, 3, 4, 5].map(score => ({
          score: String(score),
          count: buckets[String(score) as '1' | '2' | '3' | '4' | '5'] || 0
        }))

        return (
          <div
            key={dim}
            className="rhm-dist__chart"
            aria-label={`${DIMENSION_LABELS[dim]}分布直方图`}
            style={{ position: 'relative' }}
          >
            <div className="rhm-dist__title">
              {DIMENSION_LABELS[dim]}分布
              {sampleLevel === 'L3' && (
                <span
                  className="rhm-dist__warning"
                  title="样本较少"
                  style={{ marginLeft: 6 }}
                >
                  ⚠️
                </span>
              )}
            </div>
            <div className="rhm-dist__svg">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="score"
                    tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                    stroke="var(--color-border)"
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                    stroke="var(--color-border)"
                    tickLine={false}
                    allowDecimals={false}
                    width={30}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value} 次`, '评分次数']}
                    labelFormatter={(label) => `${label} 分`}
                    contentStyle={{
                      background: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      boxShadow: 'var(--shadow-md)'
                    }}
                    cursor={{ fill: 'var(--color-primary-bg, #fff3ed)' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {data.map((entry, idx) => (
                      <Cell key={idx} fill={DIM_COLOR[dim]} className="rhm-dist__bar" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )
      })}
    </div>
  )
}
