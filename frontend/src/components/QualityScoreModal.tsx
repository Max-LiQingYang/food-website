import React, { useState, useEffect } from 'react'
import { getQualityDetails, QualityDetailsData } from '../api'
import './QualityScoreModal.css'

interface QualityScoreModalProps {
  recipeId: string
  recipeTitle: string
  onClose: () => void
}

function getScoreColor(score: number, maxScore: number): string {
  const ratio = score / maxScore
  if (ratio >= 0.8) return 'score-excellent'
  if (ratio >= 0.6) return 'score-good'
  if (ratio >= 0.4) return 'score-average'
  if (ratio >= 0.2) return 'score-poor'
  return 'score-bad'
}

function getFillColor(ratio: number): string {
  if (ratio >= 0.8) return '#2e7d32'
  if (ratio >= 0.6) return '#f57f17'
  if (ratio >= 0.4) return '#e65100'
  if (ratio >= 0.2) return '#c62828'
  return '#b71c1c'
}

const QualityScoreModal: React.FC<QualityScoreModalProps> = ({ recipeId, recipeTitle, onClose }) => {
  const [data, setData] = useState<QualityDetailsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    getQualityDetails(recipeId)
      .then(d => {
        setData(d)
        setLoading(false)
      })
      .catch(() => {
        setError('加载失败')
        setLoading(false)
      })
  }, [recipeId])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onClose])

  return (
    <div className="quality-score-overlay" onClick={onClose}>
      <div className="quality-score-modal" onClick={e => e.stopPropagation()}>
        <div className="quality-score-header">
          <h3>📊 食谱质量评分</h3>
          <button className="quality-close-btn" onClick={onClose} aria-label="关闭">×</button>
        </div>

        {loading && <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>加载中...</p>}
        {error && <p style={{ textAlign: 'center', color: '#c62828' }}>{error}</p>}

        {data && (
          <>
            <div className="quality-overall">
              <div className="quality-overall-score">
                <span className={getScoreColor(data.overall.score, data.overall.maxScore)}>
                  {data.overall.score}
                </span>
              </div>
              <div className="quality-overall-label">{data.overall.label}</div>
              <div className="quality-overall-max">满分 {data.overall.maxScore} 分</div>
            </div>

            {/* 食材完整度 */}
            <div className="quality-dimension">
              <div className="quality-dimension-header">
                <span className="quality-dimension-name">🛒 食材完整度</span>
                <span className="quality-dimension-score">
                  {data.ingredientCompleteness.score}/{data.ingredientCompleteness.maxScore}
                </span>
              </div>
              <div className="quality-progress-bar">
                <div
                  className="quality-progress-fill"
                  style={{
                    width: `${(data.ingredientCompleteness.score / data.ingredientCompleteness.maxScore) * 100}%`,
                    background: getFillColor(data.ingredientCompleteness.score / data.ingredientCompleteness.maxScore),
                  }}
                />
              </div>
              <div className="quality-dimension-detail">{data.ingredientCompleteness.detail}</div>
            </div>

            {/* 步骤清晰度 */}
            <div className="quality-dimension">
              <div className="quality-dimension-header">
                <span className="quality-dimension-name">👨‍🍳 步骤清晰度</span>
                <span className="quality-dimension-score">
                  {data.stepClarity.score}/{data.stepClarity.maxScore}
                </span>
              </div>
              <div className="quality-progress-bar">
                <div
                  className="quality-progress-fill"
                  style={{
                    width: `${(data.stepClarity.score / data.stepClarity.maxScore) * 100}%`,
                    background: getFillColor(data.stepClarity.score / data.stepClarity.maxScore),
                  }}
                />
              </div>
              <div className="quality-dimension-detail">{data.stepClarity.detail}</div>
            </div>

            {/* 营养信息 */}
            <div className="quality-dimension">
              <div className="quality-dimension-header">
                <span className="quality-dimension-name">📊 营养信息完整度</span>
                <span className="quality-dimension-score">
                  {data.nutritionInfo.score}/{data.nutritionInfo.maxScore}
                </span>
              </div>
              <div className="quality-progress-bar">
                <div
                  className="quality-progress-fill"
                  style={{
                    width: `${(data.nutritionInfo.score / data.nutritionInfo.maxScore) * 100}%`,
                    background: getFillColor(data.nutritionInfo.score / data.nutritionInfo.maxScore),
                  }}
                />
              </div>
              <div className="quality-dimension-detail">{data.nutritionInfo.detail}</div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default QualityScoreModal