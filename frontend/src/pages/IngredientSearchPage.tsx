import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { searchByIngredients } from '../api'
import type { IngredientSearchResult } from '../api'
import './IngredientSearchPage.css'

export default function IngredientSearchPage() {
  const [input, setInput] = useState('')
  const [ingredients, setIngredients] = useState<string[]>([])
  const [results, setResults] = useState<IngredientSearchResult[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const addIngredient = () => {
    const trimmed = input.trim()
    if (!trimmed || ingredients.includes(trimmed)) return
    setIngredients(prev => [...prev, trimmed])
    setInput('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') addIngredient()
  }

  const removeIngredient = (i: string) => {
    setIngredients(prev => prev.filter(item => item !== i))
  }

  const handleSearch = async () => {
    if (!ingredients.length) return
    setLoading(true)
    setSearched(true)
    try {
      const res = await searchByIngredients(ingredients)
      setResults(res.list)
    } catch (e: any) {
      alert(e.message || '搜索失败')
    } finally { setLoading(false) }
  }

  return (
    <div className="ingredient-search-page">
      <div className="is-header">
        <h1>🔍 手头食材搜索</h1>
        <p>输入你手头有的食材，看看能做什么菜</p>
      </div>

      <div className="is-input-area">
        <div className="is-input-row">
          <input ref={inputRef} type="text" value={input}
            onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="输入食材名称（如：鸡蛋）" className="is-input" />
          <button onClick={addIngredient} className="is-add-btn">添加</button>
        </div>

        {ingredients.length > 0 && (
          <div className="is-tags">
            {ingredients.map(i => (
              <span key={i} className="is-tag">
                {i}
                <button onClick={() => removeIngredient(i)} className="is-tag-remove">×</button>
              </span>
            ))}
          </div>
        )}

        <button onClick={handleSearch} disabled={loading || !ingredients.length}
          className="is-search-btn">
          {loading ? '搜索中...' : '🔍 搜索食谱'}
        </button>
      </div>

      {searched && (
        <div className="is-results">
          <h2>搜索结果 ({results.length})</h2>
          {results.length === 0 ? (
            <div className="empty">
              <span className="empty-icon">😅</span>
              <p>这些食材没能匹配到食谱</p>
              <p className="empty-hint">试试添加更多食材看看</p>
            </div>
          ) : (
            <div className="is-grid">
              {results.map(r => (
                <Link to={`/recipe/${r.id}`} key={r.id} className="is-card">
                  {r.coverImage && <img src={r.coverImage} alt="" className="is-card-img" />}
                  <div className="is-card-body">
                    <h3>{r.title}</h3>
                    <div className="match-bar">
                      <div className="match-fill" style={{ width: `${r.matchRatio}%` }} />
                      <span className="match-text">{r.matchRatio}% 匹配</span>
                    </div>
                    {r.matchedIngredients.length > 0 && (
                      <p className="matched">✅ {r.matchedIngredients.join('、')}</p>
                    )}
                    {r.missingIngredients.length > 0 && (
                      <p className="missing">⏳ 缺少：{r.missingIngredients.join('、')}</p>
                    )}
                    {r.favoriteCount > 0 && <p className="fav-count">❤️ {r.favoriteCount}</p>}
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