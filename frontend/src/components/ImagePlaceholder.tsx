import { useState, useRef, useEffect } from 'react'
import { generateColorFromString } from '../utils/imageColor'

interface ImagePlaceholderProps {
  src: string
  alt: string
  className?: string
  style?: React.CSSProperties
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void
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
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '56px',
          color: 'rgba(0,0,0,0.15)',
        }}
      >
        🍽️
      </div>
    )
  }

  return (
    <>
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading="lazy"
        className={className}
        style={{
          ...style,
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
        onLoad={handleLoad}
        onError={handleError}
      />
      {!loaded && (
        <div
          className={className}
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