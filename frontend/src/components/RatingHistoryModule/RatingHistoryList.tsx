import { Link } from 'react-router-dom'
import type { RatingHistoryItem } from '../../api'

interface RatingHistoryListProps {
  items: RatingHistoryItem[]
  total: number
  sort: 'time_desc' | 'rating_desc' | 'rating_asc'
  onSortChange: (s: 'time_desc' | 'rating_desc' | 'rating_asc') => void
  onLoadMore: () => void
  loadingMore: boolean
  loadMoreError: boolean
  onRetryLoadMore: () => void
}

const DIMS: Array<'taste' | 'difficulty' | 'presentation' | 'value'> = [
  'taste', 'difficulty', 'presentation', 'value'
]

const DIM_LABEL_SHORT: Record<string, string> = {
  taste: 'T',
  difficulty: 'D',
  presentation: 'P',
  value: 'V'
}

const SORT_OPTIONS: Array<{ value: 'time_desc' | 'rating_desc' | 'rating_asc'; label: string }> = [
  { value: 'time_desc', label: '时间倒序' },
  { value: 'rating_desc', label: '评分高 → 低' },
  { value: 'rating_asc', label: '评分低 → 高' }
]

function formatTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function RatingHistoryList({
  items,
  total,
  sort,
  onSortChange,
  onLoadMore,
  loadingMore,
  loadMoreError,
  onRetryLoadMore
}: RatingHistoryListProps) {
  const hasMore = items.length < total

  return (
    <div className="rhm-history">
      <div className="rhm-history__header">
        <h3 className="rhm-section__title">
          <span className="rhm-section__title-icon">📋</span>
          我的评分历史
          <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 400, color: 'var(--color-text-muted)' }}>
            共 {total} 条
          </span>
        </h3>
        <select
          className="rhm-history__sort"
          value={sort}
          onChange={(e) => onSortChange(e.target.value as 'time_desc' | 'rating_desc' | 'rating_asc')}
          aria-label="排序方式"
        >
          {SORT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {items.length === 0 ? (
        <div className="rhm-section__placeholder">
          <span className="rhm-section__placeholder-icon">📭</span>
          <span>暂无评分记录</span>
        </div>
      ) : (
        <>
          <div className="rhm-history__list" aria-label="评分历史列表">
            {items.map(item => (
              <Link
                key={item.commentId}
                to={`/recipes/${item.recipeId}?from=profile`}
                className="rhm-history__row"
                aria-label={`${item.recipeTitle}，${item.ratings.overall != null ? item.ratings.overall.toFixed(1) + ' 分' : '无评分'}`}
              >
                {item.recipeCoverUrl ? (
                  <img
                    className="rhm-history__cover"
                    src={item.recipeCoverUrl}
                    alt={item.recipeTitle}
                    loading="lazy"
                  />
                ) : (
                  <div className="rhm-history__cover rhm-top__cover-placeholder">🍽️</div>
                )}
                <div className="rhm-history__info">
                  <h4 className="rhm-history__title">{item.recipeTitle}</h4>
                  <div className="rhm-history__badges">
                    {DIMS.map(dim => {
                      const v = item.ratings[dim]
                      if (v == null) return null
                      return (
                        <span
                          key={dim}
                          className={`rhm-top__badge rhm-top__badge--${dim}`}
                          aria-label={`${dim} ${v} 分`}
                        >
                          {DIM_LABEL_SHORT[dim]} {v}
                        </span>
                      )
                    })}
                  </div>
                  {item.commentText && (
                    <div className="rhm-history__preview">{item.commentText}</div>
                  )}
                  <div className="rhm-history__time">{formatTime(item.createdAt)}</div>
                </div>
                <div className="rhm-history__score">
                  ⭐ {item.ratings.overall != null ? item.ratings.overall.toFixed(1) : '—'}
                </div>
              </Link>
            ))}
          </div>

          {loadMoreError && (
            <div className="rhm-history__retry">
              加载失败
              <button className="rhm-history__retry-btn" onClick={onRetryLoadMore}>
                重试
              </button>
            </div>
          )}

          {hasMore && !loadMoreError && (
            <button
              className="rhm-history__more"
              onClick={onLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? '加载中…' : '查看更多 ▼'}
            </button>
          )}

          {!hasMore && items.length > 0 && (
            <div className="rhm-history__end">— 已显示全部 —</div>
          )}
        </>
      )}
    </div>
  )
}
