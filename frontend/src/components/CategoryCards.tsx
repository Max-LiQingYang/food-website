import { useNavigate } from 'react-router-dom'
import './CategoryCards.css'

const CATEGORIES = [
  { key: 'chinese', label: '中餐', icon: '🥟', color: '#e8663e' },
  { key: 'western', label: '西餐', icon: '🥩', color: '#c49a6c' },
  { key: 'japanese', label: '日韩', icon: '🍣', color: '#7ab8b8' },
  { key: 'dessert', label: '甜点', icon: '🍰', color: '#e8a0b4' },
  { key: 'other', label: '其他', icon: '🌍', color: '#8fbc8f' },
]

export default function CategoryCards() {
  const navigate = useNavigate()

  return (
    <div className="category-cards">
      {CATEGORIES.map(cat => (
        <button
          key={cat.key}
          className="category-card"
          style={{ '--cat-color': cat.color } as React.CSSProperties}
          onClick={() => navigate(`/?category=${encodeURIComponent(cat.label)}`)}
        >
          <span className="category-card__icon">{cat.icon}</span>
          <span className="category-card__label">{cat.label}</span>
        </button>
      ))}
    </div>
  )
}