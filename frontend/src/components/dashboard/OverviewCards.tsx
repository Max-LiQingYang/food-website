import { DashboardOverview } from '../../api'

interface OverviewCardsProps {
  overview: DashboardOverview
}

const CHART_COLORS = ['var(--chart-c1)', 'var(--chart-c2)', 'var(--chart-c3)', 'var(--chart-c4)']

export default function OverviewCards({ overview }: OverviewCardsProps) {
  const cards = [
    { label: '总烹饪次数', value: overview.totalCooks, icon: '🍳', color: CHART_COLORS[0] },
    { label: '总收藏数', value: overview.totalFavorites, icon: '❤️', color: CHART_COLORS[1] },
    { label: '总评论数', value: overview.totalComments, icon: '💬', color: CHART_COLORS[2] },
    { label: '总食谱数', value: overview.totalRecipes, icon: '📝', color: CHART_COLORS[3] },
  ]

  const changePct = overview.weekChangePct
  let changeText: string
  let changeClass: string
  if (overview.lastWeekCookCount === 0 && overview.weekCookCount > 0) {
    changeText = '首次记录 🎉'
    changeClass = 'stat-delta stat-delta--up'
  } else if (changePct > 0) {
    changeText = `↑ ${changePct}%`
    changeClass = 'stat-delta stat-delta--up'
  } else if (changePct < 0) {
    changeText = `↓ ${Math.abs(changePct)}%`
    changeClass = 'stat-delta stat-delta--down'
  } else {
    changeText = '→ 持平'
    changeClass = 'stat-delta stat-delta--flat'
  }

  return (
    <div className="overview-cards">
      {cards.map((card, i) => (
        <div key={i} className="stat-card">
          <div className="stat-card__top">
            <span className="stat-card__icon">{card.icon}</span>
            <span className="stat-card__value">{card.value}</span>
            {i === 0 && <span className={changeClass}>{changeText}</span>}
          </div>
          <div className="stat-card__label">{card.label}</div>
        </div>
      ))}
      <div className="week-comparison">
        <div className="week-comparison__left">
          <div className="week-comparison__text">
            本周已做 <strong>{overview.weekCookCount}</strong> 道菜
            {overview.weekAvgRating > 0 && (
              <> · 平均评分 <strong>{overview.weekAvgRating}</strong> ⭐</>
            )}
          </div>
          <div className="week-comparison__sub">
            {overview.weekCookCount === 0
              ? '这周还没下厨，开始第一道菜吧！🍳'
              : `较上周 ${overview.weekCookCount > overview.lastWeekCookCount ? '+' : ''}${overview.weekCookCount - overview.lastWeekCookCount} 道（${changeText}）`
            }
          </div>
        </div>
        <div className="week-comparison__right">
          <div className="streak-badge">
            <span className={`streak-badge__icon${overview.streak === 0 ? ' streak-badge__icon--inactive' : ''}`}>🔥</span>
            <div className="streak-badge__info">
              <span className="streak-badge__count">{overview.streak}</span>
              <span className="streak-badge__label">
                {overview.streak === 0
                  ? '开始连续烹饪挑战'
                  : '天连续烹饪'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
