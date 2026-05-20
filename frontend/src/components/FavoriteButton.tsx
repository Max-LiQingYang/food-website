import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addFavorite, removeFavorite } from '../api'
import './FavoriteButton.css'

interface FavoriteButtonProps {
  recipeId: string
  isFavorited: boolean
  onToggle?: () => void
}

export default function FavoriteButton({ recipeId, isFavorited, onToggle }: FavoriteButtonProps) {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleClick = async () => {
    if (loading) return
    const token = localStorage.getItem('token')
    if (!token) {
      alert('请先登录')
      navigate('/login')
      return
    }

    setLoading(true)
    try {
      if (isFavorited) {
        await removeFavorite(recipeId)
      } else {
        await addFavorite(recipeId)
      }
      onToggle?.()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button onClick={handleClick} disabled={loading}>
      {isFavorited ? '已收藏' : '收藏'}
    </button>
  )
}
