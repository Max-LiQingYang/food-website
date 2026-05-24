import React, { useState } from 'react'
import './ToggleList.css'

interface ToggleListProps {
  /** 初始最多显示的项目数 */
  limit?: number
  /** 子元素 */
  children: React.ReactNode
  /** 展开/折叠按钮的自定义文本 */
  showMoreText?: string
  showLessText?: string
}

const ToggleList: React.FC<ToggleListProps> = ({
  limit = 5,
  children,
  showMoreText = '展开更多',
  showLessText = '收起',
}) => {
  const [expanded, setExpanded] = useState(false)
  const items = React.Children.toArray(children)
  const visible = expanded ? items : items.slice(0, limit)
  const needsToggle = items.length > limit

  return (
    <div className="toggle-list">
      {visible}
      {needsToggle && (
        <button
          className="toggle-list__btn"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          <span>{expanded ? showLessText : showMoreText}</span>
          <span className={`toggle-list__arrow ${expanded ? 'toggle-list__arrow--up' : ''}`}>
            ▼
          </span>
        </button>
      )}
    </div>
  )
}

export default ToggleList