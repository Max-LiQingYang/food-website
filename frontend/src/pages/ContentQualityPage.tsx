import { useState, useEffect, useCallback } from 'react'
import { getContentQualityReport, ContentQualityReport } from '../api'
import './ContentQualityPage.css'
import PageSkeleton from '../components/PageSkeleton'

const FIELD_META: Record<string, { label: string; icon: string }> = {
  coverImage: { label: '封面', icon: '🖼️' },
  ingredients: { label: '食材', icon: '🥘' },
  steps: { label: '步骤', icon: '📋' },
  nutrition: { label: '营养', icon: '💪' },
  story: { label: '故事', icon: '📖' },
  culturalBackground: { label: '文化', icon: '🌏' },
  tips: { label: '贴士', icon: '💡' },
  video: { label: '视频', icon: '🎬' },
}

const FIELD_KEYS = Object.keys(FIELD_META)

function getCoverageClass(pct: number): string {
  if (pct >= 99.9) return 'coverage-card--is-100'
  if (pct >= 80) return 'coverage-card--is-ok'
  return 'coverage-card--is-low'
}

function getScoreTier(score: number): 'high' | 'mid' | 'low' {
  if (score > 5) return 'high'
  if (score > 3) return 'mid'
  return 'low'
}

function getBarColorClass(score: number): string {
  if (score >= 8) return 'bar-score-8'
  if (score >= 7) return 'bar-score-7'
  if (score >= 6) return 'bar-score-6'
  if (score >= 5) return 'bar-score-5'
  if (score >= 4) return 'bar-score-4'
  if (score >= 3) return 'bar-score-3'
  return 'bar-score-2'
}

function SkeletonContent() {
  return (
    <div className="cq-skeleton">
      <div className="cq-section">
        <div className="cq-section-title cq-skeleton-bar" style={{ width: '120px', height: '24px' }} />
        <div className="cq-skeleton-grid">
          {FIELD_KEYS.map((_, i) => (
            <div key={i} className="cq-skeleton-card" />
          ))}
        </div>
      </div>
      <div className="cq-section">
        <div className="cq-section-title cq-skeleton-bar" style={{ width: '100px', height: '24px' }} />
        <div className="cq-skeleton-bars">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="cq-skeleton-bar" />
          ))}
        </div>
      </div>
      <div className="cq-section">
        <div className="cq-section-title cq-skeleton-bar" style={{ width: '140px', height: '24px' }} />
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="cq-skeleton-bar" style={{ height: '40px' }} />
        ))}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="cq-empty">
      <div className="cq-empty__icon">📊</div>
      <p className="cq-empty__title">还没有食谱数据</p>
      <p className="cq-empty__desc">系统暂无食谱内容，请先创建食谱。</p>
    </div>
  )
}

export default function ContentQualityPage() {
  const [data, setData] = useState<ContentQualityReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const report = await getContentQualityReport()
      setData(report)
    } catch (err: any) {
      setError(err.message || '获取数据失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const fieldCoverageEntries = data
    ? FIELD_KEYS.map((key, index) => ({
        fieldKey: key,
        fieldLabel: FIELD_META[key].label,
        fieldIcon: FIELD_META[key].icon,
        count: data.fieldCoverage[key]?.count ?? 0,
        pct: data.fieldCoverage[key]?.pct ?? 0,
        delay: index * 80,
      }))
    : []

  const distributionEntries = data
    ? Object.entries(data.overallScore.distribution)
        .sort((a, b) => {
          const scoreA = parseInt(a[0]) || 0
          const scoreB = parseInt(b[0]) || 0
          return scoreB - scoreA
        })
        .map(entry => {
          const score = parseInt(entry[0]) || 0
          const maxCount = Math.max(...Object.values(data.overallScore.distribution), 1)
          return {
            score,
            label: `${score}分`,
            count: entry[1],
            barWidthPct: (entry[1] / maxCount) * 100,
          }
        })
    : []

  return (
    <div className="content-quality-page">
      <div className="cq-header">
        <h1>内容质量巡检</h1>
        <button
          className={`cq-refresh-btn${loading ? ' is-spinning' : ''}`}
          onClick={fetchData}
          disabled={loading}
          aria-label="刷新"
          title="刷新数据"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
      </div>

      {loading ? (
        <PageSkeleton type="detail" />
      ) : error ? (
        <div className="cq-empty">
          <div className="cq-empty__icon">⚠️</div>
          <p className="cq-empty__title">加载失败</p>
          <p className="cq-empty__desc">{error}</p>
        </div>
      ) : data && data.totalRecipes === 0 ? (
        <EmptyState />
      ) : data ? (
        <>
          {/* Section 1: 覆盖率卡片网格 */}
          <div className="cq-section">
            <h2 className="cq-section-title">覆盖率总览</h2>
            <div className="cq-coverage-grid">
              {fieldCoverageEntries.map(entry => (
                <div
                  key={entry.fieldKey}
                  className={`coverage-card ${getCoverageClass(entry.pct)}`}
                  style={{ animationDelay: `${entry.delay}ms` }}
                >
                  <span className="coverage-card__icon">{entry.fieldIcon}</span>
                  <span className="coverage-card__label">{entry.fieldLabel}</span>
                  <span className="coverage-card__percentage">{entry.pct}%</span>
                  <div className="coverage-card__progress">
                    <div
                      className="coverage-card__progress-fill"
                      style={{ width: `${entry.pct}%` }}
                    />
                  </div>
                  <span className="coverage-card__count">
                    {entry.count}/{data.totalRecipes}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: 质量分布 */}
          <div className="cq-section">
            <h2 className="cq-section-title">质量分布</h2>
            <div className="cq-distribution-list">
              {distributionEntries.map(entry => (
                <div key={entry.score} className="cq-distribution-bar">
                  <div className="cq-distribution-bar__track">
                    <div
                      className={`cq-distribution-bar__fill animate ${getBarColorClass(entry.score)}`}
                      style={{
                        '--bar-width': `${entry.barWidthPct}%`,
                        background: `var(--bar-color, #E8663E)`,
                      } as React.CSSProperties}
                    />
                  </div>
                  <span className="cq-distribution-bar__label">
                    {entry.label}({entry.count})
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: 质量最低 10 道食谱 */}
          {data.bottomRecipes.length > 0 && (
            <div className="cq-section">
              <h2 className="cq-section-title">质量最低 10 道食谱</h2>
              <div className="cq-table-wrapper">
                <table className="cq-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>食谱名</th>
                      <th>得分</th>
                      <th>缺失字段</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.bottomRecipes.map((recipe, index) => (
                      <tr key={recipe.id}>
                        <td className="cq-table__rank">{index + 1}</td>
                        <td>
                          <a
                            className="cq-table__title"
                            href={`/recipe/${recipe.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {recipe.title}
                          </a>
                        </td>
                        <td className="cq-table__score">
                          <span className={`score-badge score-badge--${getScoreTier(recipe.score)}`}>
                            {recipe.score}
                          </span>
                        </td>
                        <td>
                          <div className="cq-table__missing-fields">
                            {recipe.missingFields.map(field => (
                              <span
                                key={field}
                                className="missing-field-tag"
                                data-field={field}
                                title={FIELD_META[field]?.label || field}
                              >
                                {FIELD_META[field]?.label || field}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
