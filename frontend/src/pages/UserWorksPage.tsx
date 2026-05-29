import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getUserWorks } from '../api'
import ImageLightbox from '../components/ImageLightbox'
import Pagination from '../components/Pagination'
import type { WorkItem } from '../api'
import { usePageTitle } from '../hooks/useSEO'
import './UserWorksPage.css'

const PAGE_SIZE = 12

export default function UserWorksPage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()

  const [works, setWorks] = useState<WorkItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [lightboxImages, setLightboxImages] = useState<string[]>([])
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const fetchWorks = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const data = await getUserWorks(userId, { page, pageSize: PAGE_SIZE })
      setWorks(data.list || [])
      setTotal(data.total || 0)
    } catch {
      setWorks([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [userId, page])

  useEffect(() => {
    fetchWorks()
  }, [fetchWorks])

  usePageTitle('我的作品 - 美食食谱')

  const openLightbox = (work: WorkItem, index: number) => {
    setLightboxImages(work.imageUrls)
    setLightboxIndex(index)
  }

  const closeLightbox = () => {
    setLightboxImages([])
    setLightboxIndex(0)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  if (loading) {
    return (
      <div className="works-page">
        <h1 className="works-page__title">我的作品</h1>
        <div className="works-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="works-card works-card--skeleton">
              <div className="skeleton-box" style={{ height: 180 }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="works-page">
      <div className="works-page__header">
        <button className="works-page__back" onClick={() => navigate(-1)}>← 返回</button>
        <h1 className="works-page__title">作品墙</h1>
        <span className="works-page__count">{total} 个作品</span>
      </div>

      {works.length === 0 ? (
        <div className="works-empty">
          <div className="works-empty__icon">📸</div>
          <h2 className="works-empty__heading">还没有作品呢</h2>
          <p className="works-empty__text">去任意食谱页面发表评论并上传成品图，你的作品就会在这里展示！</p>
          <button className="btn btn--primary works-empty__cta" onClick={() => navigate('/')}>
            去发现食谱
          </button>
        </div>
      ) : (
        <>
          <div className="works-grid">
            {works.map(work => (
              <div key={work.id} className="works-card">
                {/* 首张图片展示 */}
                {work.imageUrls.length > 0 && (
                  <div
                    className="works-card__image-wrap"
                    onClick={() => openLightbox(work, 0)}
                  >
                    <img
                      src={work.imageUrls[0]}
                      alt="作品图片"
                      className="works-card__image"
                      loading="lazy"
                    />
                    {work.imageUrls.length > 1 && (
                      <span className="works-card__count">+{work.imageUrls.length - 1}</span>
                    )}
                  </div>
                )}

                {work.recipe && (
                  <Link to={`/recipe/${work.recipe.id}`} className="works-card__recipe">
                    <span className="works-card__recipe-icon">🍽️</span>
                    <span className="works-card__recipe-name">{work.recipe.title}</span>
                  </Link>
                )}

                {work.content && (
                  <p className="works-card__content">"{work.content}"</p>
                )}

                <div className="works-card__meta">
                  <span className="works-card__rating">
                    {work.rating ? '★'.repeat(work.rating) + '☆'.repeat(5 - work.rating) : ''}
                  </span>
                  <span className="works-card__time">
                    {formatDate(work.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <Pagination current={page} total={totalPages} onChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
        </>
      )}

      {lightboxImages.length > 0 && (
        <ImageLightbox
          images={lightboxImages}
          currentIndex={lightboxIndex}
          onClose={closeLightbox}
          onPrev={lightboxIndex > 0 ? () => setLightboxIndex(i => i - 1) : undefined}
          onNext={lightboxIndex < lightboxImages.length - 1 ? () => setLightboxIndex(i => i + 1) : undefined}
        />
      )}
    </div>
  )
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / 86400000)
  if (days < 1) return '今天'
  if (days < 2) return '昨天'
  if (days < 7) return `${days} 天前`
  return d.toLocaleDateString('zh-CN')
}
