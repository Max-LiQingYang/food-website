import React from 'react'
import './AuthorLevelBadge.css'

interface AuthorLevelBadgeProps {
  level: number
  title: string
  icon: string
  compact?: boolean
  className?: string
}

export default function AuthorLevelBadge({ level, title, icon, compact, className }: AuthorLevelBadgeProps) {
  return (
    <span className={`author-level-badge ${compact ? 'author-level-badge--compact' : ''} ${className || ''}`}>
      <span className="author-level-badge__icon">{icon}</span>
      <span className="author-level-badge__text">
        Lv.{level} {title}
      </span>
    </span>
  )
}