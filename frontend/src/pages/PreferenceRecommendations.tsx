import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getRecommendByPreference, getPreferences, type UserPreferences } from '../api'
import './PreferencesPage.css'

interface RecommendRecipe {
  id: string
  title: string
  description: string
  category: string
  difficulty: string
  cookTime: string
  coverImage: string | null
  qualityScore: number
  qualityLabel: string
}

export default function PreferenceRecommendations() {
  const [recipes, setRecipes] = useState<RecommendRecipe[]>([])
  const [prefs, setPrefs] = useState<UserPreferences | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRecommendations()
  }, [])

  const loadRecommendations = async () => {
    setLoading(true)
    try {
      const prefData = await getPreferences()
      setPrefs(prefData)

      if (prefData.diet || prefData.cuisine || prefData.difficulty || prefData.maxCookTime || prefData.allergies.length > 0 || prefData.excludedIngredients.length > 0) {
        const res = await getRecommendByPreference()
        setRecipes(res.list || [])
        if (prefData) setPrefs(res.preferences || prefData)
      } else {
        setRecipes([])
      }
    } catch {
      setRecipes([])
    } finally {
      setLoading(false)
    }
  }

  const getPreferenceSummary = (): string => {
    if (!prefs) return ''
    const parts: string[] = []
    if (prefs.diet === 'vegetarian') parts.push('素食')
    else if (prefs.diet === 'vegan') parts.push('纯素')
    else if (prefs.diet === 'low-carb') parts.push('低碳水')
    else if (prefs.diet === 'low-calorie') parts.push('低卡')
    else if (prefs.diet === 'gluten-free') parts.push('无麸质')
    if (prefs.cuisine) {
      const cuisineMap: Record<string, string> = {
        chinese: '中餐', western: '西餐', japanese: '日料',
        korean: '韩餐', thai: '泰国菜', indian: '印度菜',
        vietnamese: '越南菜', dessert: '甜品'
      }
      parts.push(cuisineMap[prefs.cuisine] || prefs.cuisine)
    }
    if (prefs.difficulty === 'easy') parts.push('简单')
    else if (prefs.difficulty === 'medium') parts.push('中等')
    if (prefs.maxCookTime) parts.push(`${prefs.maxCookTime}分钟内`)
    if (prefs.allergies.length > 0) parts.push(`避开${prefs.allergies.length}种过敏原`)
    return parts.length > 0 ? parts.join(' · ') : '暂无偏好设置'
  }

  return (
    <div className="pref-page">
      <h1 className="pref-title">🍽️ 个性化推荐</h1>
      <p className="pref-subtitle">基于你的饮食偏好：{getPreferenceSummary()}</p>

      <div className="pref-actions" style={{ marginBottom: 20 }}>
        <Link to="/preferences" className="btn btn--ghost">⚙️ 修改偏好</Link>
        <button className="btn btn--primary" onClick={loadRecommendations} disabled={loading}>
          {loading ? '⏳ 加载中...' : '🔄 刷新推荐'}
        </button>
      </div>

      {loading ? (
        <div className="pref-recommend-grid">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="recipe-card--skeleton">
              <div className="skeleton-box" style={{ height: 140 }} />
              <div className="skeleton-box" style={{ height: 20, width: '70%', margin: '12px 12px 8px' }} />
              <div className="skeleton-box" style={{ height: 14, width: '50%', margin: '0 12px 12px' }} />
            </div>
          ))}
        </div>
      ) : recipes.length === 0 ? (
        <div className="pref-empty">
          <div className="empty-icon">🍳</div>
          <p className="empty-text">暂无符合偏好的推荐</p>
          <p className="empty-hint">
            请先在<a href="/preferences">偏好设置</a>页面设置你的饮食偏好
          </p>
        </div>
      ) : (
        <div className="pref-recommend-grid">
          {recipes.map(r => (
            <Link key={r.id} to={`/recipe/${r.id}`} className="pref-recipe-card">
              <div className="pref-recipe-cover">
                {r.coverImage ? (
                  <img src={r.coverImage} alt={r.title} />
                ) : (
                  <div className="pref-recipe-placeholder">🍽️</div>
                )}
              </div>
              <div className="pref-recipe-body">
                <h3 className="pref-recipe-title">{r.title}</h3>
                <div className="pref-recipe-meta">
                  {r.category && <span className="pref-recipe-tag">{r.category}</span>}
                  {r.difficulty && <span className="pref-recipe-tag">{r.difficulty}</span>}
                  {r.qualityLabel && (
                    <span className={`pref-recipe-tag pref-recipe-tag--${r.qualityLabel === '热门' ? 'hot' : r.qualityLabel === '高分' ? 'top' : 'normal'}`}>
                      {r.qualityLabel}
                    </span>
                  )}
                </div>
                {r.description && (
                  <p className="pref-recipe-desc">{r.description.slice(0, 60)}...</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}