import Skeleton from './Skeleton'
import './RecipeCardSkeleton.css'

export default function RecipeCardSkeleton() {
  return (
    <div className="recipe-card-skeleton">
      <Skeleton width="100%" height={0} className="rcs-cover" />
      <div className="rcs-body">
        <Skeleton width="70%" height={18} />
        <Skeleton width="40%" height={14} rounded={4} />
        <Skeleton width="50%" height={14} rounded={10} />
      </div>
    </div>
  )
}