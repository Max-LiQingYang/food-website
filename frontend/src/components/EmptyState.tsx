import { useNavigate } from 'react-router-dom'
import './EmptyState.css'

interface HotTag {
  text: string
  onClick?: () => void
}

interface Props {
  /** Emoji or icon string */
  icon?: string
  /** 主标题 */
  title: string
  /** 描述文字 */
  description?: string
  /** 主按钮文字（不传则不显示按钮） */
  ctaText?: string
  /** 按钮链接（优先于 onClick） */
  ctaLink?: string
  /** 按钮回调 */
  ctaOnClick?: () => void
  /** 次要按钮文字 */
  ctaSecondaryText?: string
  /** 次要按钮链接 */
  ctaSecondaryLink?: string
  /** 次要按钮回调 */
  ctaSecondaryOnClick?: () => void
  /** 变体：default / compact / search */
  variant?: 'default' | 'compact' | 'search'
  /** 搜索无结果时的热搜标签 */
  hotTags?: HotTag[]
  /** 额外 className */
  className?: string
}

const variantIcons: Record<string, string> = {
  default: '📋',
  compact: '📝',
  search: '🔍',
}

export default function EmptyState({
  icon,
  title,
  description,
  ctaText,
  ctaLink,
  ctaOnClick,
  ctaSecondaryText,
  ctaSecondaryLink,
  ctaSecondaryOnClick,
  variant = 'default',
  hotTags,
  className = '',
}: Props) {
  const navigate = useNavigate()
  const displayIcon = icon || variantIcons[variant] || variantIcons.default

  const handleCtaClick = () => {
    if (ctaLink) navigate(ctaLink)
    else ctaOnClick?.()
  }

  const handleSecondaryClick = () => {
    if (ctaSecondaryLink) navigate(ctaSecondaryLink)
    else ctaSecondaryOnClick?.()
  }

  return (
    <div className={`empty-state empty-state--${variant} ${className}`} role="status">
      <div className="empty-state__icon">{displayIcon}</div>

      {title && <h3 className="empty-state__title">{title}</h3>}

      {description && <p className="empty-state__desc">{description}</p>}

      {(ctaText || ctaSecondaryText) && (
        <div className="empty-state__actions">
          {ctaText && (
            <button className="empty-state__cta" onClick={handleCtaClick}>
              {ctaText}
            </button>
          )}
          {ctaSecondaryText && (
            <button className="empty-state__cta empty-state__cta--outline" onClick={handleSecondaryClick}>
              {ctaSecondaryText}
            </button>
          )}
        </div>
      )}

      {hotTags && hotTags.length > 0 && (
        <>
          <p className="empty-state__hot-label">💡 试试这些热搜词：</p>
          <div className="empty-state__hot-tags">
            {hotTags.map((tag, i) => (
              <button key={i} className="empty-state__hot-tag" onClick={tag.onClick}>
                {tag.text}
              </button>
            ))}
          </div>
        </>
      )}

      {variant === 'search' && (
        <div className="empty-state__tips">
          <p>试试这些热门搜索：</p>
          <div className="empty-state__tags">
            {['宫保鸡丁', '红烧肉', '蛋糕', '沙拉', '炒饭'].map(tag => (
              <span key={tag} className="empty-state__tag">{tag}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}