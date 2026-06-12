import { Link } from 'react-router-dom'

interface RatingEmptyStateProps {
  variant: 'empty' | 'privacy' | 'login'
}

export default function RatingEmptyState({ variant }: RatingEmptyStateProps) {
  if (variant === 'empty') {
    return (
      <div className="rhm-empty">
        <div className="rhm-empty__icon">📊</div>
        <h3 className="rhm-empty__title">你还没有评过任何菜</h3>
        <p className="rhm-empty__desc">
          评分可以帮你记录口味偏好，下次回来就能看到自己的"口味画像"哦
        </p>
        <Link to="/" className="rhm-empty__cta">去看看 →</Link>
      </div>
    )
  }

  if (variant === 'privacy') {
    return (
      <div className="rhm-empty">
        <div className="rhm-empty__icon">🔒</div>
        <h3 className="rhm-empty__title">该用户未公开评分历史</h3>
        <p className="rhm-empty__desc">该用户的评分历史已被设为仅自己可见</p>
      </div>
    )
  }

  // login
  return (
    <div className="rhm-empty">
      <div className="rhm-empty__icon">👤</div>
      <h3 className="rhm-empty__title">登录后查看完整评分历史</h3>
      <p className="rhm-empty__desc">登录后即可查看自己和他人的口味画像</p>
      <div>
        <Link to="/login" className="rhm-empty__cta">登录</Link>
        <Link to="/register" className="rhm-empty__cta rhm-empty__cta--secondary">注册</Link>
      </div>
    </div>
  )
}
