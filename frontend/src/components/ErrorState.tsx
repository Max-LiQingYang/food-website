import { useNavigate } from 'react-router-dom'
import './ErrorState.css'

interface HotTag {
  text: string
  onClick?: () => void
}

interface Props {
  /** 错误代码，格式: ERR_{PAGE}_{STATUS} */
  errorCode: 'ERR_HOME_500' | 'ERR_CATEGORY_500' | 'ERR_SEARCH_500' | string
  /** 重试回调 */
  onRetry: () => void
  /** 自定义标题（不传则根据 errorCode 映射） */
  title?: string
  /** 自定义描述（不传则根据 errorCode 映射） */
  description?: string
  /** 搜索无结果时的热搜标签 */
  hotTags?: HotTag[]
  /** 额外 className */
  className?: string
}

const errorMappings: Record<string, { title: string; description: string; icon: string }> = {
  'ERR_HOME_500': {
    title: '加载推荐食谱失败',
    description: '请检查网络连接后重试',
    icon: '⚠️',
  },
  'ERR_CATEGORY_500': {
    title: '加载分类食谱失败',
    description: '请稍后重试或切换其他分类',
    icon: '📡',
  },
  'ERR_SEARCH_500': {
    title: '搜索请求失败',
    description: '请检查网络连接后重试',
    icon: '🌐',
  },
  'default': {
    title: '加载失败',
    description: '请稍后重试',
    icon: '⚠️',
  },
}

export default function ErrorState({
  errorCode,
  onRetry,
  title,
  description,
  hotTags,
  className = '',
}: Props) {
  const mapping = errorMappings[errorCode] || errorMappings['default']
  const displayTitle = title || mapping.title
  const displayDescription = description || mapping.description
  const displayIcon = mapping.icon

  return (
    <div className={`error-state ${className}`} role="alert" aria-live="assertive">
      <div className="error-state__icon">{displayIcon}</div>

      <h3 className="error-state__title">{displayTitle}</h3>

      {displayDescription && (
        <p className="error-state__desc">{displayDescription}</p>
      )}

      {hotTags && hotTags.length > 0 && (
        <>
          <p className="error-state__hot-label">💡 试试这些热搜词：</p>
          <div className="error-state__hot-tags">
            {hotTags.map((tag, i) => (
              <button
                key={i}
                className="error-state__hot-tag"
                onClick={tag.onClick}
                type="button"
              >
                {tag.text}
              </button>
            ))}
          </div>
        </>
      )}

      <button
        className="error-state__cta"
        onClick={onRetry}
        type="button"
      >
        重试
      </button>

      <div className="error-state__code">{errorCode}</div>
    </div>
  )
}
