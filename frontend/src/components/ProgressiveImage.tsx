import React, { useState, useRef, useEffect } from 'react'
import './ProgressiveImage.css'

interface ProgressiveImageProps {
  src: string
  alt: string
  className?: string
  placeholderColor?: string
  /** 背景色覆盖用于骨架占位褪去动画 */
  style?: React.CSSProperties
  onClick?: () => void
  loading?: 'lazy' | 'eager'
}

const LQIP_COLORS = [
  '#f5f5f5', '#e8e8e8', '#f0ece3', '#e3dcd0',
  '#d4d4d4', '#eae2d7', '#f8f0e3', '#dfd8d0',
]

function hashColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return LQIP_COLORS[Math.abs(hash) % LQIP_COLORS.length]
}

const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  src,
  alt,
  className = '',
  placeholderColor,
  style,
  onClick,
  loading = 'lazy',
}) => {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const bgColor = placeholderColor || hashColor(src)

  useEffect(() => {
    // Reset state when src changes
    setLoaded(false)
    setError(false)

    const img = new Image()
    img.onload = () => {
      setLoaded(true)
    }
    img.onerror = () => {
      setError(true)
      // Still mark as loaded to show the broken image fallback
      setLoaded(true)
    }
    img.src = src

    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [src])

  const isVisible = loaded || error

  return (
    <div
      className={`progressive-image ${className} ${isVisible ? 'progressive-image--loaded' : 'progressive-image--loading'}`}
      style={{ ...style, backgroundColor: bgColor }}
      onClick={onClick}
    >
      {!isVisible && <div className="progressive-image__placeholder" />}
      {src && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className={`progressive-image__img ${isVisible ? 'progressive-image__img--visible' : ''}`}
          loading={loading}
          onLoad={() => setLoaded(true)}
          onError={() => { setError(true); setLoaded(true) }}
        />
      )}
      {error && (
        <div className="progressive-image__error">
          <span>🍳</span>
        </div>
      )}
    </div>
  )
}

export default ProgressiveImage