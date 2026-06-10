interface AchievementCategoryPillsProps {
  categories: Array<{ key: string; label: string; color: string; unlocked: number; total: number }>
  active: string
  onChange: (key: string) => void
}

export default function AchievementCategoryPills({ categories, active, onChange }: AchievementCategoryPillsProps) {
  return (
    <div className="achievement-pills">
      <button
        className={`achievement-pill${active === 'all' ? ' achievement-pill--active' : ''}`}
        onClick={() => onChange('all')}
        style={active === 'all' ? { '--pill-color': '#666' } as React.CSSProperties : undefined}
      >
        全部
      </button>
      {categories.map(c => (
        <button
          key={c.key}
          className={`achievement-pill${active === c.key ? ' achievement-pill--active' : ''}`}
          onClick={() => onChange(c.key)}
          style={{ '--pill-color': c.color } as React.CSSProperties}
        >
          {c.label}
          <span className="achievement-pill__count">{c.unlocked}/{c.total}</span>
        </button>
      ))}
    </div>
  )
}
