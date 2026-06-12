import { useState } from 'react'
import { putUserRatingPrivacy } from '../../api'

interface RatingPrivacyToggleProps {
  ratingsHistoryPublic: boolean
  onChange?: (next: boolean) => void
}

export default function RatingPrivacyToggle({ ratingsHistoryPublic, onChange }: RatingPrivacyToggleProps) {
  const [busy, setBusy] = useState(false)
  // 乐观更新：本地状态领先于服务端
  const [optimistic, setOptimistic] = useState<boolean | null>(null)
  const current = optimistic !== null ? optimistic : ratingsHistoryPublic

  const handleToggle = async () => {
    if (busy) return
    const next = !current
    setOptimistic(next) // 乐观更新
    setBusy(true)
    try {
      // 父级需要传 userId；为简化，子组件直接调 API
      const userId = getCurrentUserId()
      if (!userId) {
        // 兜底：仅 UI 切换
        onChange?.(next)
        return
      }
      await putUserRatingPrivacy(userId, next)
      onChange?.(next)
    } catch (err) {
      console.error('[RatingPrivacyToggle] toggle failed', err)
      // 回滚
      setOptimistic(null)
      // 简单提示（避免引入 toast 依赖）
      alert('切换失败，请重试')
    } finally {
      setBusy(false)
      setOptimistic(null)
    }
  }

  return (
    <div className="rhm-privacy">
      <span>{current ? '公开' : '仅自己可见'}</span>
      <button
        className={`rhm-privacy__switch${current ? ' rhm-privacy__switch--on' : ''}`}
        onClick={handleToggle}
        disabled={busy}
        role="switch"
        aria-checked={current}
        aria-label="评分历史可见性"
      >
        <span className="rhm-privacy__switch-knob" />
      </button>
    </div>
  )
}

/** 从 localStorage 拿当前用户 ID（避免 import AuthContext） */
function getCurrentUserId(): string | null {
  try {
    const raw = localStorage.getItem('user') || localStorage.getItem('currentUser')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.id || parsed?.userId || null
  } catch {
    return null
  }
}
