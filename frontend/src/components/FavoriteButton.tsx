import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { addFavorite, removeFavorite, getFavoriteStatus } from '../api'
import { useAuth } from '../context/AuthContext'
import './FavoriteButton.css'

interface FavoriteButtonProps {
  recipeId: string
  /** Show inline (small) inside RecipeCard, or standalone */
  inline?: boolean
}

export default function FavoriteButton({ recipeId, inline }: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(false)
  const [loading, setLoading] = useState(false)
  const [animating, setAnimating] = useState(false)
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    if (!isAuthenticated) {
      setIsFavorited(false)
      return
    }
    getFavoriteStatus(recipeId).then(res => {
      const data = res.data || res
      setIsFavorited(data.isFavorited === true)
    }).catch(() => {})
  }, [recipeId, isAuthenticated])

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (loading) return
    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    setLoading(true)
    try {
      if (isFavorited) {
        await removeFavorite(recipeId)
        setIsFavorited(false)
      } else {
        await addFavorite(recipeId)
        setIsFavorited(true)
        setAnimating(true)
        setTimeout(() => setAnimating(false), 600)
      }
    } catch {
      // revert on error
      setIsFavorited(prev => !prev)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      className={`favorite-btn ${isFavorited ? 'favorite-btn--active' : ''} ${animating ? 'favorite-btn--pop' : ''} ${inline ? 'favorite-btn--inline' : ''}`}
      onClick={handleClick}
      disabled={loading}
      aria-label={isFavorited ? '取消收藏' : '收藏'}
    >
      <svg viewBox="0 0 24 24" width={inline ? 18 : 22} height={inline ? 18 : 22} className="favorite-btn__heart">
        <path
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          fill="currentColor"
        />
      </svg>
    </button>
  )
}