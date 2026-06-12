import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getChallenges } from '../api'
import type { Challenge } from '../api'
import './ChallengesPage.css'
import PageSkeleton from '../components/PageSkeleton'

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    getChallenges({ status: filter || undefined })
      .then(r => setChallenges(r.data.list))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [filter])

  const statusLabel: Record<string, string> = {
    active: '进行中', voting: '投票中', closed: '已结束', draft: '草稿',
  }
  const statusClass: Record<string, string> = {
    active: 'badge-active', voting: 'badge-voting', closed: 'badge-closed', draft: 'badge-draft',
  }

  return (
    <div className="challenges-page">
      <div className="challenges-header">
        <h1>🥗 食谱挑战赛</h1>
        <p>参与主题挑战，展示你的厨艺，赢取荣誉！</p>
      </div>

      <div className="challenges-filter">
        {['', 'active', 'voting', 'closed'].map(s => (
          <button key={s} className={`filter-btn ${filter === s ? 'active' : ''}`}
            onClick={() => setFilter(s)}>
            {s ? statusLabel[s] : '全部'}
          </button>
        ))}
      </div>

      {loading ? (
        <PageSkeleton type="profile" />
      ) : challenges.length === 0 ? (
        <div className="empty">
          <span className="empty-icon">🏆</span>
          <p>暂无挑战活动</p>
          <p className="empty-hint">敬请期待新的主题挑战！</p>
        </div>
      ) : (
        <div className="challenges-grid">
          {challenges.map(c => (
            <div key={c.id} className="challenge-card" onClick={() => navigate(`/challenges/${c.id}`)}>
              <div className="card-cover">
                {c.coverImage ? <img src={c.coverImage} alt={c.title} /> : <div className="cover-placeholder">🥗</div>}
                <span className={`status-badge ${statusClass[c.status] || ''}`}>
                  {statusLabel[c.status] || c.status}
                </span>
              </div>
              <div className="card-body">
                <h3>{c.title}</h3>
                <p className="theme-tag">主题：{c.theme}</p>
                {c.description && <p className="desc">{c.description.slice(0, 80)}</p>}
                <div className="card-stats">
                  <span>📝 {c.submissionCount} 投稿</span>
                  <span>🗳️ {c.voteCount} 投票</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}