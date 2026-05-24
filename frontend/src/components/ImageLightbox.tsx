import { useState, useEffect, useCallback, useRef } from 'react'
import './ImageLightbox.css'

interface ImageLightboxProps {
  images: Array<{ src: string; alt?: string }>
  initialIndex?: number
  onClose: () => void
}

export default function ImageLightbox({ images, initialIndex = 0, onClose }: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [scale, setScale] = useState(1)
  const overlayRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const touchDeltaX = useRef(0)

  const current = images[currentIndex]
  const total = images.length

  // ── 键盘导航 ──
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        onClose()
        break
      case 'ArrowLeft':
        if (total > 1) setCurrentIndex(i => (i > 0 ? i - 1 : i))
        break
      case 'ArrowRight':
        if (total > 1) setCurrentIndex(i => (i < total - 1 ? i + 1 : i))
        break
    }
  }, [onClose, total])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    // 焦点锁定到遮罩层
    overlayRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [handleKeyDown])

  // ── 触控手势 ──
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    touchDeltaX.current = 0
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current
    const deltaY = Math.abs(e.touches[0].clientY - touchStartY.current)
    if (Math.abs(touchDeltaX.current) > deltaY) {
      e.preventDefault()
    }
  }

  const handleTouchEnd = () => {
    const threshold = 60
    if (touchDeltaX.current > threshold && currentIndex > 0) {
      setCurrentIndex(i => i - 1)
    } else if (touchDeltaX.current < -threshold && currentIndex < total - 1) {
      setCurrentIndex(i => i + 1)
    }
  }

  // ── 缩放 ──
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.2 : 0.2
      setScale(s => Math.max(0.5, Math.min(5, s + delta)))
    }
  }

  const resetScale = useCallback(() => setScale(1), [])

  useEffect(() => {
    resetScale()
  }, [currentIndex, resetScale])

  return (
    <div
      className="lightbox-overlay"
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label="图片查看器"
      tabIndex={-1}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      {/* 关闭按钮 */}
      <button
        className="lightbox-close"
        onClick={onClose}
        aria-label="关闭图片查看器"
      >
        ✕
      </button>

      {/* 图片计数器 */}
      {total > 1 && (
        <div className="lightbox-counter" aria-live="polite">
          {currentIndex + 1} / {total}
        </div>
      )}

      {/* 缩放提示 */}
      {scale !== 1 && (
        <button
          className="lightbox-reset"
          onClick={resetScale}
          aria-label="重置缩放"
        >
          ↺ 重置
        </button>
      )}

      {/* 上一张 */}
      {total > 1 && currentIndex > 0 && (
        <button
          className="lightbox-nav lightbox-nav--prev"
          onClick={() => setCurrentIndex(i => i - 1)}
          aria-label="上一张图片"
        >
          ‹
        </button>
      )}

      {/* 图片 */}
      <div className="lightbox-image-wrapper">
        <img
          src={current.src}
          alt={current.alt || '食谱图片'}
          className="lightbox-image"
          style={{ transform: `scale(${scale})` }}
          draggable={false}
        />
      </div>

      {/* 下一张 */}
      {total > 1 && currentIndex < total - 1 && (
        <button
          className="lightbox-nav lightbox-nav--next"
          onClick={() => setCurrentIndex(i => i + 1)}
          aria-label="下一张图片"
        >
          ›
        </button>
      )}
    </div>
  )
}