import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getSimilarRecipes, getRecipes } from '../api'
import type { Recipe, SimilarRecipe } from '../api'
import './SimilarRecipes.css'

interface SimilarRecipesProps {
  recipeId: string
}

const NUTRI_SCORE_COLORS: Record<string, string> = {
  A: '#22c55e',
  B: '#86efac',
  C: '#eab308',
  D: '#f97316',
  E: '#ef4444',
}

export default function SimilarRecipes({ recipeId }: SimilarRecipesProps) {
  const [recipes, setRecipes] = useState<SimilarRecipe[]>([])
  const [loading, setLoading] = useState(true)
  const [useNewAPI, setUseNewAPI] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function fetchSimilar() {
      if (!recipeId) return
      try {
        const res: any = await getSimilarRecipes(recipeId)
        const data = res.data || res
        const list = (data.list || []).slice(0, 5).map((item: any) =>
          item.recipe ? item : { recipe: item, similarity: 0 }
        )
        if (!cancelled) {
          setRecipes(list)
          setUseNewAPI(true)
        }
      } catch {
        // Fallback: 老 API 随机推荐
        if (!cancelled) {
          setUseNewAPI(false)
          try {
            const fallback: any = await getRecipes({ page: 1, pageSize: 5 })
            const fd = fallback.data || fallback
            const fallbackList = (fd.list || [])
              .filter((r: Recipe) => r.id !== recipeId)
              .slice(0, 4)
              .map((r: Recipe) => ({ recipe: r, similarity: 0 }))
            setRecipes(fallbackList)
          } catch {
            setRecipes([])
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchSimilar()
    return () => { cancelled = true }
  }, [recipeId])

  if (!loading && recipes.length === 0) return null

  return (
    <section className="similar-recipes">
      <h2 className="similar-recipes__title">📋 相似食谱推荐</h2>

      {loading ? (
        <div className="similar-recipes__scroll">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="similar-recipes__card similar-recipes__card--skeleton">
              <div className="skeleton-box similar-recipes__card-img" />
              <div className="similar-recipes__card-info">
                <div className="skeleton-box" style={{ height: 14, width: '80%' }} />
                <div className="skeleton-box" style={{ height: 12, width: '50%', marginTop: 6 }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="similar-recipes__scroll">
          {recipes.map((item, idx) => {
            const recipe = item.recipe
            const sim = item.similarity

            return (
              <Link
                key={recipe.id || idx}
                to={`/recipe/${recipe.id}`}
                className="similar-recipes__card"
              >
                <div className="similar-recipes__card-img">
                  {recipe.coverImage ? (
                    <img src={recipe.coverImage} alt={recipe.title} loading="lazy" />
                  ) : (
                    <div className="similar-recipes__card-placeholder">🍽️</div>
                  )}
                </div>
                <div className="similar-recipes__card-info">
                  <h4 className="similar-recipes__card-title">
                    {recipe.title}
                    {recipe.nutriScore && (
                      <span
                        className="nutri-badge-mini"
                        style={{ backgroundColor: NUTRI_SCORE_COLORS[recipe.nutriScore] || '#aaa' }}
                      >
                        {recipe.nutriScore}
                      </span>
                    )}
                  </h4>
                  <div className="similar-recipes__card-meta">
                    {sim > 0 && useNewAPI && (
                      <span className="similar-recipes__sim-bar">
                        <span
                          className="similar-recipes__sim-fill"
                          style={{ width: `${Math.min(sim * 100, 100)}%` }}
                        />
                        <span className="similar-recipes__sim-label">
                          {Math.round(sim * 100)}% 相似
                        </span>
                      </span>
                    )}
                    {recipe.category && (
                      <span className="similar-recipes__card-tag">{recipe.category}</span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}