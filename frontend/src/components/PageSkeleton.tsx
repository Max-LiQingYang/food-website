import Skeleton from './Skeleton'
import RecipeCardSkeleton from './RecipeCardSkeleton'
import './PageSkeleton.css'

export type PageSkeletonType = 'home' | 'list' | 'detail' | 'profile' | 'default'

interface PageSkeletonProps {
  type?: PageSkeletonType
  columns?: 1 | 2 | 3 | 4
  rows?: number
  className?: string
}

export default function PageSkeleton({
  type = 'default',
  columns = 3,
  rows = 3,
  className = '',
}: PageSkeletonProps) {
  const cls = `page-skeleton page-skeleton--${type} ${className}`.trim()

  switch (type) {
    case 'home':
      return (
        <div className={cls}>
          <div className="ps-home__hero">
            <Skeleton className="ps-home__hero-bg" width="100%" height={280} rounded={14} />
            <div className="ps-home__hero-content">
              <Skeleton circle width={64} height={64} />
              <Skeleton width="60%" height={28} />
              <div className="ps-home__hero-ctas">
                <Skeleton width={100} height={36} rounded={18} />
                <Skeleton width={100} height={36} rounded={18} />
                <Skeleton width={100} height={36} rounded={18} />
              </div>
            </div>
          </div>
          <Skeleton width="40%" height={28} className="ps-home__section-title" />
          <div className="ps-grid" style={{ '--cols': columns } as React.CSSProperties}>
            {Array.from({ length: columns * rows }).map((_, i) => (
              <RecipeCardSkeleton key={i} />
            ))}
          </div>
        </div>
      )

    case 'list':
      return (
        <div className={cls}>
          <div className="ps-list__searchbar">
            <Skeleton width="100%" height={48} rounded={24} />
          </div>
          <div className="ps-list__filters">
            {[80, 100, 90, 110, 70].map((w, i) => (
              <Skeleton key={i} width={w} height={28} rounded={14} />
            ))}
          </div>
          <div className="ps-grid" style={{ '--cols': columns } as React.CSSProperties}>
            {Array.from({ length: columns * rows }).map((_, i) => (
              <RecipeCardSkeleton key={i} />
            ))}
          </div>
          <div className="ps-list__pagination">
            {[32, 32, 32, 32, 32].map((s, i) => (
              <Skeleton key={i} width={s} height={s} rounded={6} />
            ))}
          </div>
        </div>
      )

    case 'detail':
      return (
        <div className={cls}>
          <Skeleton className="ps-detail__cover" width="100%" height={360} rounded={14} />
          <div className="ps-detail__titleblock">
            <Skeleton width="70%" height={28} />
            <Skeleton width="50%" height={16} />
          </div>
          <div className="ps-detail__meta">
            <Skeleton circle width={36} height={36} />
            <Skeleton width={80} height={14} />
            <Skeleton width={60} height={14} />
            <Skeleton width={60} height={14} />
          </div>
          <div className="ps-detail__desc">
            <Skeleton width="100%" height={14} />
            <Skeleton width="80%" height={14} />
          </div>
          <Skeleton width={120} height={24} />
          <div className="ps-detail__ingredients">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} width="100%" height={32} rounded={6} />
            ))}
          </div>
          <Skeleton width={120} height={24} />
          <div className="ps-detail__steps">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="ps-detail__step">
                <Skeleton width={28} height={28} circle />
                <Skeleton width="90%" height={14} />
              </div>
            ))}
          </div>
        </div>
      )

    case 'profile':
      return (
        <div className={cls}>
          <div className="ps-profile__header">
            <Skeleton circle width={96} height={96} />
            <div className="ps-profile__id">
              <Skeleton width="40%" height={22} />
              <Skeleton width="30%" height={14} />
            </div>
          </div>
          <div className="ps-profile__stats">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="ps-profile__stat">
                <Skeleton width={48} height={24} />
                <Skeleton width={60} height={12} />
              </div>
            ))}
          </div>
          <div className="ps-profile__heatmap">
            <Skeleton width="100%" height={120} rounded={8} />
          </div>
          <div className="ps-profile__tabs">
            {[80, 80, 80, 80].map((w, i) => (
              <Skeleton key={i} width={w} height={32} rounded={6} />
            ))}
          </div>
          <div className="ps-grid" style={{ '--cols': columns } as React.CSSProperties}>
            {Array.from({ length: columns * rows }).map((_, i) => (
              <RecipeCardSkeleton key={i} />
            ))}
          </div>
        </div>
      )

    default:
      return (
        <div className={cls}>
          <Skeleton circle width={96} height={96} />
          <Skeleton width="60%" height={22} />
          <Skeleton width="40%" height={14} />
        </div>
      )
  }
}
