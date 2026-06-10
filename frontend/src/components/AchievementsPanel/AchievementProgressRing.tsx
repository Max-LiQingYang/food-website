interface AchievementProgressRingProps {
  unlocked: number
  total: number
  size?: number
}

export default function AchievementProgressRing({ unlocked, total, size = 60 }: AchievementProgressRingProps) {
  const pct = total > 0 ? Math.round((unlocked / total) * 100) : 0
  const radius = (size - 6) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference

  return (
    <div className="progress-ring">
      <svg width={size} height={size}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="3"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <span className="progress-ring__text">{pct}%</span>
    </div>
  )
}
