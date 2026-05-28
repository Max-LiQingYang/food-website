/**
 * AchievementToast helper
 * 使用现有 ToastContext 显示成就解锁通知
 * 样式通过 global.css 中的 .qclaw-toast--achievement 实现
 */
import { useToast } from '../context/ToastContext'

export function useAchievementToast() {
  const toast = useToast()

  function showAchievementUnlock(icon: string, title: string) {
    toast.info(`${icon} 🎉 新成就解锁！${title}`)
  }

  return { showAchievementUnlock }
}

export default useAchievementToast