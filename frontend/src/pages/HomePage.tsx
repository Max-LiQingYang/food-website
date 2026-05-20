import { Link } from 'react-router-dom'
import './HomePage.css'

export default function HomePage() {
  return (
    <div className="home-page">
      <h1>🍳 美食食谱首页</h1>
      <p>首页建设中，敬请期待~</p>
      {/* @ts-expect-error TS2786 — TS 5.9 + @types/react 18 vs parent @types/react 19 mismatch, harmless */}
      <Link to="/favorites" className="link">→ 我的收藏</Link>
    </div>
  )
}
