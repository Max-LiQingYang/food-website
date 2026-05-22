import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { recommendRecipes } from '../api'
import RecipeCard from '../components/RecipeCard'
import type { RecommendRecipe } from '../api'
import './RecommendPage.css'

export default function RecommendPage() {
  const [input, setInput] = useState('')
  const [results, setResults] = useState<RecommendRecipe[]>([])
  const [aiRecipes, setAiRecipes] = useState<any[]>([])
  const [aiGenerated, setAiGenerated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    setLoading(true)
    setSearched(true)
    try {
      const res: any = await recommendRecipes(input.trim())
      setResults(res.list || [])
      setAiRecipes(res.aiRecipes || [])
      setAiGenerated(res.aiGenerated || false)
    } catch {
      setResults([])
      setAiRecipes([])
      setAiGenerated(false)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="recommend-page">
      <div className="recommend-hero">
        <h1 className="recommend-hero__title">🥘 食材推荐菜谱</h1>
        <p className="recommend-hero__subtitle">输入你手头有的食材，看看能做什么菜</p>

        <form className="recommend-form" onSubmit={handleSubmit}>
          <div className="recommend-input-wrapper">
            <span className="recommend-input-icon">🥬</span>
            <input
              type="text"
              className="recommend-input"
              placeholder="输入食材，用逗号或空格分隔，如：鸡蛋、番茄、洋葱"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button type="submit" className="recommend-submit" disabled={loading || !input.trim()}>
              {loading ? '🧪 分析中...' : '🔍 推荐菜谱'}
            </button>
          </div>

          {/* 快捷示例标签 */}
          <div className="recommend-samples">
            {['鸡蛋、番茄', '鸡肉、土豆', '豆腐、青菜', '牛肉、洋葱'].map(tag => (
              <button
                key={tag}
                type="button"
                className="recommend-sample-tag"
                onClick={() => {
                  setInput(tag)
                  setSearched(false)
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        </form>
      </div>

      <div className="recommend-results">
        {/* 加载态 */}
        {loading && (
          <div className="recommend-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="recipe-card recipe-card--skeleton">
                <div className="recipe-card__cover skeleton-box" />
                <div className="recipe-card__info">
                  <div className="skeleton-box skeleton-box--title" />
                  <div className="skeleton-box skeleton-box--meta" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 数据库匹配结果 */}
        {!loading && results.length > 0 && (
          <>
            <h2 className="recommend-section-title">📖 找到 {results.length} 个匹配食谱</h2>
            <div className="recommend-grid">
              {results.map(recipe => (
                <Link key={recipe.id} to={`/recipe/${recipe.id}`} className="recommend-card-link">
                  <div className="recommend-card">
                    <div className="recommend-card__cover">
                      {recipe.coverImage ? (
                        <img src={recipe.coverImage} alt={recipe.title} />
                      ) : (
                        <div className="recommend-card__placeholder">🍽️</div>
                      )}
                    </div>
                    <div className="recommend-card__body">
                      <span
                        className={`recommend-badge recommend-badge--${recipe.matchScore >= 80 ? 'high' : recipe.matchScore >= 50 ? 'mid' : 'low'}`}
                      >
                        {recipe.matchScore}% 匹配
                      </span>
                      <h3 className="recommend-card__title">{recipe.title}</h3>
                      <p className="recommend-card__desc">{recipe.description}</p>
                      <div className="recommend-card__meta">
                        {recipe.cookTime && <span>⏱ {recipe.cookTime}分钟</span>}
                        {recipe.difficulty && (
                          <span>
                            {recipe.difficulty === 'easy'
                              ? '简单'
                              : recipe.difficulty === 'medium'
                                ? '中等'
                                : '困难'}
                          </span>
                        )}
                      </div>
                      <div className="recommend-card__tags">
                        {recipe.matchedIngredients.map(tag => (
                          <span key={tag} className="recommend-tag">
                            ✅ {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* AI 推荐结果 */}
        {!loading && aiGenerated && aiRecipes.length > 0 && (
          <>
            <h2 className="recommend-section-title recommend-section-title--ai">
              🤖 AI 智能推荐菜谱
            </h2>
            <p className="recommend-ai-hint">
              数据库中没有完全匹配的食谱，以下由 AI 根据你的食材智能生成
            </p>
            <div className="recommend-grid">
              {aiRecipes.map((recipe, idx) => (
                <div key={idx} className="recommend-card recommend-card--ai">
                  <div className="recommend-card__cover recommend-card__cover--ai">
                    <div className="recommend-card__placeholder">🤖</div>
                  </div>
                  <div className="recommend-card__body">
                    <span className="recommend-badge recommend-badge--ai">AI 推荐</span>
                    <h3 className="recommend-card__title">🍳 {recipe.title}</h3>
                    <p className="recommend-card__desc">{recipe.description}</p>
                    <div className="recommend-card__meta">
                      {recipe.cookTime && <span>⏱ {recipe.cookTime}分钟</span>}
                      {recipe.difficulty && (
                        <span>
                          {recipe.difficulty === 'easy'
                            ? '简单'
                            : recipe.difficulty === 'medium'
                              ? '中等'
                              : '困难'}
                        </span>
                      )}
                      {recipe.servings && <span>👥 {recipe.servings}人份</span>}
                    </div>
                    <div className="recommend-card__tags">
                      {recipe.ingredients?.map((ing: any, i: number) => (
                        <span key={i} className="recommend-tag recommend-tag--ai">
                          {ing.name} {ing.amount}
                          {ing.unit}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 无结果（数据库 + AI 都没有） */}
        {!loading && searched && results.length === 0 && !aiGenerated && (
          <div className="recommend-empty">
            <div className="recommend-empty__icon">🥗</div>
            <p className="recommend-empty__text">没有找到匹配的食谱</p>
            <p className="recommend-empty__hint">
              试试其他食材组合，如「鸡蛋、番茄」「鸡肉、土豆」
            </p>
          </div>
        )}

        {/* 初始状态 */}
        {!searched && !loading && (
          <div className="recommend-empty">
            <div className="recommend-empty__icon">🔎</div>
            <p className="recommend-empty__text">输入食材开始探索</p>
            <p className="recommend-empty__hint">系统会从已有食谱中匹配，AI 也会帮你推荐创意菜式</p>
          </div>
        )}
      </div>
    </div>
  )
}
