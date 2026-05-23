import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { compareRecipes, type CompareResult, type CompareRecipe } from '../api'
import './ComparePage.css'

export default function ComparePage() {
  const [searchParams] = useSearchParams()
  const initialIds = searchParams.get('ids')?.split(',').filter(Boolean) || []
  const [selectedIds, setSelectedIds] = useState<string[]>(initialIds)
  const [result, setResult] = useState<CompareResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (initialIds.length >= 2) {
      doCompare(initialIds)
    }
  }, [])

  const doCompare = async (ids: string[]) => {
    if (ids.length < 2) {
      setError('请至少选择 2 个食谱进行对比')
      return
    }
    if (ids.length > 3) {
      setError('一次最多对比 3 个食谱')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await compareRecipes(ids)
      setResult(res)
    } catch (err: any) {
      setError(err?.message || '对比失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCompare = () => {
    const idsInput = (document.getElementById('compare-ids') as HTMLTextAreaElement)?.value
    if (!idsInput || !idsInput.trim()) {
      setError('请至少选择 2 个食谱进行对比')
      return
    }
    const ids = idsInput.split(/[,，\s\n]+/).filter(Boolean)
    doCompare(ids)
  }

  // Extract comparison dimensions
  const dimensions = useMemo(() => {
    if (!result?.recipes) return []
    const r = result.recipes
    return [
      { label: '分类', values: r.map(d => d.category || '-') },
      { label: '难度', values: r.map(d => d.difficulty || '-') },
      { label: '份量', values: r.map(d => `${d.servings || '-'} 人份`) },
      { label: '烹饪时间', values: r.map(d => d.cookTime || '-') },
      { label: '评分', values: r.map(d => d.avgRating ? `${d.avgRating.toFixed(1)} ⭐` : '-') },
      { label: '收藏数', values: r.map(d => `${d.favoriteCount ?? 0}`) },
      { label: '评论数', values: r.map(d => `${d.commentCount ?? 0}`) },
      { label: '浏览数', values: r.map(d => `${d.viewCount ?? 0}`) },
      { label: '质量', values: r.map(d => d.qualityLabel || '-') },
    ]
  }, [result])

  const getNutritionCell = (recipe: CompareRecipe) => {
    if (!recipe.nutrition) return <span className="cmp-null">无数据</span>
    const n = recipe.nutrition as Record<string, { value?: number; unit?: string }>
    const keys = ['calories', 'protein', 'fat', 'carbs', 'fiber', 'sodium']
    return (
      <div className="cmp-nutrition-grid">
        {keys.map(k => {
          const v = n[k]
          return v ? (
            <div key={k} className="cmp-nutrition-item">
              <span className="cmp-nutrition-label">{k === 'calories' ? '热量' : k === 'protein' ? '蛋白质' : k === 'fat' ? '脂肪' : k === 'carbs' ? '碳水' : k === 'fiber' ? '膳食纤维' : k === 'sodium' ? '钠' : k}</span>
              <span className="cmp-nutrition-value">{v.value ?? '-'}{v.unit || ''}</span>
            </div>
          ) : null
        })}
      </div>
    )
  }

  return (
    <div className="cmp-page">
      <h1 className="cmp-title">食谱对比</h1>

      {/* Input */}
      <div className="cmp-input-section">
        <label className="cmp-input-label">输入食谱 ID（每行一个，支持 2-3 个）：</label>
        <textarea
          id="compare-ids"
          className="cmp-textarea"
          rows={3}
          placeholder={`例如：\n1\n5\n8`}
          defaultValue={initialIds.join('\n')}
        />
        <button className="btn btn--primary" onClick={handleCompare} disabled={loading}>
          {loading ? '⏳ 对比中...' : '📊 开始对比'}
        </button>
        {error && <p className="cmp-error">{error}</p>}
      </div>

      {/* Result */}
      {result && result.recipes && (
        <div className="cmp-result">
          {/* Summary */}
          <div className="cmp-summary">
            <h2>对比摘要</h2>
            <p>共对比 {result.summary.totalCompared} 个食谱</p>
            <div className="cmp-summary-tags">
              {result.summary.hasCommonDifficulty && (
                <span className="cmp-tag cmp-tag--info">难度有相同</span>
              )}
              {result.summary.allDifferentDifficulty && (
                <span className="cmp-tag cmp-tag--warn">难度各不相同</span>
              )}
              <span className="cmp-tag">
                共有食材: {result.summary.commonIngredientCount} 种
              </span>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="cmp-table-wrapper">
            <table className="cmp-table">
              <thead>
                <tr>
                  <th className="cmp-th-label">维度</th>
                  {result.recipes.map((r, i) => (
                    <th key={r.id} className={`cmp-th-value cmp-th--${i}`}>
                      <Link to={`/recipe/${r.id}`} className="cmp-link">
                        {r.title}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dimensions.map((dim, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'cmp-row-even' : ''}>
                    <td className="cmp-td-label">{dim.label}</td>
                    {dim.values.map((v, j) => (
                      <td key={j} className="cmp-td-value">{v}</td>
                    ))}
                  </tr>
                ))}
                {/* Nutrition row */}
                <tr className="cmp-row-nutrition">
                  <td className="cmp-td-label">营养</td>
                  {result.recipes.map((r, i) => (
                    <td key={i} className="cmp-td-value">{getNutritionCell(r)}</td>
                  ))}
                </tr>
                {/* Ingredients row */}
                <tr>
                  <td className="cmp-td-label">食材<br/><span className="cmp-meta">(共菜谱推荐)</span></td>
                  {result.summary.recipeIngredients.map((ri, i) => (
                    <td key={i} className="cmp-td-value">
                      <span className="cmp-unique-badge">{ri.uniqueCount} 种独有</span>
                      {ri.uniqueIngredients.length > 0 ? (
                        <ul className="cmp-ingredient-list">
                          {ri.uniqueIngredients.map((name, j) => (
                            <li key={j} className="cmp-ingredient-item">{name}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="cmp-null">食材与其他菜谱相同</span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Common ingredients */}
          {result.summary.commonIngredients.length > 0 && (
            <div className="cmp-common">
              <h3>🥘 共有食材</h3>
              <div className="cmp-tags">
                {result.summary.commonIngredients.map((name, i) => (
                  <span key={i} className="cmp-tag cmp-tag--common">{name}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}