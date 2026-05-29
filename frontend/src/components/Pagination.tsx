import { useMemo } from 'react'
import './Pagination.css'

interface PaginationProps {
  current: number
  total: number
  onChange: (page: number) => void
}

export default function Pagination({ current, total, onChange }: PaginationProps) {
  const pages = useMemo(() => {
    const result: (number | string)[] = []
    if (total <= 7) {
      for (let i = 1; i <= total; i++) result.push(i)
    } else {
      result.push(1)
      if (current > 3) result.push('...')
      for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
        result.push(i)
      }
      if (current < total - 2) result.push('...')
      result.push(total)
    }
    return result
  }, [current, total])

  if (total <= 1) return null

  return (
    <div className="pagination">
      <button className="pagination__btn" disabled={current <= 1} onClick={() => onChange(current - 1)}>
        ← 上一页
      </button>
      {pages.map((p, i) =>
        typeof p === 'number' ? (
          <button
            key={i}
            className={`pagination__page ${p === current ? 'pagination__page--active' : ''}`}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        ) : (
          <span key={i} className="pagination__ellipsis">...</span>
        )
      )}
      <button className="pagination__btn" disabled={current >= total} onClick={() => onChange(current + 1)}>
        下一页 →
      </button>
    </div>
  )
}
