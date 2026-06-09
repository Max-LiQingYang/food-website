export default function QuickActions() {
  const actions = [
    { icon: '✍️', label: '写烹饪日志', link: '/cooking-journal' },
    { icon: '❤️', label: '查看收藏', link: '/favorites' },
    { icon: '🍳', label: '开始烹饪', link: '/cooking-mode/random', isRandom: true },
    { icon: '📅', label: '查看餐单', link: '/meal-plans' },
  ]

  const handleClick = (action: typeof actions[0]) => {
    if (action.isRandom) {
      // Random recipe - fetch and redirect
      window.location.href = action.link
    } else {
      window.location.href = action.link
    }
  }

  return (
    <div className="dashboard-card quick-actions-section">
      <h3 className="dashboard-card__title">⚡ 快捷操作</h3>
      <div className="quick-actions__grid">
        {actions.map((action, i) => (
          <button
            key={i}
            className="quick-action-btn"
            onClick={() => handleClick(action)}
          >
            <span className="quick-action-btn__icon">{action.icon}</span>
            <span className="quick-action-btn__label">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
