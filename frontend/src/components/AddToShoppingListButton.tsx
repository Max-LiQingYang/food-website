import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateShoppingList } from '../api'
import { useToast } from '../context/ToastContext'
import './AddToShoppingListButton.css'

interface AddToShoppingListButtonProps {
  recipeId: string
  /** Custom label (default: "🛒 加入购物清单") */
  label?: string
  /** Extra className */
  className?: string
}

export default function AddToShoppingListButton({
  recipeId,
  label = '🛒 加入购物清单',
  className,
}: AddToShoppingListButtonProps) {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    const token = localStorage.getItem('token')
    if (!token) {
      toast.warning('请先登录')
      navigate('/login')
      return
    }

    setLoading(true)
    try {
      await generateShoppingList([recipeId])
      toast.success('已生成购物清单')
    } catch (err: any) {
      toast.error(err?.message || '生成失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      className={`atsl-btn ${className ?? ''}`}
      onClick={handleClick}
      disabled={loading}
      title="生成购物清单"
    >
      {loading ? '⏳ 生成中...' : label}
    </button>
  )
}