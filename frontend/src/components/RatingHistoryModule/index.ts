/**
 * RatingHistoryModule 桶导出（UI §1.2 容器 + 8 个子组件）
 * 迭代 #134：用户个人评分历史可视化
 * 同时 default 导出主容器组件，供 `import RatingHistoryModule from '...'` 使用
 */

import RatingHistoryModule from './RatingHistoryModule'
export { default as RatingDimensionAverages } from './RatingDimensionAverages'
export { default as RatingRadar } from './RatingRadar'
export { default as RatingTrendChart } from './RatingTrendChart'
export { default as RatingDistribution } from './RatingDistribution'
export { default as RatingTopList } from './RatingTopList'
export { default as RatingHistoryList } from './RatingHistoryList'
export { default as RatingPrivacyToggle } from './RatingPrivacyToggle'
export { default as RatingEmptyState } from './RatingEmptyState'

export { RatingHistoryModule }
export default RatingHistoryModule
