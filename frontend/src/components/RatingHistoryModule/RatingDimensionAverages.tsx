import { useEffect, useState, useRef } from 'react'
import type { RatingDimensionAverages } from '../../api'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { DIMENSION_LABELS, DIMENSION_ICONS } from './RatingHistoryModule'

interface RatingDimensionAveragesProps {
  dimensionAverages: RatingDimensionAverages
  sampleLevel: 'L0' | 'L1' | 'L2' | 'L3' | 'L4'
}

const DIMS: Array<keyof typeof DIMENSION_LABELS> = ['taste', 'difficulty', 'presentation', 'value']

/** 数字 count-up 动画 */
function CountUp({ value, duration = 500 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0)
  const [started, setStarted] = useState(false)
  const prefersReducedMotion = usePrefersReducedMotion()
  const startTimeRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const ref = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    if (prefersReducedMotion || typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setStarted(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [started, prefersReducedMotion])

  useEffect(() => {
    if (!started) return
    if (prefersReducedMotion || duration <= 0) {
      setDisplay(Math.round(value * 10) / 10)
      return
    }
    startTimeRef.current = null
    const step = (timestamp: number) => {
      if (startTimeRef.current === null) startTimeRef.current = timestamp
      const elapsed = timestamp - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = progress * (2 - progress)
      setDisplay(Math.round(value * eased * 10) / 10)
      if (progress < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [value, duration, started, prefersReducedMotion])

  return <span ref={ref}>{display > 0 ? display.toFixed(1) : '—'}</span>
}

/** delta 标识渲染 */
function DeltaIndicator({ delta }: { delta: number }) {
  if (delta > 0) {
    return (
      <span className="rhm-dim-avg__delta rhm-dim-avg__delta--positive">
        ▲ +{delta.toFixed(1)}
      </span>
    )
  }
  if (delta < 0) {
    return (
      <span className="rhm-dim-avg__delta rhm-dim-avg__delta--negative">
        ▼ {delta.toFixed(1)}
      </span>
    )
  }
  return (
    <span className="rhm-dim-avg__delta rhm-dim-avg__delta--zero">— 0.0</span>
  )
}

export default function RatingDimensionAverages({
  dimensionAverages,
  sampleLevel
}: RatingDimensionAveragesProps) {
  return (
    <div className="rhm-dim-avg">
      {DIMS.map(dim => {
        const data = dimensionAverages[dim]
        const hasData = data && data.count > 0
        const isLowSample = data && data.count < 3

        return (
          <div
            key={dim}
            className={`rhm-dim-avg__card${hasData ? '' : ' rhm-dim-avg__card--empty'}`}
            aria-label={`${DIMENSION_LABELS[dim]} 平均分 ${data?.average?.toFixed(1) || '无'}，基于 ${data?.count || 0} 次评分`}
          >
            <div className="rhm-dim-avg__head">
              <span className="rhm-dim-avg__label">
                <span className="rhm-dim-avg__icon">{DIMENSION_ICONS[dim]}</span>
                {DIMENSION_LABELS[dim]}
              </span>
              {isLowSample && sampleLevel === 'L1' && (
                <span
                  className="rhm-dim-avg__warning"
                  title="样本较少"
                  aria-label="样本较少"
                >
                  ⚠️
                </span>
              )}
            </div>

            <div className={`rhm-dim-avg__value${hasData ? '' : ' rhm-dim-avg__value--empty'}`}>
              {hasData ? <CountUp value={data.average} /> : '—'}
            </div>

            <DeltaIndicator delta={data?.delta || 0} />

            <div className="rhm-dim-avg__count">
              {hasData ? `基于 ${data.count} 次评分` : '暂无数据'}
            </div>
          </div>
        )
      })}
    </div>
  )
}
