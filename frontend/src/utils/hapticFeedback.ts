/**
 * 触觉反馈工具函数
 * 使用 navigator.vibrate API 提供轻触反馈
 * 自动检测浏览器支持，不支持时静默忽略
 */

const SUPPORTS_VIBRATE = typeof navigator !== 'undefined' && 'vibrate' in navigator

/**
 * 轻触反馈（10ms）
 * 适用于：收藏按钮、标签切换、列表项点击
 */
export function tapFeedback(): void {
  if (SUPPORTS_VIBRATE) {
    navigator.vibrate(10)
  }
}

/**
 * 确认反馈（15ms，稍强）
 * 适用于：表单提交成功、收藏确认、点赞
 */
export function confirmFeedback(): void {
  if (SUPPORTS_VIBRATE) {
    navigator.vibrate(15)
  }
}

/**
 * 错误/拒绝反馈（两次短脉冲）
 * 适用于：操作失败、输入错误
 */
export function errorFeedback(): void {
  if (SUPPORTS_VIBRATE) {
    navigator.vibrate([20, 30, 20])
  }
}

/**
 * 长按反馈（30ms）
 * 适用于：长按触发菜单
 */
export function longPressFeedback(): void {
  if (SUPPORTS_VIBRATE) {
    navigator.vibrate(30)
  }
}

/**
 * 刷新完成反馈（短促三连）
 * 适用于：下拉刷新完成
 */
export function refreshCompleteFeedback(): void {
  if (SUPPORTS_VIBRATE) {
    navigator.vibrate([10, 30, 10, 30, 15])
  }
}