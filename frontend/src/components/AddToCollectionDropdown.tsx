import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCollections, addRecipeToCollection, type Collection } from '../api'
import { useToast } from '../context/ToastContext'
import './AddToCollectionDropdown.css'

interface AddToCollectionDropdownProps {
  recipeId: string
  /** Custom button label (default: "📁 收藏到") */
  label?: string
  /** Extra className for the wrapper */
  className?: string
}

export default function AddToCollectionDropdown({
  recipeId,
  label = '📁 收藏到',
  className,
}: AddToCollectionDropdownProps) {
  const [open, setOpen] = useState(false)
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const toast = useToast()

  const fetchCollections = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    setLoading(true)
    try {
      const res: any = await getCollections()
      setCollections(res.data?.list ?? res.list ?? [])
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      fetchCollections()
    }
  }, [open, fetchCollections])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const token = localStorage.getItem('token')
    if (!token) {
      toast.warning('请先登录')
      navigate('/login')
      return
    }
    setOpen(prev => !prev)
  }

  const handleAdd = async (collectionId: string) => {
    if (adding) return
    setAdding(collectionId)
    try {
      await addRecipeToCollection(collectionId, recipeId)
      toast.success('已添加到收藏夹')
      setOpen(false)
    } catch (err: any) {
      toast.error(err?.message || '添加失败')
    } finally {
      setAdding(null)
    }
  }

  return (
    <div className={`atc-dropdown ${className ?? ''}`} ref={dropdownRef}>
      <button
        className="atc-dropdown__trigger"
        onClick={handleToggle}
        title="添加到收藏夹"
      >
        {label}
      </button>

      {open && (
        <div className="atc-dropdown__menu">
          <div className="atc-dropdown__header">
            <span>添加到收藏夹</span>
          </div>

          {loading && (
            <div className="atc-dropdown__loading">加载中...</div>
          )}

          {!loading && collections.length === 0 && (
            <div className="atc-dropdown__empty">
              <p>还没有收藏夹</p>
              <button
                className="atc-dropdown__create-link"
                onClick={(e) => {
                  e.stopPropagation()
                  setOpen(false)
                  navigate('/collections')
                }}
              >
                + 创建收藏夹
              </button>
            </div>
          )}

          {!loading && collections.length > 0 && (
            <ul className="atc-dropdown__list">
              {collections.map(col => (
                <li key={col.id} className="atc-dropdown__item">
                  <button
                    className="atc-dropdown__item-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAdd(col.id)
                    }}
                    disabled={adding === col.id}
                  >
                    <span className="atc-dropdown__item-name">📁 {col.name}</span>
                    <span className="atc-dropdown__item-count">{col.recipeCount ?? 0} 个食谱</span>
                    {adding === col.id && <span className="atc-dropdown__item-spinner">⏳</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="atc-dropdown__footer">
            <button
              className="atc-dropdown__manage-link"
              onClick={(e) => {
                e.stopPropagation()
                setOpen(false)
                navigate('/collections')
              }}
            >
              管理收藏夹
            </button>
          </div>
        </div>
      )}
    </div>
  )
}