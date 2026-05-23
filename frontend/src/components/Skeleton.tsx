import './Skeleton.css'

interface SkeletonProps {
  width?: string | number
  height?: string | number
  rounded?: string | number
  circle?: boolean
  className?: string
}

export default function Skeleton({
  width = '100%',
  height = 16,
  rounded,
  circle,
  className = '',
}: SkeletonProps) {
  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius: circle ? '50%' : rounded !== undefined ? rounded : 'var(--radius-sm)',
  }

  return <div className={`skeleton ${className}`} style={style} />
}