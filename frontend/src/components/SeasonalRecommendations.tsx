import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getSeasonalRecipes } from '../api'
import type { Recipe } from '../api'
import './SeasonalRecommendations.css'

// 各季节当令食材
const SEASONAL_INGREDIENTS: Record<string, string[]> = {
  spring: ['🍓 草莓', '🌱 春笋', '🥬 菠菜', '🌿 韭菜', '🥦 西兰花', '🍃 荠菜', '🥚 香椿', '🍊 橙'],
  summer: ['🍅 番茄', '🥒 黄瓜', '🫐 蓝莓', '🍆 茄子', '🌽 玉米', '🫑 青椒', '🧊 绿豆', '🍉 西瓜'],
  autumn: ['🎃 南瓜', '🍠 红薯', '🍄 蘑菇', '🌰 栗子', '🥕 胡萝卜', '🍎 苹果', '🍐 梨', '🥬 白菜'],
  winter: ['🥩 羊肉', '🥟 白萝卜', '🍊 柑橘', '🥬 白菜', '🌶️ 辣椒', '🧄 蒜', '🥕 胡萝卜', '🍲 豆腐'],
}

const SEASON_OPTIONS = [
  { value: 'spring', label: '🌺 春季' },
  { value: 'summer', label: '☀️ 夏季' },
  { value: 'autumn', label: '🍂 秋季' },
  { value: 'winter', label: '❄️ 冬季' },
]

function guessSeason(): string {
  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()
  if (month >= 3 && month <= 5) {
    if (month === 5 && day >= 20) return 'summer'
    return 'spring'
  }
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'autumn'
  return 'winter'
}

export default function SeasonalRecommendations() {
  const [season, setSeason] = useState(guessSeason())
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [transitioning, setTransitioning] = useState(false)
  const prevSeason = useRef(season)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setTransitioning(true)

    getSeasonalRecipes(season)
      .then((res: any) => {
        const data = res.data || res
        if (!cancelled) {
          setRecipes(data.list || [])
        }
      })
      .catch(() => {
        if (!cancelled) setRecipes([])
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
          // 延迟清除 transition 以完成动画
          setTimeout(() => setTransitioning(false), 400)
        }
      })

    prevSeason.current = season
    return () => { cancelled = true }
  }, [season])

  const ingredients = SEASONAL_INGREDIENTS[season] || []

  return (
    <section className="seasonal-rec">
      <div className="seasonal-rec__header">
        <h2 className="seasonal-rec__title">🍆 当季食材推荐</h2>
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

      {/* 当季食材标签云 */}
      <div className="seasonal-rec__ingredients">
        {ingredients.map((item, i) => (
          <span key={i} className="seasonal-rec__ingredient-tag" style={{ animationDelay: `${i * 50}ms` }}>
            {item}
          </span>
        ))}
      </div>

      {loading ? (
        <div className={`seasonal-rec__scroll seasonal-rec__scroll--loading`}>
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
        <p className="seasonal-rec__empty">暂无当季食谱推荐</p>
      ) : (
        <div className={`seasonal-rec__scroll ${transitioning ? 'seasonal-rec__scroll--transition' : ''}`}>
          {recipes.map((recipe, i) => (
            <Link
              key={recipe.id}
              to={`/recipe/${recipe.id}`}
              className={`seasonal-rec__card ${transitioning ? 'seasonal-rec__card--enter' : ''}`}
              style={transitioning ? { animationDelay: `${i * 60}ms` } : undefined}
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