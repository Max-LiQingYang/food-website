import { DashboardAchievements } from '../../api'

interface AchievementOverviewProps {
  achievements: DashboardAchievements
}

export default function AchievementOverview({ achievements }: AchievementOverviewProps) {
  const { recent, nextMilestone } = achievements
  const hasRecent = recent.length > 0

  if (!hasRecent && !nextMilestone) {
    return (
      <div className="dashboard-card achievement-section">
        <h3 className="dashboard-card__title">🏆 成就进度</h3>
        <div className="chart-empty">
          <span className="chart-empty__icon">🏆</span>
          <p className="chart-empty__text">还没有解锁成就</p>
          <a href="/achievements" className="chart-empty__cta">看看我能解锁什么</a>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-card achievement-section">
      <h3 className="dashboard-card__title">🏆 成就进度</h3>
      <div className="achievement__content">
        {hasRecent && (
          <div className="achievement__recent">
            <div className="achievement__recent-label">最近解锁</div>
            <div className="achievement__badges">
              {recent.map((a, i) => (
                <a key={i} href="/achievements" className="achievement-badge">
                  <div className="achievement-badge__icon">{a.icon}</div>
                  <div className="achievement-badge__name">{a.title}</div>
                  <div className="achievement-badge__date">{a.unlockedAt?.slice(5) || ''}</div>
                </a>
              ))}
            </div>
          </div>
        )}

        {nextMilestone && (
          <div className="achievement__next">
            <div className="achievement__next-header">
              <span className="achievement__next-icon">{nextMilestone.icon}</span>
              <div>
                <div className="achievement__next-title">{nextMilestone.title}</div>
                <div className="achievement__next-desc">{nextMilestone.description}</div>
              </div>
            </div>
            <div className="achievement__progress-bar">
              <div
                className="achievement__progress-fill"
                style={{ width: `${(nextMilestone.progress / nextMilestone.maxProgress) * 100}%` }}
              />
            </div>
            <div className="achievement__progress-text">
              {nextMilestone.progress}/{nextMilestone.maxProgress} · {Math.round((nextMilestone.progress / nextMilestone.maxProgress) * 100)}%
            </div>
            <div className="achievement__progress-hint">
              再 {nextMilestone.maxProgress - nextMilestone.progress} 次即可解锁
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
