import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getMyTools, removeMyTool } from '../api'
import type { KitchenTool } from '../api'
import './MyToolsPage.css'
import PageSkeleton from '../components/PageSkeleton'

const categoryLabels: Record<string, string> = {
  basic: '基础工具', cutting: '切割工具', cooking: '烹饪工具',
  baking: '烘焙工具', measuring: '测量工具', specialty: '专用工具',
}

export default function MyToolsPage() {
  const [tools, setTools] = useState<KitchenTool[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)

  const loadTools = () => {
    getMyTools().then(r => setTools(r.list)).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { loadTools() }, [])

  const handleRemove = async (toolId: string) => {
    if (!confirm('确定移除该工具？')) return
    setRemoving(toolId)
    try {
      await removeMyTool(toolId)
      loadTools()
    } catch (e: any) {
      alert(e.message || '移除失败')
    } finally { setRemoving(null) }
  }

  const grouped = tools.reduce<Record<string, KitchenTool[]>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = []
    acc[t.category].push(t)
    return acc
  }, {})

  return (
    <div className="my-tools-page">
      <div className="my-tools-header">
        <h1>📦 我的工具库</h1>
        <p>共 {tools.length} 个工具</p>
        <Link to="/tools" className="browse-link">🔍 浏览所有工具</Link>
      </div>

      {loading ? (
        <PageSkeleton type="profile" />
      ) : tools.length === 0 ? (
        <div className="empty">
          <span className="empty-icon">🍳</span>
          <p>你还没有添加任何工具</p>
          <Link to="/tools" className="start-link">开始添加工具</Link>
        </div>
      ) : (
        <div className="my-tools-sections">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="my-tool-section">
              <h2>{categoryLabels[cat] || cat} ({items.length})</h2>
              <div className="my-tools-grid">
                {items.map(tool => (
                  <div key={tool.id} className="my-tool-card">
                    <div className="tool-icon">{tool.icon || '🔧'}</div>
                    <div className="tool-info">
                      <strong>{tool.name}</strong>
                      {tool.essential && <span className="essential-badge">必备</span>}
                    </div>
                    <button className="remove-btn" onClick={() => handleRemove(tool.id)}
                      disabled={removing === tool.id}>
                      ✕
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