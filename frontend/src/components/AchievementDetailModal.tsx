import React from 'react'
import type { AchievementItem } from '../api'

interface AchievementDetailModalProps {
  achievement: AchievementItem
  onClose: () => void
}

const CATEGORY_LABELS: Record<string, string> = {
  publisher: '发布者',
  collector: '收藏家',
  commenter: '评论家',
  cook: '厨神（烹饪）',
  explorer: '探索家',
  social: '社交达人',
}

const CATEGORY_COLORS: Record<string, string> = {
  publisher: '#e8663e',
  collector: '#e84e8a',
  commenter: '#4a9eff',
  cook: '#f5a623',
  explorer: '#7ed321',
  social: '#bd10e0',
}

export default function AchievementDetailModal({ achievement, onClose }: AchievementDetailModalProps) {
  const { unlocked, title, description, icon, category, progress, maxProgress, unlockedAt } = achievement
  const categoryLabel = CATEGORY_LABELS[category || ''] || category || '通用'
  const accentColor = CATEGORY_COLORS[category || ''] || '#e8663e'
  const unlockedDate = unlockedAt ? new Date(unlockedAt).toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric'
  }) : null

  function handleShare() {
    const text = `我在美食社区解锁了成就「${icon} ${title}」！${unlocked ? '' : `当前进度 ${progress}/${maxProgress}`}`
    if (navigator.share) {
      navigator.share({ title, text }).catch(() => {})
    } else {
      navigator.clipboard.writeText(text).catch(() => {})
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="achievement-detail-modal" onClick={e => e.stopPropagation()}>
        {/* 关闭按钮 */}
        <button className="achievement-detail-modal__close" onClick={onClose} aria-label="关闭">✕</button>

        {/* 大图标 */}
        <div
          className="achievement-detail-modal__icon-wrapper"
          style={{ '--accent-color': accentColor } as React.CSSProperties}
        >
          <div className={`achievement-detail-modal__glow ${unlocked ? 'achievement-detail-modal__glow--unlocked' : ''}`}>
            <span className="achievement-detail-modal__icon">{icon || '🎖️'}</span>
          </div>
        </div>

        {/* 标题 */}
        <h2 className="achievement-detail-modal__title">{title}</h2>

        {/* 分类标签 */}
        <span className="achievement-detail-modal__category" style={{ background: accentColor }}>
          {categoryLabel}
        </span>

        {/* 描述 */}
        <p className="achievement-detail-modal__desc">{description}</p>

        {/* 如何获得 */}
        <p className="achievement-detail-modal__hint">
          💡 {category === 'publisher' ? '发布更多食谱即可解锁' :
             category === 'collector' ? '收藏更多食谱即可解锁' :
             category === 'commenter' ? '发表更多评论即可解锁' :
             category === 'cook' ? '记录更多烹饪日志即可解锁' :
             category === 'explorer' ? '浏览更多食谱即可解锁' :
             category === 'social' ? '获得更多关注和互动即可解锁' :
             '继续使用社区功能即可解锁'}
        </p>

        {/* 进度 */}
        {progress != null && maxProgress != null && (
          <div className="achievement-detail-modal__progress-section">
            <div className="achievement-detail-modal__progress-bar">
              <div
                className="achievement-detail-modal__progress-fill"
                style={{
                  width: `${Math.min(100, (progress / maxProgress) * 100)}%`,
                  background: unlocked ? 'linear-gradient(90deg, #f5a623, #f7c948)' : accentColor,
                }}
              />
            </div>
            <span className="achievement-detail-modal__progress-text">
              {unlocked ? `✅ 已达成 (${maxProgress})` : `当前进度：${progress} / ${maxProgress}`}
            </span>
          </div>
        )}

        {/* 解锁时间 */}
        {unlocked && unlockedDate && (
          <p className="achievement-detail-modal__date">
            🎉 解锁于 {unlockedDate}
          </p>
        )}

        {/* 分享按钮 */}
        <button className="btn btn--outline achievement-detail-modal__share" onClick={handleShare}>
          📤 分享成就
        </button>
      </div>
    </div>
  )
}