import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import type { Recipe } from '../../api'
import { tapFeedback } from '../../utils/hapticFeedback'
import './RecipeActionMenu.css'

interface RecipeActionMenuProps {
  recipe: Recipe
  /** Position to anchor the menu (desktop) */
  anchorRect: { x: number; y: number; width: number; height: number } | null
  /** Whether to show as bottom sheet (mobile) */
  isMobile: boolean
  onClose: () => void
  onFavorite: () => void
  onShopping: () => void
  onMealPlan: () => void
  onShare: () => void
  onCollection: () => void
}

const MENU_ITEMS = [
  { key: 'favorite', icon: '❤️', label: '收藏' },
  { key: 'shopping', icon: '🛒', label: '加入购物清单' },
  { key: 'mealplan', icon: '📅', label: '加入餐单计划' },
  { key: 'share', icon: '📤', label: '分享' },
  { key: 'collection', icon: '📁', label: '添加到收藏夹' },
] as const

export default function RecipeActionMenu({
  recipe,
  anchorRect,
  isMobile,
  onClose,
  onFavorite,
  onShopping,
  onMealPlan,
  onShare,
  onCollection,
}: RecipeActionMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [onClose])

  // Esc to close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleAction = useCallback(
    (key: string) => {
      tapFeedback()
      onClose()
      switch (key) {
        case 'favorite': onFavorite(); break
        case 'shopping': onShopping(); break
        case 'mealplan': onMealPlan(); break
        case 'share': onShare(); break
        case 'collection': onCollection(); break
      }
    },
    [onClose, onFavorite, onShopping, onMealPlan, onShare, onCollection]
  )

  // Desktop: position below the anchor
  let style: React.CSSProperties = {}
  if (!isMobile && anchorRect) {
    const menuWidth = 190
    let left = anchorRect.x
    let top = anchorRect.y + anchorRect.height + 4

    // Keep within viewport
    if (left + menuWidth > window.innerWidth - 8) {
      left = window.innerWidth - menuWidth - 8
    }
    if (top + MENU_ITEMS.length * 44 + 12 > window.innerHeight - 8) {
      top = anchorRect.y - MENU_ITEMS.length * 44 - 12
    }

    style = { left: `${left}px`, top: `${top}px` }
  }

  const content = (
    <div
      ref={menuRef}
      className={`action-menu${isMobile ? ' action-menu--mobile' : ''}`}
      style={style}
      role="menu"
    >
      {MENU_ITEMS.map(item => (
        <button
          key={item.key}
          className="action-menu__item"
          onClick={() => handleAction(item.key)}
          role="menuitem"
        >
          <span className="action-menu__icon">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  )

  return createPortal(content, document.body)
}