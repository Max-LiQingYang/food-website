import { DashboardSuggestions } from '../../api'

interface SuggestionsProps {
  suggestions: DashboardSuggestions
}

export default function Suggestions({ suggestions }: SuggestionsProps) {
  const { untriedCuisines, nutrientGap, notCookedFavorites } = suggestions
  const hasAny = untriedCuisines.length > 0 || nutrientGap || notCookedFavorites.length > 0

  if (!hasAny) {
    return (
      <div className="dashboard-card suggestions-section">
        <h3 className="dashboard-card__title">✨ 为你推荐</h3>
        <div className="chart-empty">
          <span className="chart-empty__icon">🌟</span>
          <p className="chart-empty__text">开始烹饪之旅，发现更多推荐</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-card suggestions-section">
      <h3 className="dashboard-card__title">✨ 为你推荐</h3>
      <div className="suggestions__grid">
        <div className="suggestions__left">
          {untriedCuisines.length > 0 && (
            <div className="suggestion-block">
              <div className="suggestion-block__title">💡 试试这些菜系</div>
              <div className="untried-tags">
                {untriedCuisines.map((c, i) => (
                  <a key={i} href={c.link} className="untried-tag">
                    {c.name}
                  </a>
                ))}
              </div>
            </div>
          )}

          {nutrientGap && (
            <div className="suggestion-block nutrient-gap-card">
              <div className="nutrient-gap-card__header">
                🥩 {nutrientGap.nutrientLabel}摄入偏低
              </div>
              <div className="nutrient-gap-card__bar">
                <div className="nutrient-gap-card__bar-bg">
                  <div
                    className="nutrient-gap-card__bar-fill"
                    style={{ width: `${Math.min(nutrientGap.currentPct, 100)}%` }}
                  />
                </div>
                <span className="nutrient-gap-card__pct">{nutrientGap.currentPct}% / 100%</span>
              </div>
              {nutrientGap.recommendedRecipe && (
                <a href={`/recipe/${nutrientGap.recommendedRecipe.id}`} className="nutrient-gap-card__recipe">
                  <span className="nutrient-gap-card__recipe-title">{nutrientGap.recommendedRecipe.title}</span>
                  <span className="nutrient-gap-card__recipe-arrow">查看 →</span>
                </a>
              )}
            </div>
          )}
        </div>

        {notCookedFavorites.length > 0 && (
          <div className="suggestions__right">
            <div className="suggestion-block__title">📌 收藏但还没做过</div>
            <div className="not-cooked-scroll">
              {notCookedFavorites.map((r) => (
                <a key={r.id} href={`/recipe/${r.id}`} className="not-cooked-card">
                  <div
                    className="not-cooked-card__img"
                    style={{
                      backgroundImage: r.coverImage ? `url(${r.coverImage})` : undefined,
                    }}
                  >
                    {!r.coverImage && <span>🍽️</span>}
                  </div>
                  <div className="not-cooked-card__title">{r.title}</div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
