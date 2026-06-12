import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { RatingHistoryItem } from '../../api'

interface RatingTopListProps {
  topHigh: RatingHistoryItem[]
  topLow: RatingHistoryItem[]
}

type Tab = 'high' | 'low'

const DIMS: Array<'taste' | 'difficulty' | 'presentation' | 'value'> = [
  'taste', 'difficulty', 'presentation', 'value'
]

const DIM_LABEL_SHORT: Record<string, string> = {
  taste: 'T',
  difficulty: 'D',
  presentation: 'P',
  value: 'V'
}

const MEDALS = ['🥇', '🥈', '🥉']

function formatTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function TopRow({ item, rank, isMedal }: { item: RatingHistoryItem; rank: number; isMedal: boolean }) {
  return (
    <Link
      to={`/recipes/${item.recipeId}?from=profile`}
      className="rhm-top__row"
      aria-label={`第 ${rank} 名：${item.recipeTitle}，${item.ratings.overall} 分`}
    >
      <div className="rhm-top__rank">
        {isMedal ? (
          <span className="rhm-top__rank-medal">{MEDALS[rank - 1]}</span>
        ) : (
          <span className="rhm-top__rank-number">{rank}.</span>
        )}
      </div>
      {item.recipeCoverUrl ? (
        <img
          className="rhm-top__cover"
          src={item.recipeCoverUrl}
          alt={item.recipeTitle}
          loading="lazy"
        />
      ) : (
        <div className="rhm-top__cover rhm-top__cover-placeholder">🍽️</div>
      )}
      <div className="rhm-top__info">
        <h4 className="rhm-top__title">{item.recipeTitle}</h4>
        <div className="rhm-top__badges">
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
        <div className="rhm-top__time">{formatTime(item.createdAt)}</div>
      </div>
      <div className="rhm-top__score">
        {item.ratings.overall != null ? item.ratings.overall.toFixed(1) : '—'}
      </div>
    </Link>
  )
}

export default function RatingTopList({ topHigh, topLow }: RatingTopListProps) {
  const [activeTab, setActiveTab] = useState<Tab>('high')
  const [switching, setSwitching] = useState(false)

  const handleTabChange = (tab: Tab) => {
    if (tab === activeTab) return
    setSwitching(true)
    setTimeout(() => {
      setActiveTab(tab)
      setSwitching(false)
    }, 150)
  }

  const items = activeTab === 'high' ? topHigh : topLow

  return (
    <div className="rhm-top">
      <div className="rhm-top__header">
        <h3 className="rhm-section__title">
          <span className="rhm-section__title-icon">🏆</span>
          我的 TOP 5
        </h3>
        <div className="rhm-top__tabs" role="tablist" aria-label="高/低分榜">
          <button
            className={`rhm-top__tab${activeTab === 'high' ? ' rhm-top__tab--active' : ''}`}
            onClick={() => handleTabChange('high')}
            role="tab"
            aria-selected={activeTab === 'high'}
          >
            高分榜
          </button>
          <button
            className={`rhm-top__tab${activeTab === 'low' ? ' rhm-top__tab--active' : ''}`}
            onClick={() => handleTabChange('low')}
            role="tab"
            aria-selected={activeTab === 'low'}
          >
            低分榜
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rhm-top__empty">
          {activeTab === 'high' ? '暂无高分评分' : '暂无低分评分'}
        </div>
      ) : (
        <div className={`rhm-top__list${switching ? ' is-switching' : ''}`}>
          {items.map((item, idx) => (
            <TopRow
              key={item.commentId}
              item={item}
              rank={idx + 1}
              isMedal={idx < 3}
            />
          ))}
        </div>
      )}
    </div>
  )
}
