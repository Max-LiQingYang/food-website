import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { CATEGORIES } from '../constants/categories'
import { getCategoryStats, type CategoryStat } from '../api'
import './CategoryCards.css'

export default function CategoryCards() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<CategoryStat[]>([])

  useEffect(() => {
    getCategoryStats()
      .then(setStats)
      .catch(() => {})
  }, [])

  const statMap: Record<string, number> = {}
  stats.forEach(s => { statMap[s.category] = s.recipeCount })

  return (
    <div className="category-cards-wrapper">
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
            {statMap[cat.key] != null && (
              <span className="category-card__count">{statMap[cat.key]}</span>
            )}
          </button>
        ))}
      </div>
      <button className="category-cards__all" onClick={() => navigate('/categories')}>
        <span className="category-cards__all-icon">🌍</span>
        <span className="category-cards__all-label">全部分类</span>
        <span className="category-cards__all-arrow">→</span>
      </button>
    </div>
  )
}
