import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getRecipeVideos } from '../api'
import type { VideoEmbed } from '../api'
import './VideoPlayer.css'

interface Props {
  recipeId: string
}

export default function VideoPlayer({ recipeId }: Props) {
  const [videos, setVideos] = useState<VideoEmbed[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getRecipeVideos(recipeId)
      .then(r => {
        if (!cancelled) {
          setVideos(r.list)
          setError(null)
        }
      })
      .catch((err: any) => {
        if (!cancelled) {
          console.warn('[VideoPlayer] 获取视频失败:', err?.response?.data?.message || err?.message || err)
          setError(err?.response?.data?.message || '获取视频失败，请稍后重试')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [recipeId])

  if (loading) return null

  // API 错误 → 友善提示
  if (error) {
    return (
      <div className="video-player-section video-player-section--empty">
        <h3 className="video-section-title">🎬 视频教程</h3>
        <div className="video-player__fallback">
          <div className="video-player__fallback-icon">⚠️</div>
          <p className="video-player__fallback-title">视频加载失败</p>
          <p className="video-player__fallback-desc">{error}</p>
        </div>
      </div>
    )
  }

  // 无视频 → 友善降级展示
  if (!videos.length) {
    return (
      <div className="video-player-section video-player-section--empty">
        <h3 className="video-section-title">🎬 视频教程</h3>
        <div className="video-player__fallback">
          <div className="video-player__fallback-icon">📖</div>
          <p className="video-player__fallback-title">本食谱暂无视频教程</p>
          <p className="video-player__fallback-desc">请跟随详细的图文步骤一步步操作，同样简单易懂</p>
          <Link to="/search" className="video-player__fallback-link">🏆 查看更多食谱</Link>
        </div>
      </div>
    )
  }

  const current = videos[currentIndex]

  const getEmbedUrl = (video: VideoEmbed): string => {
    if (video.platform === 'youtube') {
      const match = video.videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
      if (match) return `https://www.youtube.com/embed/${match[1]}`
    }
    if (video.platform === 'bilibili') {
      const match = video.videoUrl.match(/\/video\/(BV[a-zA-Z0-9]+)/)
      if (match) return `https://player.bilibili.com/player.html?bvid=${match[1]}&autoplay=0`
    }
    return video.videoUrl
  }

  return (
    <div className="video-player-section">
      <h3 className="video-section-title">🎬 视频教程</h3>
      <div className="video-player-wrapper">
        <iframe
          src={getEmbedUrl(current)}
          title={current.title || '视频教程'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="video-iframe"
        />
      </div>
      {current.title && <p className="video-title">{current.title}</p>}
      {videos.length > 1 && (
        <div className="video-thumbnails">
          {videos.map((v, i) => (
            <button key={v.id}
              className={`thumb-btn ${i === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(i)}>
              {v.coverImage ? <img src={v.coverImage} alt={v.title || ''} /> : <span>🎬</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}