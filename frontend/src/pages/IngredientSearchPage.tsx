import { useState, useRef, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { searchByIngredients } from '../api'
import type { IngredientSearchResult, AiRecipeRecommend } from '../api'
import './IngredientSearchPage.css'

// 常见食材列表（用于输入建议 + 热门标签）
const COMMON_INGREDIENTS = [
  '鸡蛋', '番茄', '土豆', '洋葱', '胡萝卜',
  '鸡肉', '猪肉', '牛肉', '虾', '豆腐',
  '酱油', '盐', '糖', '料酒', '姜', '蒜', '葱', '辣椒',
  '青椒', '白菜', '菠菜', '西兰花', '黄瓜', '茄子',
  '面粉', '大米', '面条', '玉米', '香菇', '木耳',
  '猪肉', '排骨', '鸡翅', '鱼', '五花肉',
  '花椒', '八角', '桂皮', '生抽', '老抽', '醋',
  '蚝油', '香油', '植物油', '黄油', '牛奶', '芝士',
  '红薯', '山药', '南瓜', '豆角', '四季豆',
  '柠檬', '蜂蜜', '韭菜', '香菜', '芹菜',
  '金针菇', '豆腐', '豆皮', '腐竹', '花生', '芝麻',
  '番茄酱', '豆瓣酱', '甜面酱', '咖喱',
  '粉丝', '粉条', '年糕', '糯米', '紫菜',
  '红枣', '枸杞', '莲子', '百合', '糯米粉',
]

const HOT_INGREDIENTS = ['鸡蛋', '番茄', '土豆', '鸡肉', '豆腐', '洋葱', '猪肉', '青椒', '虾', '黄瓜', '茄子', '牛肉']

export default function IngredientSearchPage() {
  const [input, setInput] = useState('')
  const [ingredients, setIngredients] = useState<string[]>([])
  const [results, setResults] = useState<IngredientSearchResult[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [aiRecommends, setAiRecommends] = useState<AiRecipeRecommend[] | null>(null)
  const [aiGenerated, setAiGenerated] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionRef = useRef<HTMLDivElement>(null)

  // 输入建议：基于输入过滤常见食材，排除已选的
  const suggestions = useMemo(() => {
    if (!input.trim()) return []
    const lower = input.toLowerCase()
    return COMMON_INGREDIENTS.filter(i =>
      !ingredients.includes(i) &&
      i.toLowerCase().includes(lower)
    ).slice(0, 8)
  }, [input, ingredients])

  const addIngredient = (name?: string) => {
    const trimmed = (name || input).trim()
    if (!trimmed || ingredients.includes(trimmed)) return
    setIngredients(prev => [...prev, trimmed])
    setInput('')
    setShowSuggestions(false)
    setSelectedSuggestion(-1)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedSuggestion(prev => Math.min(prev + 1, suggestions.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedSuggestion(prev => Math.max(prev - 1, 0))
        return
      }
      if (e.key === 'Tab' && selectedSuggestion >= 0) {
        e.preventDefault()
        addIngredient(suggestions[selectedSuggestion])
        return
      }
    }
    if (e.key === 'Enter') {
      if (selectedSuggestion >= 0 && showSuggestions) {
        addIngredient(suggestions[selectedSuggestion])
      } else {
        addIngredient()
      }
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false)
      setSelectedSuggestion(-1)
    }
  }

  const removeIngredient = (i: string) => {
    setIngredients(prev => prev.filter(item => item !== i))
  }

  const clearAll = () => {
    setIngredients([])
    setInput('')
    setResults([])
    setSearched(false)
    setAiRecommends(null)
    setAiGenerated(false)
    inputRef.current?.focus()
  }

  const handleSearch = async () => {
    if (!ingredients.length) return
    setLoading(true)
    setSearched(true)
    setAiRecommends(null)
    setAiGenerated(false)
    try {
      const res = await searchByIngredients(ingredients)
      setResults(res.list)
      if (res.aiRecommends && res.aiGenerated) {
        setAiRecommends(res.aiRecommends)
        setAiGenerated(true)
      }
    } catch (e: any) {
      alert(e.message || '搜索失败')
    } finally {
      setLoading(false)
    }
  }

  // 点击外部关闭建议
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="ingredient-search-page">
      <div className="is-header">
        <h1>🔍 手头食材搜索</h1>
        <p>输入你手头有的食材，看看能做什么菜</p>
      </div>

      <div className="is-input-area">
        <div className="is-input-row" style={{ position: 'relative' }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => { setInput(e.target.value); setShowSuggestions(true); setSelectedSuggestion(-1) }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            placeholder="输入食材名称（如：鸡蛋）"
            className="is-input"
            autoComplete="off"
          />
          <button onClick={() => addIngredient()} className="is-add-btn">添加</button>

          {/* 输入建议下拉 */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="is-suggestions" ref={suggestionRef}>
              {suggestions.map((s, i) => (
                <div
                  key={s}
                  className={`is-suggestion-item ${i === selectedSuggestion ? 'active' : ''}`}
                  onClick={() => { addIngredient(s) }}
                  onMouseEnter={() => setSelectedSuggestion(i)}
                >
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>

        {ingredients.length > 0 && (
          <div className="is-tags">
            {ingredients.map(i => (
              <span key={i} className="is-tag">
                {i}
                <button onClick={() => removeIngredient(i)} className="is-tag-remove">×</button>
              </span>
            ))}
            <button onClick={clearAll} className="is-clear-tags">清空</button>
          </div>
        )}

        {/* 热门食材标签（未搜索时展示） */}
        {!searched && ingredients.length === 0 && (
          <div className="is-hot-tags">
            <span className="is-hot-label">🔥 热门食材：</span>
            {HOT_INGREDIENTS.map(h => (
              <button key={h} className="is-hot-tag" onClick={() => {
                setIngredients([h])
                setTimeout(() => {
                  inputRef.current?.focus()
                }, 0)
              }}>
                {h}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={handleSearch}
          disabled={loading || !ingredients.length}
          className="is-search-btn"
        >
          {loading ? (
            <span className="is-loading">
              <span className="is-spinner" /> 搜索中...
            </span>
          ) : (
            `🔍 搜索食谱 (${ingredients.length} 种食材)`
          )}
        </button>
      </div>

      {searched && (
        <div className="is-results">
          <h2>
            搜索结果 ({results.length})
            {results.length === 0 && (
              <span className="is-empty-hint-ai">
                {aiGenerated ? '— AI 已为你推荐食谱 👇' : '— 试试其他食材组合?'}
              </span>
            )}
          </h2>

          {/* AI 推荐区块 */}
          {aiRecommends && aiRecommends.length > 0 && (
            <div className="is-ai-section">
              <div className="is-ai-badge">
                <span className="is-ai-icon">🤖</span>
                <span>AI 智能推荐</span>
              </div>
              <p className="is-ai-note">数据库暂无匹配，以下为 AI 生成的食谱建议</p>
              <div className="is-ai-grid">
                {aiRecommends.map((r, idx) => (
                  <div key={idx} className="is-ai-card">
                    <div className="is-ai-card-header">
                      <span className="is-ai-num">#{idx + 1}</span>
                      <span className={`is-ai-diff is-ai-diff--${r.difficulty}`}>
                        {r.difficulty === 'easy' ? '简单' : r.difficulty === 'medium' ? '中等' : '困难'}
                      </span>
                    </div>
                    <h3>{r.title}</h3>
                    <p className="is-ai-desc">{r.description}</p>
                    <div className="is-ai-meta">
                      <span>⏱ {r.cookTime}分钟</span>
                      <span>👤 {r.servings}人份</span>
                    </div>
                    <details className="is-ai-details">
                      <summary>📋 食材清单</summary>
                      <ul>
                        {r.ingredients.map((ing, i) => (
                          <li key={i}>{ing.name} {ing.amount}{ing.unit}</li>
                        ))}
                      </ul>
                    </details>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 空结果提示（无 AI 推荐时） */}
          {results.length === 0 && !aiGenerated && (
            <div className="empty">
              <span className="empty-icon">😅</span>
              <p>这些食材没能匹配到食谱</p>
              <p className="empty-hint">试试添加更多食材，或从热门标签中选择</p>
              <div className="empty-hot">
                {HOT_INGREDIENTS.slice(0, 6).map(h => (
                  <button key={h} className="is-hot-tag" onClick={() => {
                    setIngredients([h])
                    setSearched(false)
                  }}>
                    {h}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 正常结果 */}
          {results.length > 0 && (
            <div className="is-grid">
              {results.map(r => (
                <Link to={`/recipe/${r.id}`} key={r.id} className="is-card">
                  {r.coverImage && <img src={r.coverImage} alt="" className="is-card-img" />}
                  <div className="is-card-body">
                    <h3>{r.title}</h3>
                    <div className="match-bar">
                      <div className="match-fill" style={{ width: `${r.matchRatio}%` }} />
                      <span className="match-text">{r.matchRatio}% 匹配 ({r.matchCount}/{r.totalIngredients} 种食材)</span>
                    </div>
                    {r.matchedIngredients.length > 0 && (
                      <p className="matched">✅ {r.matchedIngredients.join('、')}</p>
                    )}
                    {r.missingIngredients.length > 0 && (
                      <>
                        <p className="missing-title">⏳ 还缺少：</p>
                        <div className="missing-tags">
                          {r.missingIngredients.slice(0, 6).map(m => (
                            <span key={m} className="missing-tag"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                if (!ingredients.includes(m)) {
                                  setIngredients(prev => [...prev, m])
                                }
                              }}>
                              +{m}
                            </span>
                          ))}
                          {r.missingIngredients.length > 6 && (
                            <span className="missing-more">+{r.missingIngredients.length - 6} 更多</span>
                          )}
                        </div>
                      </>
                    )}
                    <div className="is-card-footer">
                      {r.difficulty && (
                        <span className={`is-difficulty is-difficulty--${r.difficulty}`}>
                          {r.difficulty === 'easy' ? '简单' : r.difficulty === 'medium' ? '中等' : '困难'}
                        </span>
                      )}
                      {r.favoriteCount > 0 && <span className="fav-count">❤️ {r.favoriteCount}</span>}
                      {r.cookTime && <span className="cook-time">⏱ {r.cookTime}分</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}