import { useNavigate } from 'react-router-dom'
import { CATEGORIES } from '../constants/categories'
import './CategoryCards.css'

export default function CategoryCards() {
  const navigate = useNavigate()

  return (
    <div className="category-cards-wrapper">
      {/* 横向滑动容器（移动端） */}
      <div className="category-cards">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            className="category-card"
            style={{ '--cat-color': cat.color } as React.CSSProperties}
            onClick={() => navigate(`/category/${cat.key}`)}
          >
            <span className="category-card__icon">{cat.icon}</span>
            <span className="category-card__label">{cat.label}</span>
          </button>
        ))}
      </div>
      <button className="category-cards__all" onClick={() => navigate('/?category=全部')}>
        <span className="category-cards__all-icon">📋</span>
        <span className="category-cards__all-label">全部分类</span>
      </button>
    </div>
  )
}