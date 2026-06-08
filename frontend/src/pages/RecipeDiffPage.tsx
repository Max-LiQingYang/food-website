import { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { getRecipeVersionsList, getRecipeVersionDiff, type VersionDiffResponse } from '../api'
import './RecipeDiffPage.css'
import PageSkeleton from '../components/PageSkeleton'

const FIELD_LABELS: Record<string, string> = {
  title: '标题',
  description: '描述',
  difficulty: '难度',
  cookTime: '烹饪时间',
  servings: '份量',
  category: '分类',
  ingredients: '食材',
  steps: '步骤',
  season: '季节',
  tips: '小贴士',
  image: '图片',
  coverImage: '封面图',
  nutrition: '营养信息',
}

function getFieldLabel(field: string): string {
  return FIELD_LABELS[field] || field
}

function formatFieldValue(value: any, field: string): string {
  if (value == null) return '(空)'
  if (Array.isArray(value)) {
    if (field === 'ingredients') {
      return value.map((v: any) => typeof v === 'string' ? v : (v.name || '')).join('\n')
    }
    if (field === 'steps') {
      return value.map((v: any, i: number) => `${i + 1}. ${typeof v === 'string' ? v : (v.description || v.content || '')}`).join('\n')
    }
    return value.join('\n')
  }
  if (typeof value === 'object') {
    try { return JSON.stringify(value, null, 2) } catch { return String(value) }
  }
  return String(value)
}

function renderArrayDiff(field: string, oldArr: any[], newArr: any[]) {
  const normalize = (item: any) => {
    if (typeof item === 'string') return item
    if (field === 'ingredients') return item.name || ''
    if (field === 'steps') return (item.description || item.content || '') as string
    return JSON.stringify(item)
  }

  const oldItems = (oldArr || []).map(normalize)
  const newItems = (newArr || []).map(normalize)

  // Simple diff: mark added/removed lines
  const maxLen = Math.max(oldItems.length, newItems.length)
  const rows: { text: string; status: 'unchanged' | 'added' | 'removed'; index: number }[] = []

  for (let i = 0; i < maxLen; i++) {
    const oldText = oldItems[i] || ''
    const newText = newItems[i] || ''
    const idx = field === 'steps' ? i + 1 : i

    if (oldText && newText && oldText === newText) {
      rows.push({ text: `${idx}. ${oldText}`, status: 'unchanged', index: i })
    } else if (oldText && !newText) {
      rows.push({ text: `${idx}. ${oldText}`, status: 'removed', index: i })
    } else if (!oldText && newText) {
      rows.push({ text: `${idx}. ${newText}`, status: 'added', index: i })
    } else {
      rows.push({ text: `${idx}. [旧] ${oldText}`, status: 'removed', index: i })
      rows.push({ text: `${idx}. [新] ${newText}`, status: 'added', index: i })
    }
  }

  return (
    <div>
      {rows.map((row, i) => (
        <div key={i} className={`recipe-diff-page__array-item recipe-diff-page__array-item--${row.status}`}>
          {row.text}
        </div>
      ))}
    </div>
  )
}

// ─── 版本选择器 ───
function VersionSelect({
  versions,
  label,
  value,
  onChange,
}: {
  versions: { version: number; summary: string | null; createdAt: string }[]
  label: string
  value: number | ''
  onChange: (v: number) => void
}) {
  return (
    <select
      className="recipe-diff-page__select"
      value={value === '' ? '' : value}
      onChange={e => onChange(parseInt(e.target.value, 10) || 1)}
    >
      <option value="" disabled>选择{label}</option>
      {versions.map(v => (
        <option key={v.version} value={v.version}>
          v{v.version} — {v.summary || new Date(v.createdAt).toLocaleDateString('zh-CN')}
        </option>
      ))}
    </select>
  )
}

export default function RecipeDiffPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [versions, setVersions] = useState<any[]>([])
  const [recipeTitle, setRecipeTitle] = useState('')
  const [error, setError] = useState('')

  const [v1, setV1] = useState<number | ''>('')
  const [v2, setV2] = useState<number | ''>('')
  const [diff, setDiff] = useState<VersionDiffResponse | null>(null)
  const [diffLoading, setDiffLoading] = useState(false)

  // Load version list
  useEffect(() => {
    if (!id) return
    setLoading(true)
    getRecipeVersionsList(id)
      .then(res => {
        setVersions(res.versions || [])
        setRecipeTitle(res.recipeTitle || '')
        setError('')

        // Try to set default selection from URL params
        const urlV1 = searchParams.get('v1')
        const urlV2 = searchParams.get('v2')
        if (urlV1 && urlV2 && res.versions.length > 0) {
          setV1(parseInt(urlV1, 10))
          setV2(parseInt(urlV2, 10))
        } else if (res.versions.length >= 2) {
          setV1(res.versions[1]?.version)
          setV2(res.versions[0]?.version)
        } else if (res.versions.length === 1) {
          setV1(res.versions[0]?.version)
        }
      })
      .catch(() => setError('加载版本列表失败'))
      .finally(() => setLoading(false))
  }, [id, searchParams])

  // Load diff when both selected
  useEffect(() => {
    if (!id || v1 === '' || v2 === '' || v1 === v2) {
      setDiff(null)
      return
    }
    setDiffLoading(true)
    getRecipeVersionDiff(id, v1 as number, v2 as number)
      .then(setDiff)
      .catch(() => setDiff(null))
      .finally(() => setDiffLoading(false))
  }, [id, v1, v2])

  if (loading) {
    return (
      <div className="recipe-diff-page">
        <PageSkeleton type="detail" />
      </div>
    )
  }

  if (error && versions.length === 0) {
    return (
      <div className="recipe-diff-page">
        <Link to={`/recipe/${id}`} className="recipe-diff-page__back">← 返回食谱</Link>
        <div className="recipe-diff-page__error">{error}</div>
      </div>
    )
  }

  return (
    <div className="recipe-diff-page">
      <div className="recipe-diff-page__header">
        <Link to={`/recipe/${id}`} className="recipe-diff-page__back">← 返回食谱</Link>
        <h1 className="recipe-diff-page__title">版本历史 — {recipeTitle}</h1>
        <p className="recipe-diff-page__subtitle">共 {versions.length} 个版本</p>
      </div>

      {/* 版本列表 */}
      <div className="recipe-diff-page__list">
        {versions.map(v => (
          <div key={v.version} className="recipe-diff-page__list-item">
            <div className="recipe-diff-page__list-version">v{v.version}</div>
            <div className="recipe-diff-page__list-info">
              <div className="recipe-diff-page__list-summary">{v.summary || `版本 ${v.version}`}</div>
              <div className="recipe-diff-page__list-date">
                {new Date(v.createdAt).toLocaleString('zh-CN')}
              </div>
            </div>
            {v.changes?.changedFields?.length > 0 && (
              <div className="recipe-diff-page__list-changes">
                修改了 {v.changes.changedFields.length} 个字段
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 版本选择器 */}
      {versions.length >= 2 && (
        <div className="recipe-diff-page__list-viewer">
          <div className="recipe-diff-page__selector">
            <VersionSelect versions={versions} label="旧版本" value={v1} onChange={setV1} />
            <span className="recipe-diff-page__vs">VS</span>
            <VersionSelect versions={versions} label="新版本" value={v2} onChange={setV2} />
          </div>

          {/* Diff View */}
          {diffLoading && <div className="recipe-diff-page__loading">加载对比结果...</div>}

          {diff && !diffLoading && (
            <>
              <div className="recipe-diff-page__diff-count">
                共修改了 <strong>{diff.totalChanged}</strong> 个字段：
                {Object.entries(diff.fieldDiffs).map(([field, info]) => (
                  <span key={field} className={`recipe-diff-page__meta-badge recipe-diff-page__meta-badge--${info.status}`} style={{ marginLeft: 8 }}>
                    {getFieldLabel(field)}
                  </span>
                ))}
              </div>

              {/* 版本元信息 */}
              <div className="recipe-diff-page__meta">
                <div className="recipe-diff-page__meta-old">
                  <div className="recipe-diff-page__meta-label">旧版本</div>
                  <div className="recipe-diff-page__meta-version">v{diff.oldVersion.version}</div>
                  <div className="recipe-diff-page__meta-date">{new Date(diff.oldVersion.createdAt).toLocaleString('zh-CN')}</div>
                </div>
                <div className="recipe-diff-page__meta-new">
                  <div className="recipe-diff-page__meta-label">新版本</div>
                  <div className="recipe-diff-page__meta-version">v{diff.newVersion.version}</div>
                  <div className="recipe-diff-page__meta-date">{new Date(diff.newVersion.createdAt).toLocaleString('zh-CN')}</div>
                </div>
              </div>

              {/* 双栏对比 */}
              <div className="recipe-diff-page__panels">
                <div className="recipe-diff-page__panel">
                  <div className="recipe-diff-page__panel-header">
                    <span>📜 旧版本 v{diff.oldVersion.version}</span>
                  </div>
                  <div className="recipe-diff-page__panel-body">
                    {diff.changedFields.map(field => {
                      const info = diff.fieldDiffs[field]
                      if (!info) return null
                      return (
                        <div key={field} className={`recipe-diff-page__field recipe-diff-page__field--${info.status}`}>
                          <div className="recipe-diff-page__field-label">{getFieldLabel(field)}</div>
                          {Array.isArray(info.old) ? (
                            renderArrayDiff(field, info.old, [])
                          ) : (
                            <div className="recipe-diff-page__field-content">
                              {formatFieldValue(info.old, field)}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="recipe-diff-page__panel">
                  <div className="recipe-diff-page__panel-header">
                    <span>✨ 新版本 v{diff.newVersion.version}</span>
                  </div>
                  <div className="recipe-diff-page__panel-body">
                    {diff.changedFields.map(field => {
                      const info = diff.fieldDiffs[field]
                      if (!info) return null
                      return (
                        <div key={field} className={`recipe-diff-page__field recipe-diff-page__field--${info.status}`}>
                          <div className="recipe-diff-page__field-label">{getFieldLabel(field)}</div>
                          {Array.isArray(info.new) ? (
                            renderArrayDiff(field, [], info.new)
                          ) : (
                            <div className="recipe-diff-page__field-content">
                              {formatFieldValue(info.new, field)}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </>
          )}

          {!diff && !diffLoading && (
            <div className="recipe-diff-page__empty">请选择两个不同版本进行对比</div>
          )}
        </div>
      )}
    </div>
  )
}