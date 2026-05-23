import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getSeasonalRecipes } from '../api'
import type { Recipe } from '../api'
import './SeasonalRecommendations.css'

const SEASON_OPTIONS = [
  { value: 'spring', label: '🌺 春季' },
  { value: 'summer', label: '☀️ 夏季' },
  { value: 'autumn', label: '🍂 秋季' },
  { value: 'winter', label: '❄️ 冬季' },
]

function guessSeason(): string {
  const month = new Date().getMonth() + 1
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'autumn'
  return 'winter'
}

export default function SeasonalRecommendations() {
  const [season, setSeason] = useState(guessSeason())
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    getSeasonalRecipes(season)
      .then((res: any) => {
        const data = res.data || res
        if (!cancelled) setRecipes(data.list || [])
      })
      .catch(() => {
        if (!cancelled) setRecipes([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [season])

  return (
    <section className="seasonal-rec">
      <div className="seasonal-rec__header">
        <h2 className="seasonal-rec__title">🍆 应季食材推荐</h2>
        <div className="seasonal-rec__tabs">
          {SEASON_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`seasonal-rec__tab ${opt.value === season ? 'seasonal-rec__tab--active' : ''}`}
              onClick={() => setSeason(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="seasonal-rec__scroll">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="seasonal-rec__card seasonal-rec__card--skeleton">
              <div className="skeleton-box" style={{ height: 120 }} />
              <div className="seasonal-rec__card-info">
                <div className="skeleton-box" style={{ height: 14, width: '80%' }} />
                <div className="skeleton-box" style={{ height: 12, width: '50%', marginTop: 6 }} />
              </div>
            </div>
          ))}
        </div>
      ) : recipes.length === 0 ? (
        <p className="seasonal-rec__empty">暂无应季食谱推荐</p>
      ) : (
        <div className="seasonal-rec__scroll">
          {recipes.map(recipe => (
            <Link
              key={recipe.id}
              to={`/recipe/${recipe.id}`}
              className="seasonal-rec__card"
            >
              <div className="seasonal-rec__card-img">
                {recipe.coverImage ? (
                  <img src={recipe.coverImage} alt={recipe.title} loading="lazy" />
                ) : (
                  <div className="seasonal-rec__card-placeholder">🍆</div>
                )}
              </div>
              <div className="seasonal-rec__card-info">
                <h4 className="seasonal-rec__card-title">{recipe.title}</h4>
                <div className="seasonal-rec__card-meta">
                  {recipe.cookTime != null && (
                    <span className="seasonal-rec__card-tag">⏱ {recipe.cookTime}分钟</span>
                  )}
                  {recipe.category && (
                    <span className="seasonal-rec__card-tag">{recipe.category}</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}