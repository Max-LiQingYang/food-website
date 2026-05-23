import { useState, useEffect, useRef, useCallback } from 'react'
import { getShareInfo, type ShareInfo } from '../api'
import { useToast } from '../context/ToastContext'
import './ShareModal.css'

interface ShareModalProps {
  recipeId: string
  recipeTitle: string
  onClose: () => void
}

const SOCIAL_PLATFORMS = [
  { name: '微信', icon: '💬', color: '#07C160' },
  { name: '微博', icon: '📢', color: '#E6162D' },
  { name: 'QQ', icon: '🐧', color: '#12B7F5' },
  { name: '复制链接', icon: '🔗', color: '#666' },
]

export default function ShareModal({ recipeId, recipeTitle, onClose }: ShareModalProps) {
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
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
          // Fallback: use window location
          setShareInfo({
            title: recipeTitle,
            description: `来看看这道美食：${recipeTitle}`,
            shareUrl: window.location.href,
            shareText: `来看看这道美食：${recipeTitle} — ${window.location.href}`,
          })
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [recipeId, recipeTitle])

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
      toast.success('链接已复制到剪贴板')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('复制失败，请手动复制')
    }
  }

  const handleWebShare = async () => {
    if (!navigator.share) return
    try {
      await navigator.share({
        title: shareInfo?.title ?? recipeTitle,
        text: shareInfo?.shareText ?? `来看看这道美食：${recipeTitle}`,
        url: shareInfo?.shareUrl ?? window.location.href,
      })
      toast.success('分享成功')
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        // Fallback to copy
        handleCopyLink()
      }
    }
  }

  const handleSocialShare = (platform: string) => {
    if (platform === '复制链接') {
      handleCopyLink()
      return
    }
    // For now, copy text with share info
    const text = shareInfo?.shareText ?? `来看看这道美食：${recipeTitle}\n${window.location.href}`
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`已复制分享文本，打开${platform}粘贴即可`)
    }).catch(() => {
      toast.error('复制失败')
    })
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
              <p className="share-modal__recipe-title">{recipeTitle}</p>

              {shareInfo?.description && (
                <p className="share-modal__desc">{shareInfo.description}</p>
              )}

              {/* Web Share API button */}
              {typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function' && (
                <button className="share-modal__native-btn" onClick={handleWebShare}>
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}