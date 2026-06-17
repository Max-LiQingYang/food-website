/**
 * components/ChallengeHomeCards.tsx
 * 首页挑战赛入口卡片组件
 * 从 GET /api/challenges?status=active 获取进行中的挑战，展示为水平滚动的卡片
 */
import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getChallenges } from '../api'
import type { Challenge } from '../api'
import './ChallengeHomeCards.css'
import { getMotionSafeScrollBehavior } from '../context/MotionPreferenceContext'

export default function ChallengeHomeCards() {
  const navigate = useNavigate()
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getChallenges({ status: 'active', pageSize: 10 })
      .then(r => setChallenges(r.data.list))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return
    const amount = scrollRef.current.clientWidth * 0.7
    scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: getMotionSafeScrollBehavior() })
  }

  if (loading) return null
  if (challenges.length === 0) return null

  return (
    <section className="challenge-home-section">
      <div className="challenge-home-header">
        <h2 className="challenge-home-title">
          <span className="challenge-home-icon">🥗</span> 挑战赛进行中
        </h2>
        <Link to="/challenges" className="challenge-home-view-all">
          全部挑战 →
        </Link>
      </div>

      <div className="challenge-home-wrapper">
        {challenges.length > 2 && (
          <button className="challenge-scroll-btn left" onClick={() => scroll('left')} aria-label="向左滚动">
            ‹
          </button>
        )}
        <div className="challenge-home-track" ref={scrollRef}>
          {challenges.map(ch => (
            <div
              key={ch.id}
              className="challenge-mini-card"
              onClick={() => navigate(`/challenges/${ch.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && navigate(`/challenges/${ch.id}`)}
            >
              <div className="challenge-mini-theme">{ch.theme}</div>
              <h3 className="challenge-mini-title">{ch.title}</h3>
              <div className="challenge-mini-meta">
                <span>📅 {formatDate(ch.startDate)} ~ {formatDate(ch.endDate)}</span>
              </div>
              <div className="challenge-mini-prize">{ch.prize ? ch.prize.split('\n')[0] : ''}</div>
              <div className="challenge-mini-stats">
                <span>📮 {ch.submissionCount || 0} 投稿</span>
                <span>🗳️ {ch.voteCount || 0} 投票</span>
              </div>
            </div>
          ))}
        </div>
        {challenges.length > 2 && (
          <button className="challenge-scroll-btn right" onClick={() => scroll('right')} aria-label="向右滚动">
            ›
          </button>
        )}
      </div>
    </section>
  )
}

function formatDate(d?: string): string {
  if (!d) return '待定'
  const date = new Date(d)
  return `${date.getMonth() + 1}.${date.getDate()}`
}