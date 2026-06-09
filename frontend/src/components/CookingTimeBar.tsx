import React from 'react'
import './CookingTimeBar.css'

interface CookingTimeBarProps {
  cookTime: number
  difficulty?: string
  maxTime?: number
}

const TIME_CATEGORIES = {
  quick: { label: '快速', icon: '⚡', color: '#22c55e', max: 15 },
  normal: { label: '普通', icon: '⏱', color: '#f59e0b', max: 45 },
  slow: { label: '慢炖', icon: '🍲', color: '#e8663e', max: Infinity },
} as const

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: '🟢 简单',
  medium: '🟡 中等',
  hard: '🔴 困难',
}

export default function CookingTimeBar({ cookTime, difficulty, maxTime = 180 }: CookingTimeBarProps) {
  const percentage = Math.min((cookTime / maxTime) * 100, 100)
  const category = cookTime <= 15 ? 'quick' : cookTime <= 45 ? 'normal' : 'slow'
  const cat = TIME_CATEGORIES[category]
  const diffLabel = difficulty ? DIFFICULTY_LABELS[difficulty] : null

  return (
    <div className="cooking-time-bar">
      <div className="cooking-time-bar__header">
        <span className="cooking-time-bar__icon">⏱</span>
        <span className="cooking-time-bar__title">烹饪时间</span>
      </div>
      <div className="cooking-time-bar__track">
        <div
          className={`cooking-time-bar__fill cooking-time-bar__fill--${category}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="cooking-time-bar__info">
        <span className="cooking-time-bar__value">
          {cat.icon} {cookTime} 分钟
        </span>
        {diffLabel && (
          <span className="cooking-time-bar__difficulty">{diffLabel}</span>
        )}
      </div>
      <div className="cooking-time-bar__labels">
        <span>⚡ 快速</span>
        <span>⏱ 普通</span>
        <span>🍲 慢炖</span>
      </div>
    </div>
  )
}
