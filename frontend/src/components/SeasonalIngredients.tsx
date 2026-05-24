import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRecipes, type Recipe } from '../api'
import './SeasonalIngredients.css'

/** 夏季时令食材列表 */
const SUMMER_INGREDIENTS = [
  { name: '西瓜', emoji: '🍉', color: '#ff6b6b' },
  { name: '绿豆', emoji: '🫘', color: '#4caf50' },
  { name: '凉面', emoji: '🍜', color: '#ffa726' },
  { name: '冰粉', emoji: '🧊', color: '#7e57c2' },
  { name: '芒果', emoji: '🥭', color: '#ffb300' },
  { name: '苦瓜', emoji: '🥒', color: '#66bb6a' },
  { name: '丝瓜', emoji: '🥬', color: '#43a047' },
  { name: '莲藕', emoji: '🪷', color: '#8d6e63' },
]

export default function SeasonalIngredients() {
  const navigate = useNavigate()
  const [heatMap, setHeatMap] = useState<Record<string, number>>({})

  // Fetch a batch of recipes to analyze ingredients
  useEffect(() => {
    getRecipes({ pageSize: 55 }).then((res: any) => {
      const d = res.data ?? res
      const list: Recipe[] = d.list || []
      
      const counts: Record<string, number> = {}
      for (const ingredient of SUMMER_INGREDIENTS) {
        counts[ingredient.name] = 0
      }
      
      for (const recipe of list) {
        const title = recipe.title
        const desc = recipe.description || ''
        for (const ingredient of SUMMER_INGREDIENTS) {
          if (title.includes(ingredient.name) || desc.includes(ingredient.name)) {
            counts[ingredient.name]++
          }
        }
      }
      setHeatMap(counts)
    }).catch(() => {})
  }, [])

  const handleIngredientClick = (name: string) => {
    navigate(`/search?q=${encodeURIComponent(name)}`)
  }

  return (
    <section className="seasonal-ingredients">
      <h2 className="seasonal-ingredients__title">
        <span className="seasonal-ingredients__icon">☀️</span>
        时令食材推荐
        <span className="seasonal-ingredients__subtitle">夏日当季，新鲜好味</span>
      </h2>
      <div className="seasonal-ingredients__grid">
        {SUMMER_INGREDIENTS.map(item => {
          const count = heatMap[item.name] ?? 0
          return (
            <button
              key={item.name}
              className="seasonal-ingredients__card"
              onClick={() => handleIngredientClick(item.name)}
              style={{ '--card-accent': item.color } as React.CSSProperties}
            >
              <span className="seasonal-ingredients__emoji">{item.emoji}</span>
              <span className="seasonal-ingredients__name">{item.name}</span>
              {count > 0 && (
                <span className="seasonal-ingredients__count">{count}个食谱</span>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}