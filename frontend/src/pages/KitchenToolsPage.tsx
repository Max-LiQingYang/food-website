import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getKitchenTools, addMyTool } from '../api'
import type { KitchenTool } from '../api'
import './KitchenToolsPage.css'
import PageSkeleton from '../components/PageSkeleton'

const categoryLabels: Record<string, string> = {
  basic: '基础工具', cutting: '切割工具', cooking: '烹饪工具',
  baking: '烘焙工具', measuring: '测量工具', specialty: '专用工具',
}

export default function KitchenToolsPage() {
  const [tools, setTools] = useState<KitchenTool[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('')
  const [adding, setAdding] = useState<string | null>(null)

  useEffect(() => {
    getKitchenTools({ category: category || undefined })
      .then(r => setTools(r.list))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [category])

  const handleAdd = async (toolId: string) => {
    setAdding(toolId)
    try {
      const res = await addMyTool(toolId)
      alert('✅ 已添加到我的工具库')
    } catch (e: any) {
      if (e.message?.includes('已添加')) alert('已添加过该工具')
      else alert(e.message || '添加失败')
    } finally { setAdding(null) }
  }

  const grouped = tools.reduce<Record<string, KitchenTool[]>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = []
    acc[t.category].push(t)
    return acc
  }, {})

  return (
    <div className="tools-page">
      <div className="tools-header">
        <h1>🔪 厨房工具大全</h1>
        <p>认识各种厨房工具，添加到我的工具库中</p>
        <Link to="/my-tools" className="my-tools-link">📦 我的工具库</Link>
      </div>

      <div className="tools-filter">
        <button className={`filter-btn ${!category ? 'active' : ''}`} onClick={() => setCategory('')}>全部</button>
        {Object.entries(categoryLabels).map(([key, label]) => (
          <button key={key} className={`filter-btn ${category === key ? 'active' : ''}`}
            onClick={() => setCategory(key)}>{label}</button>
        ))}
      </div>

      {loading ? (
        <PageSkeleton type="profile" />
      ) : Object.keys(grouped).length === 0 ? (
        <div className="empty">
          <span className="empty-icon">🍳</span>
          <p>暂无工具数据</p>
        </div>
      ) : (
        <div className="tools-sections">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="tool-section">
              <h2 className="section-title">{categoryLabels[cat] || cat}</h2>
              <div className="tools-grid">
                {items.map(tool => (
                  <div key={tool.id} className="tool-card">
                    <div className="tool-icon">{tool.icon || '🔧'}</div>
                    <div className="tool-info">
                      <h3>{tool.name}</h3>
                      {tool.essential && <span className="essential-badge">必备</span>}
                      {tool.description && <p>{tool.description}</p>}
                    </div>
                    <button className="add-btn" onClick={() => handleAdd(tool.id)}
                      disabled={adding === tool.id}>
                      {adding === tool.id ? '...' : '+ 添加'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}