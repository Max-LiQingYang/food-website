interface AchievementGridProps {
  achievements: Array<{
    type: string; title: string; description: string; icon: string; category: string
    unlocked: boolean; unlockedAt: string | null; progress: number; maxProgress: number
  }>
  visible: boolean
  onItemClick?: (achievement: any) => void
}

export default function AchievementGrid({ achievements, visible, onItemClick }: AchievementGridProps) {
  return (
    <div className="achievement-grid">
      {achievements.map((a, i) => {
        const progressPct = a.maxProgress > 0 ? Math.round((a.progress / a.maxProgress) * 100) : 0
        return (
          <button
            key={a.type}
            className={`achievement-grid__item${a.unlocked ? ' achievement-grid__item--unlocked' : ''}${visible ? ' achievement-grid__item--visible' : ''}`}
            style={{ animationDelay: `${i * 80}ms` }}
            onClick={() => onItemClick?.(a)}
            title={a.description}
          >
            <span className="achievement-grid__icon">{a.icon}</span>
            <span className="achievement-grid__name">{a.title}</span>
            {!a.unlocked && (
              <div className="achievement-grid__progress-bar">
                <div className="achievement-grid__progress-fill" style={{ width: `${Math.min(progressPct, 100)}%` }} />
              </div>
            )}
            {a.unlocked && <span className="achievement-grid__check">✨</span>}
          </button>
        )
      })}
      {achievements.length === 0 && (
        <div className="achievement-grid__empty">暂无成就</div>
      )}
    </div>
  )
}
