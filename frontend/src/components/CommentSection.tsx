import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getComments, getCommentStats, createComment, deleteComment, likeComment, unlikeComment } from '../api'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import type { Comment, CommentStats } from '../api'
import './CommentSection.css'

interface Props {
  recipeId: string
}

type SortMode = 'latest' | 'hot'

// 星级选择器组件
function StarRating({
  value,
  onChange,
  readonly = false,
  size = 'md'
}: {
  value: number
  onChange?: (v: number) => void
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
}) {
  const [hover, setHover] = useState(0)

  return (
    <div className={`star-rating star-rating--${size}`}>
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          className={`star-rating__star ${
            star <= (readonly ? value : hover || value) ? 'is-active' : ''
          }`}
          onClick={() => !readonly && onChange?.(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          disabled={readonly}
          aria-label={`${star} 星`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

// 格式化时间
function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 30) return `${days} 天前`
  return date.toLocaleDateString('zh-CN')
}

// 评分分布条
function RatingBar({ count, total }: { count: number; total: number }) {
  const percent = total > 0 ? (count / total) * 100 : 0
  return (
    <div className="rating-bar">
      <div className="rating-bar__fill" style={{ width: `${percent}%` }} />
    </div>
  )
}

export default function CommentSection({ recipeId }: Props) {
  const navigate = useNavigate()
  const toast = useToast()
  const { isAuthenticated, user } = useAuth()

  const [comments, setComments] = useState<Comment[]>([])
  const [stats, setStats] = useState<CommentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [sortMode, setSortMode] = useState<SortMode>('latest')

  // 表单状态
  const [content, setContent] = useState('')
  const [rating, setRating] = useState(0)
  const [showForm, setShowForm] = useState(false)

  // 分页
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 10

  const fetchData = useCallback(async () => {
    try {
      const [commentRes, statsRes] = await Promise.all([
        getComments(recipeId, { page, pageSize, sort: sortMode }),
        getCommentStats(recipeId)
      ])
      setComments(commentRes.data.list)
      setTotal(commentRes.data.total)
      setStats(statsRes.data)
    } catch (err) {
      console.error('Failed to load comments:', err)
    } finally {
      setLoading(false)
    }
  }, [recipeId, page, sortMode])

  useEffect(() => {
    setLoading(true)
    fetchData()
  }, [fetchData])

  const handleSortChange = (mode: SortMode) => {
    if (mode !== sortMode) {
      setSortMode(mode)
      setPage(1)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) {
      toast.warning('请输入评论内容')
      return
    }

    setSubmitting(true)
    try {
      await createComment(recipeId, {
        content: content.trim(),
        rating: rating || undefined
      })
      setContent('')
      setRating(0)
      setShowForm(false)
      toast.success('评论发表成功')
      setPage(1)
      await fetchData()
    } catch (err: any) {
      toast.error(err?.message || '评论发表失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('确定要删除这条评论吗？')) return
    try {
      await deleteComment(id)
      toast.success('评论已删除')
      await fetchData()
    } catch (err: any) {
      toast.error(err?.message || '删除失败')
    }
  }

  const handleLike = async (commentId: number, isLiked: boolean) => {
    if (!isAuthenticated) {
      toast.warning('请先登录')
      navigate('/login')
      return
    }
    try {
      if (isLiked) {
        await unlikeComment(commentId)
      } else {
        await likeComment(commentId)
      }
      // 乐观更新 UI
      setComments(prev =>
        prev.map(c =>
          c.id === commentId
            ? { ...c, isLiked: !isLiked, likesCount: (c.likesCount || 0) + (isLiked ? -1 : 1) }
            : c
        )
      )
    } catch (err: any) {
      toast.error(err?.message || (isLiked ? '取消点赞失败' : '点赞失败'))
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  if (loading) {
    return (
      <section className="comment-section">
        <h2 className="comment-section__title">评论</h2>
        <div className="comment-skeleton">
          <div className="skeleton-box skeleton-comment" />
          <div className="skeleton-box skeleton-comment" />
        </div>
      </section>
    )
  }

  return (
    <section className="comment-section">
      <h2 className="comment-section__title">
        评论
        {total > 0 && <span className="comment-section__count">{total}</span>}
      </h2>

      {/* 排序切换 */}
      {total > 0 && (
        <div className="comment-sort-tabs">
          <button
            className={`comment-sort-tab ${sortMode === 'latest' ? 'is-active' : ''}`}
            onClick={() => handleSortChange('latest')}
          >
            📅 最新
          </button>
          <button
            className={`comment-sort-tab ${sortMode === 'hot' ? 'is-active' : ''}`}
            onClick={() => handleSortChange('hot')}
          >
            🔥 最热
          </button>
        </div>
      )}

      {/* 评分概览 */}
      {stats && stats.ratedCount > 0 && (
        <div className="comment-stats">
          <div className="comment-stats__main">
            <span className="comment-stats__avg">{stats.averageRating}</span>
            <div>
              <StarRating value={Math.round(stats.averageRating)} readonly size="sm" />
              <span className="comment-stats__count">{stats.ratedCount} 人评分</span>
            </div>
          </div>
          <div className="comment-stats__bars">
            {[5, 4, 3, 2, 1].map(star => (
              <div key={star} className="comment-stats__row">
                <span className="comment-stats__label">{star} 星</span>
                <RatingBar
                  count={stats.distribution[star] || 0}
                  total={stats.ratedCount}
                />
                <span className="comment-stats__num">{stats.distribution[star] || 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 发表评论 */}
      {isAuthenticated ? (
        !showForm ? (
          <button className="comment-form__toggle" onClick={() => setShowForm(true)}>
            ✍️ 写评论
          </button>
        ) : (
          <form className="comment-form" onSubmit={handleSubmit}>
            <div className="comment-form__header">
              <span className="comment-form__user">{user?.nickname || user?.username}</span>
              <StarRating value={rating} onChange={setRating} />
              {rating > 0 && <span className="comment-form__rating-text">{rating} 分</span>}
            </div>
            <textarea
              className="comment-form__textarea"
              placeholder="分享你对这道菜的看法..."
              value={content}
              onChange={e => setContent(e.target.value)}
              maxLength={1000}
              rows={3}
            />
            <div className="comment-form__actions">
              <span className="comment-form__count">{content.length}/1000</span>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  setShowForm(false)
                  setContent('')
                  setRating(0)
                }}
              >
                取消
              </button>
              <button type="submit" className="btn btn--primary" disabled={submitting}>
                {submitting ? '发表中...' : '发表评论'}
              </button>
            </div>
          </form>
        )
      ) : (
        <div className="comment-login-hint">
          <p>
            <button className="comment-login-link" onClick={() => navigate('/login')}>
              登录
            </button>
            后即可发表评论
          </p>
        </div>
      )}

      {/* 评论列表 */}
      {comments.length === 0 ? (
        <div className="comment-empty">
          <p>🍽️ 暂无评论，快来抢沙发吧！</p>
        </div>
      ) : (
        <div className="comment-list">
          {comments.map(comment => (
            <div key={comment.id} className="comment-item">
              <div className="comment-item__header">
                <span className="comment-item__avatar">
                  {(comment.user?.nickname || comment.user?.username || '?')[0]}
                </span>
                <div className="comment-item__info">
                  <span className="comment-item__name">
                    {comment.user?.nickname || comment.user?.username || '匿名用户'}
                  </span>
                  {comment.rating && (
                    <StarRating value={comment.rating} readonly size="sm" />
                  )}
                </div>
                <span className="comment-item__time">{formatTime(comment.createdAt)}</span>
              </div>
              <p className="comment-item__content">{comment.content}</p>
              <div className="comment-item__actions">
                <button
                  className={`comment-like-btn ${comment.isLiked ? 'is-liked' : ''}`}
                  onClick={() => handleLike(comment.id, !!comment.isLiked)}
                >
                  <span className="comment-like-btn__icon">{comment.isLiked ? '❤️' : '🤍'}</span>
                  <span className="comment-like-btn__count">{comment.likesCount || 0}</span>
                </button>
                {isAuthenticated && user?.id === comment.userId && (
                  <button
                    className="comment-item__delete"
                    onClick={() => handleDelete(comment.id)}
                  >
                    删除
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="comment-pagination">
              <button
                className="btn btn--ghost btn--sm"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                上一页
              </button>
              <span className="comment-pagination__info">
                {page} / {totalPages}
              </span>
              <button
                className="btn btn--ghost btn--sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                下一页
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}