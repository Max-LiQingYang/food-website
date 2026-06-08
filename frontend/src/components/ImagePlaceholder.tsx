import { useState, useRef, useEffect } from 'react'
import { generateColorFromString } from '../utils/imageColor'
import { getProxiedImageUrl } from '../utils/imageProxy'

interface ImagePlaceholderProps {
  src: string
  alt: string
  className?: string
  style?: React.CSSProperties
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void
  /** Text to display when image fails to load (e.g. recipe name) */
  fallbackText?: string
}

/**
 * Image component with lazy loading and a colored gradient placeholder.
 * The placeholder color is derived from the image URL hash.
 */
export default function ImagePlaceholder({
  src,
  alt,
  className = '',
  style,
  onError,
  fallbackText,
}: ImagePlaceholderProps) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  // Generate warm-toned gradient from URL
  const gradient = generateColorFromString(src)

  useEffect(() => {
    // Reset on src change
    setLoaded(false)
    setError(false)
  }, [src])

  const handleLoad = () => setLoaded(true)
  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setError(true)
    onError?.(e)
  }

  if (error) {
    return (
      <div
        className={className}
        style={{
          ...style,
          background: 'linear-gradient(135deg, var(--color-primary-bg, #fff3ed) 0%, #f8e8e0 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          fontSize: '48px',
          color: 'rgba(0,0,0,0.15)',
        }}
      >
        <span style={{ fontSize: '48px', lineHeight: 1 }}>🍽️</span>
        {fallbackText && (
          <span style={{ fontSize: '12px', color: 'rgba(0,0,0,0.25)', maxWidth: '90%', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {fallbackText}
          </span>
        )}
      </div>
    )
  }

  return (
    <>
      <img
        ref={imgRef}
        src={getProxiedImageUrl(src) || ''}
        alt={alt}
        loading="lazy"
        referrerPolicy="no-referrer"
        className={className}
        style={{
          ...style,
          opacity: loaded ? 1 : 0,
          filter: loaded ? 'blur(0)' : 'blur(10px)',
          transition: 'opacity 0.4s ease, filter 0.4s ease',
        }}
        onLoad={handleLoad}
        onError={handleError}
      />
      {!loaded && (
        <div
          className={`${className} image-placeholder-shimmer`}
          style={{
            ...style,
            position: 'absolute',
            top: 0,
            left: 0,
            background: gradient,
          }}
        />
      )}
    </>
  )
}