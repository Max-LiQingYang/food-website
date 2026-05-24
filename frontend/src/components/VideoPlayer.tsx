import { useState, useEffect } from 'react'
import { getRecipeVideos } from '../api'
import type { VideoEmbed } from '../api'
import './VideoPlayer.css'

interface Props {
  recipeId: string
}

export default function VideoPlayer({ recipeId }: Props) {
  const [videos, setVideos] = useState<VideoEmbed[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    getRecipeVideos(recipeId)
      .then(r => setVideos(r.list))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [recipeId])

  if (loading) return null
  if (!videos.length) return null

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