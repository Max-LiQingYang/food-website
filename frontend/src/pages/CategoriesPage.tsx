import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CATEGORIES, CATEGORY_LABELS, CATEGORY_ICONS, CATEGORY_COLORS } from '../constants/categories'
import { getCategoryStats, type CategoryStat } from '../api'
import PageSkeleton from '../components/PageSkeleton'
import './CategoriesPage.css'

export default function CategoriesPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<CategoryStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCategoryStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const statMap: Record<string, CategoryStat> = {}
  stats.forEach(s => { statMap[s.category] = s })

  return (
    <div className="categories-page">
      <div className="categories-page__hero">
        <h1 className="categories-page__title">🌍 美食分类</h1>
        <p className="categories-page__subtitle">84 道食谱 · 10 大菜系 · 探索世界风味</p>
      </div>

      {loading ? (
        <div className="categories-page__grid">
          {CATEGORIES.map(cat => (
            <div key={cat.key} className="categories-page__card-skeleton">
              <div className="categories-page__card-skeleton-bg" />
              <div className="categories-page__card-skeleton-line" />
              <div className="categories-page__card-skeleton-line short" />
            </div>
          ))}
        </div>
      ) : (
        <div className="categories-page__grid">
          {CATEGORIES.map((cat, idx) => {
            const st = statMap[cat.key]
            const total = st?.difficulty
              ? st.difficulty.easy + st.difficulty.medium + st.difficulty.hard
              : 0
            const easyPct = total > 0 ? (st!.difficulty.easy / total) * 100 : 0
            const mediumPct = total > 0 ? (st!.difficulty.medium / total) * 100 : 0
            const hardPct = total > 0 ? (st!.difficulty.hard / total) * 100 : 0

            return (
              <div
                key={cat.key}
                className="categories-page__card"
                style={{
                  '--cat-color': cat.color,
                  animationDelay: `${idx * 0.06}s`,
                } as React.CSSProperties}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/category/${cat.key}`)}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/category/${cat.key}`) }}
              >
                {/* 大背景 */}
                <div className="categories-page__card-bg">
                  <div className="categories-page__card-bg-glow" />
                  <span className="categories-page__card-bg-icon">{cat.icon}</span>
                </div>

                {/* 内容 */}
                <div className="categories-page__card-body">
                  <div className="categories-page__card-header">
                    <span className="categories-page__card-icon">{cat.icon}</span>
                    <div className="categories-page__card-title-row">
                      <h2 className="categories-page__card-title">{cat.label}</h2>
                      {st && (
                        <span className="categories-page__card-count">
                          {st.recipeCount} 道
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="categories-page__card-desc">{cat.description}</p>

                  {/* 难度分布条 */}
                  {st && total > 0 && (
                    <div className="categories-page__difficulty">
                      <div className="categories-page__difficulty-bar">
                        <div
                          className="categories-page__difficulty-segment categories-page__difficulty-segment--easy"
                          style={{ width: `${Math.max(easyPct, 2)}%` }}
                          title={`简单: ${st.difficulty.easy} 道`}
                        />
                        <div
                          className="categories-page__difficulty-segment categories-page__difficulty-segment--medium"
                          style={{ width: `${Math.max(mediumPct, 2)}%` }}
                          title={`中等: ${st.difficulty.medium} 道`}
                        />
                        <div
                          className="categories-page__difficulty-segment categories-page__difficulty-segment--hard"
                          style={{ width: `${Math.max(hardPct, 2)}%` }}
                          title={`困难: ${st.difficulty.hard} 道`}
                        />
                      </div>
                      <div className="categories-page__difficulty-labels">
                        <span className="categories-page__difficulty-label">🟢 简单 {st.difficulty.easy}</span>
                        <span className="categories-page__difficulty-label">🟡 中等 {st.difficulty.medium}</span>
                        <span className="categories-page__difficulty-label">🔴 困难 {st.difficulty.hard}</span>
                      </div>
                    </div>
                  )}

                  {/* 统计行 */}
                  {st && (
                    <div className="categories-page__stats">
                      {st.avgCookTime > 0 && (
                        <span className="categories-page__stat">
                          ⏱️ {st.avgCookTime}分钟
                        </span>
                      )}
                      {st.avgRating > 0 && (
                        <span className="categories-page__stat">
                          ⭐ {st.avgRating}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Top 标签 */}
                  {st && st.topTags && st.topTags.length > 0 && (
                    <div className="categories-page__tags">
                      {st.topTags.map(tag => (
                        <span key={tag} className="categories-page__tag">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
