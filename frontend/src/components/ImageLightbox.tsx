import { useEffect } from 'react'
import './ImageLightbox.css'

interface Props {
  images: string[]
  currentIndex: number
  onClose: () => void
  onPrev?: () => void
  onNext?: () => void
}

export default function ImageLightbox({ images, currentIndex, onClose, onPrev, onNext }: Props) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && onPrev) onPrev()
      if (e.key === 'ArrowRight' && onNext) onNext()
    }
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose, onPrev, onNext])

  if (images.length === 0) return null

  return (
    <div className="image-lightbox" onClick={onClose}>
      <button className="image-lightbox__close" onClick={onClose} aria-label="关闭">
        ✕
      </button>

      {onPrev && images.length > 1 && (
        <button className="image-lightbox__nav image-lightbox__nav--prev" onClick={e => { e.stopPropagation(); onPrev() }} aria-label="上一张">
          ‹
        </button>
      )}

      <img
        className="image-lightbox__img"
        src={images[currentIndex]}
        alt="预览大图"
        onClick={e => e.stopPropagation()}
      />

      {onNext && images.length > 1 && (
        <button className="image-lightbox__nav image-lightbox__nav--next" onClick={e => { e.stopPropagation(); onNext() }} aria-label="下一张">
          ›
        </button>
      )}

      {images.length > 1 && (
        <div className="image-lightbox__counter">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  )
}
