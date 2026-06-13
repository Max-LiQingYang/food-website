import { useState, useEffect, useRef, useCallback } from 'react'
import { getShareInfo, type ShareInfo } from '../api'
import { useToast } from '../context/ToastContext'
import './ShareModal.css'

interface ShareModalProps {
  recipeId: string
  recipeTitle: string
  recipeImage?: string
  recipeDesc?: string
  onClose: () => void
}

const SOCIAL_PLATFORMS = [
  { name: '微信', icon: '💬', color: '#07C160' },
  { name: '微博', icon: '📢', color: '#E6162D' },
  { name: 'QQ', icon: '🐧', color: '#12B7F5' },
  { name: 'Twitter', icon: '🐦', color: '#1DA1F2' },
  { name: 'Facebook', icon: '📘', color: '#1877F2' },
  { name: '复制链接', icon: '🔗', color: '#666' },
]

export default function ShareModal({
  recipeId,
  recipeTitle,
  recipeImage,
  recipeDesc,
  onClose,
}: ShareModalProps) {
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [showCard, setShowCard] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const toast = useToast()

  // Fetch share info
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getShareInfo(recipeId)
      .then((res: any) => {
        if (!cancelled) {
          setShareInfo(res.data ?? res)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setShareInfo({
            title: recipeTitle,
            description: recipeDesc || `来看看这道美食：${recipeTitle}`,
            shareUrl: window.location.href,
            shareText: `来看看这道美食：${recipeTitle} — ${window.location.href}`,
          })
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [recipeId, recipeTitle, recipeDesc])

  // Close on backdrop click
  const handleBackdrop = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleCopyLink = async () => {
    const url = shareInfo?.shareUrl ?? window.location.href
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.showToast('链接已复制到剪贴板', 'success')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.showToast('复制失败，请手动复制', 'error')
    }
  }

  const handleCopyShareText = async (platform: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.showToast(`已复制分享文本，打开${platform}粘贴即可`, 'success')
    } catch {
      toast.showToast('复制失败', 'error')
    }
  }

  const generateShareText = (): string => {
    const title = shareInfo?.title ?? recipeTitle
    const desc = shareInfo?.description ?? recipeDesc ?? ''
    const url = shareInfo?.shareUrl ?? window.location.href
    return `【${title}】\n${desc}\n${url}`
  }

  // 社交媒体分享链接
  const getSocialShareUrl = (platform: string): string => {
    const url = encodeURIComponent(shareInfo?.shareUrl ?? window.location.href)
    const text = encodeURIComponent(shareInfo?.title ?? recipeTitle)
    switch (platform) {
      case 'Twitter':
        return `https://twitter.com/intent/tweet?text=${text}&url=${url}`
      case 'Facebook':
        return `https://www.facebook.com/sharer/sharer.php?u=${url}`
      case '微博':
        return `https://service.weibo.com/share/share.php?title=${text}&url=${url}`
      default:
        return ''
    }
  }

  const handleSocialShare = (platform: string) => {
    if (platform === '复制链接') {
      handleCopyLink()
      return
    }
    const shareUrl = getSocialShareUrl(platform)
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400')
    } else {
      handleCopyShareText(platform, generateShareText())
    }
  }

  return (
    <div className="share-modal__backdrop" onClick={handleBackdrop}>
      <div className="share-modal" ref={modalRef} role="dialog" aria-label="分享食谱">
        <div className="share-modal__header">
          <h3 className="share-modal__title">分享食谱</h3>
          <button className="share-modal__close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        <div className="share-modal__body">
          {loading ? (
            <div className="share-modal__loading">加载中...</div>
          ) : (
            <>
              {/* 分享卡片预览 */}
              <div className="share-modal__card" ref={cardRef}>
                {recipeImage && (
                  <img src={recipeImage} alt={recipeTitle} className="share-modal__card-img" loading="lazy" />
                )}
                <div className="share-modal__card-content">
                  <h4 className="share-modal__card-title">{recipeTitle}</h4>
                  {(shareInfo?.description || recipeDesc) && (
                    <p className="share-modal__card-desc">{shareInfo?.description || recipeDesc}</p>
                  )}
                  <div className="share-modal__card-footer">
                    <span className="share-modal__card-site">🍽️ 美食食谱</span>
                    <span className="share-modal__card-arrow">↗</span>
                  </div>
                </div>
              </div>

              {/* Web Share API button */}
              {typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function' && (
                <button className="share-modal__native-btn" onClick={async () => {
                  try {
                    await (navigator as any).share({
                      title: shareInfo?.title ?? recipeTitle,
                      text: generateShareText(),
                      url: shareInfo?.shareUrl ?? window.location.href,
                    })
                    toast.showToast('分享成功', 'success')
                  } catch (err: any) {
                    if (err?.name !== 'AbortError') {
                      handleCopyLink()
                    }
                  }
                }}>
                  📤 系统分享
                </button>
              )}

              {/* Social platform icons */}
              <div className="share-modal__platforms">
                {SOCIAL_PLATFORMS.map(platform => (
                  <button
                    key={platform.name}
                    className="share-modal__platform-btn"
                    onClick={() => handleSocialShare(platform.name)}
                    style={{ '--platform-color': platform.color } as React.CSSProperties}
                    title={platform.name}
                  >
                    <span className="share-modal__platform-icon">{platform.icon}</span>
                    <span className="share-modal__platform-name">{platform.name}</span>
                  </button>
                ))}
              </div>

              {/* Link copy box */}
              <div className="share-modal__link-box">
                <input
                  className="share-modal__link-input"
                  type="text"
                  readOnly
                  value={shareInfo?.shareUrl ?? window.location.href}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  className={`share-modal__copy-btn ${copied ? 'share-modal__copy-btn--copied' : ''}`}
                  onClick={handleCopyLink}
                >
                  {copied ? '✅ 已复制' : '复制'}
                </button>
              </div>

              {/* 分享文本 */}
              <details className="share-modal__details">
                <summary className="share-modal__details-summary">查看分享文本</summary>
                <textarea
                  className="share-modal__share-text"
                  readOnly
                  value={generateShareText()}
                  rows={4}
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                />
              </details>
            </>
          )}
        </div>
      </div>
    </div>
  )
}