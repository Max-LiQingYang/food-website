import { useEffect, useCallback } from 'react'
import './ImageLightbox.css'

interface ImageLightboxProps {
  src: string
  alt: string
  onClose: () => void
}

export default function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [handleKeyDown])

  return (
    <div className="image-lightbox" onClick={onClose}>
      <div className="image-lightbox__backdrop" />
      <button className="image-lightbox__close" onClick={onClose} aria-label="关闭">
        ✕
      </button>
      <img
        className="image-lightbox__img"
        src={src}
        alt={alt}
        onClick={e => e.stopPropagation()}
      />
    </div>
  )
}