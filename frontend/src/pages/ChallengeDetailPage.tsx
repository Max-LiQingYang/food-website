import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getChallenge, getChallengeSubmissions, getChallengeRanking, voteChallenge } from '../api'
import type { Challenge, ChallengeSubmission, ChallengeRanking } from '../api'
import './ChallengeDetailPage.css'

export default function ChallengeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [submissions, setSubmissions] = useState<ChallengeSubmission[]>([])
  const [rankings, setRankings] = useState<ChallengeRanking[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'submissions' | 'ranking'>('submissions')
  const [voting, setVoting] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([
      getChallenge(id),
      getChallengeSubmissions(id),
      getChallengeRanking(id),
    ]).then(([c, subs, rank]) => {
      setChallenge(c)
      setSubmissions(subs.list)
      setRankings(rank.list)
    }).catch(console.error).finally(() => setLoading(false))
  }, [id])

  const handleVote = async (submissionId: string) => {
    if (!id || voting) return
    setVoting(true)
    try {
      const res = await voteChallenge(id, submissionId)
      // Refresh
      const [subs, rank] = await Promise.all([
        getChallengeSubmissions(id),
        getChallengeRanking(id),
      ])
      setSubmissions(subs.list)
      setRankings(rank.list)
    } catch (e: any) {
      alert(e.message || '投票失败')
    } finally { setVoting(false) }
  }

  if (loading) return <div className="loading">加载中...</div>
  if (!challenge) return <div className="not-found">挑战不存在</div>

  const statusLabel: Record<string, string> = {
    active: '进行中', voting: '投票中', closed: '已结束', draft: '草稿',
  }
  const canVote = challenge.status === 'voting' || challenge.status === 'active'

  return (
    <div className="challenge-detail-page">
      <div className="detail-header">
        {challenge.coverImage && <img src={challenge.coverImage} alt="" className="detail-cover" />}
        <div className="detail-info">
          <h1>{challenge.title}</h1>
          <p className="theme">主题：{challenge.theme}</p>
          <p className="desc">{challenge.description}</p>
          <div className="detail-stats">
            <span>📝 {challenge.submissionCount} 投稿</span>
            <span>🗳️ {challenge.voteCount} 投票</span>
            <span className={`status ${challenge.status}`}>{statusLabel[challenge.status]}</span>
          </div>
          {challenge.rules && <div className="rules"><h4>📋 规则</h4><pre>{challenge.rules}</pre></div>}
        </div>
      </div>

      <div className="tab-bar">
        <button className={`tab ${tab === 'submissions' ? 'active' : ''}`}
          onClick={() => setTab('submissions')}>投稿列表</button>
        <button className={`tab ${tab === 'ranking' ? 'active' : ''}`}
          onClick={() => setTab('ranking')}>🏆 排行榜</button>
      </div>

      {tab === 'submissions' ? (
        <div className="submissions-grid">
          {submissions.length === 0 ? (
            <div className="empty">暂无投稿</div>
          ) : submissions.map(s => (
            <div key={s.id} className="submission-card">
              {s.recipe && (
                <>
                  <div className="sub-recipe-info">
                    <h3><Link to={`/recipe/${s.recipeId}`}>{s.recipe.title}</Link></h3>
                    {s.recipe.coverImage && <img src={s.recipe.coverImage} alt="" className="sub-img" />}
                    {s.recipe.description && <p className="sub-desc">{s.recipe.description}</p>}
                  </div>
                  <div className="sub-meta">
                    <span>🗳️ {s.voteCount} 票</span>
                    {s.submitter && <span>by {s.submitter.nickname || s.submitter.username}</span>}
                  </div>
                  {canVote && (
                    <button className="vote-btn" onClick={() => handleVote(s.id)} disabled={voting}>
                      {voting ? '投票中...' : '👍 投票'}
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="ranking-list">
          {rankings.length === 0 ? (
            <div className="empty">暂无排名数据</div>
          ) : rankings.map(r => (
            <div key={r.id} className={`ranking-item ${r.rank <= 3 ? 'top-three' : ''}`}>
              <div className="rank-number">
                {r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : `#${r.rank}`}
              </div>
              <div className="rank-info">
                {r.recipe && (
                  <>
                    <Link to={`/recipe/${r.recipeId}`} className="rank-title">{r.recipe.title}</Link>
                    {r.submitter && <span className="rank-author">by {r.submitter.nickname || r.submitter.username}</span>}
                  </>
                )}
              </div>
              <div className="rank-votes">🗳️ {r.voteCount}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}