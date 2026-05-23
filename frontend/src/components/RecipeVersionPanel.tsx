import { useState, useEffect } from 'react'
import { getRecipeVersions } from '../api'
import type { RecipeVersion } from '../api'
import './RecipeVersionPanel.css'

interface Props {
  recipeId: string
}

export default function RecipeVersionPanel({ recipeId }: Props) {
  const [versions, setVersions] = useState<RecipeVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!expanded) return
    setLoading(true)
    getRecipeVersions(recipeId)
      .then(setVersions)
      .catch(() => {}) // 静默失败
      .finally(() => setLoading(false))
  }, [recipeId, expanded])

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const fieldIcon = (field: string) => {
    const icons: Record<string, string> = {
      title: '📝',
      description: '📖',
      ingredients: '🥘',
      steps: '👩‍🍳',
      tips: '💡',
      nutrition: '🥗',
      category: '🏷️',
      difficulty: '⚡',
      cookTime: '⏱️',
      coverImage: '🖼️',
      servings: '🍽️',
    }
    return icons[field] || '🔧'
  }

  return (
    <div className="recipe-version-panel">
      <button
        className="recipe-version-panel__toggle"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span>📜 版本历史</span>
        <span className="recipe-version-panel__arrow">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="recipe-version-panel__body">
          {loading && (
            <div className="recipe-version-panel__loading">
              <div className="version-skeleton-line" />
              <div className="version-skeleton-line" />
              <div className="version-skeleton-line w-60" />
            </div>
          )}

          {!loading && versions.length === 0 && (
            <div className="recipe-version-panel__empty">
              暂无版本记录
            </div>
          )}

          {!loading && versions.length > 0 && (
            <div className="recipe-version-panel__timeline">
              {versions.map((v, i) => (
                <div key={v.id} className="version-item">
                  <div className="version-item__dot" />
                  {i < versions.length - 1 && <div className="version-item__line" />}
                  <div className="version-item__content">
                    <div className="version-item__header">
                      <span className="version-item__version">v{v.version}</span>
                      <span className="version-item__date">{formatDate(v.createdAt)}</span>
                    </div>
                    {v.summary && (
                      <p className="version-item__summary">{v.summary}</p>
                    )}
                    {v.changes && v.changes.changedFields && v.changes.changedFields.length > 0 && (
                      <div className="version-item__fields">
                        {v.changes.changedFields.map(field => (
                          <span key={field} className="version-item__field-tag">
                            {fieldIcon(field)} {field === 'title' ? '标题' :
                             field === 'description' ? '简介' :
                             field === 'ingredients' ? '食材' :
                             field === 'steps' ? '步骤' :
                             field === 'tips' ? '小贴士' :
                             field === 'nutrition' ? '营养信息' :
                             field === 'category' ? '分类' :
                             field === 'difficulty' ? '难度' :
                             field === 'cookTime' ? '烹饪时长' :
                             field === 'coverImage' ? '封面' :
                             field === 'servings' ? '份数' : field}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}