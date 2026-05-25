import { useState, useEffect } from 'react'
import { getDashboard, DashboardData } from '../api'
import { useToast } from '../context/ToastContext'
import './DashboardPage.css'

export default function DashboardPage() {
  const { showToast } = useToast()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch(() => showToast('加载统计数据失败', 'error'))
      .finally(() => setLoading(false))
  }, [showToast])

  if (loading) return (
    <div className="dashboard-page">
      <div className="dashboard-loading">
        {[1,2,3,4].map(i => <div key={i} className="skeleton-box" style={{ height: 120, borderRadius: 12, marginBottom: 16 }} />)}
      </div>
    </div>
  )

  if (!data) return (
    <div className="dashboard-page">
      <div className="dashboard-empty"><p>无法加载统计数据</p></div>
    </div>
  )

  const { basic, viewTrend, favTrend, ratingDistribution, wordCloud, topRecipes } = data

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        <h1 className="dashboard-title">作者统计仪表板</h1>

        {/* Summary Cards */}
        <div className="dashboard-summary">
          {[
            { label: '总食谱', value: basic.totalRecipes, icon: '📝', color: '#4CAF50' },
            { label: '总浏览', value: basic.totalViews.toLocaleString(), icon: '👁️', color: '#2196F3' },
            { label: '总收藏', value: basic.totalFavorites.toLocaleString(), icon: '❤️', color: '#E91E63' },
            { label: '总评论', value: basic.totalComments.toLocaleString(), icon: '💬', color: '#FF9800' },
            { label: '总积分', value: basic.totalPoints.toLocaleString(), icon: '⭐', color: '#9C27B0' },
          ].map((card, i) => (
            <div key={i} className="dashboard-stat-card" style={{ borderTop: `3px solid ${card.color}` }}>
              <div className="stat-icon">{card.icon}</div>
              <div className="stat-value">{card.value}</div>
              <div className="stat-label">{card.label}</div>
            </div>
          ))}
        </div>

        {/* View Trend */}
        <div className="dashboard-section">
          <h2>浏览量趋势 (近30天)</h2>
          <div className="trend-chart">
            {viewTrend.map((day, i) => (
              <div key={i} className="trend-bar-wrapper" title={`${day.date}: ${day.views} 次浏览`}>
                <div className="trend-bar" style={{
                  height: Math.max(3, (day.views / Math.max(...viewTrend.map(d => d.views), 1)) * 80) + 'px'
                }} />
              </div>
            ))}
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="dashboard-section">
          <h2>评分分布</h2>
          <div className="rating-dist">
            {[5, 4, 3, 2, 1].map(star => {
              const count = ratingDistribution[star as keyof typeof ratingDistribution] || 0
              const maxVal = Math.max(...Object.values(ratingDistribution), 1)
              return (
                <div key={star} className="rating-bar-row">
                  <span className="rating-label">{'★'.repeat(star)}</span>
                  <div className="rating-bar-bg">
                    <div className="rating-bar-fill" style={{
                      width: (count / maxVal * 100) + '%',
                      background: star >= 4 ? '#4CAF50' : star >= 3 ? '#FF9800' : '#f44336'
                    }} />
                  </div>
                  <span className="rating-count">{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Word Cloud */}
        {wordCloud.length > 0 && (
          <div className="dashboard-section">
            <h2>评论关键词</h2>
            <div className="word-cloud">
              {wordCloud.map((w, i) => (
                <span key={i} className="word-cloud-tag" style={{
                  fontSize: Math.max(12, Math.min(24, 12 + w.value * 2)) + 'px',
                  opacity: Math.max(0.4, Math.min(1, 0.4 + w.value * 0.1))
                }}>
                  {w.text}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Top Recipes */}
        {topRecipes.length > 0 && (
          <div className="dashboard-section">
            <h2>热门食谱排行</h2>
            <div className="top-recipes">
              {topRecipes.map((r, i) => (
                <div key={r.id} className="top-recipe-row">
                  <span className="top-recipe-rank">#{i + 1}</span>
                  <span className="top-recipe-title">{r.title}</span>
                  <span className="top-recipe-stats">
                    <span title="浏览量">👁️ {r.views}</span>
                    <span title="收藏">❤️ {r.favorites}</span>
                    <span title="积分">⭐ {r.points}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}