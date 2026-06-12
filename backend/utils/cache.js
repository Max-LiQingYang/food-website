'use strict'

/**
 * utils/cache.js
 * 进程内 LRU 缓存工具
 *
 * 背景：当前后端无 Redis 依赖（ARCH §0），采用单实例进程内 LRU 缓存。
 *       数据量小（单用户聚合 < 10ms），ns 级访问延迟，TTL + 主动失效 hook 兜底一致性。
 *
 * 选型：lru-cache@^10.x（轻量、零依赖、API 稳定）
 *       pin minor 升级需 review changelog（ARCH §7 风险表）
 *
 * 设计原则：
 *   - 进程级单例（module-level new LRU()）
 *   - 提供 get/set/del/delByPrefix 4 个核心方法
 *   - key 前缀语义化：rating:summary:{userId}:{timeRange} 等（ARCH §1.7.2）
 *   - 主动失效：路由层 hook 而非 Sequelize hook（ARCH §1.7.3）
 *   - 多实例不共享：当前单实例部署可接受；升级到 Redis 只需替换本文件，调用方不动
 *
 * 迁移到 Redis 的路径（ARCH §7.2.1）：
 *   - 保持 get/set/del/delByPrefix 接口签名
 *   - 内部用 ioredis 实现；LruCache 类 → RedisCache 类
 *   - 调用方 (routes/*) 不需要改一行
 */

const { LRUCache } = require('lru-cache')

/** 默认配置：max=1000 条（ARCH §1.7.1 选型） */
const DEFAULT_MAX = 1000

/**
 * 单一 LRU 实例（进程级）
 * - ttl=0 表示不自动过期，调用方需显式传 ttl
 * - 每个 set 调用可指定独立 ttl（覆盖默认）
 * - lru-cache@^10 只数条数（不基于内存 size）— 不要传 sizeCalculation（需要 maxSize 配合）
 */
const cache = new LRUCache({
  max: DEFAULT_MAX,
  ttl: 0,
  // 自动清理过期项（lru-cache v10 默认开启，但显式声明更清晰）
  ttlAutopurge: true
})

/**
 * 读取缓存值
 * @param {string} key 完整 key
 * @returns {any} 缓存值；miss 返回 undefined
 */
function get(key) {
  if (!key) return undefined
  return cache.get(key)
}

/**
 * 写入缓存
 * @param {string} key 完整 key
 * @param {any} value 任意可序列化值
 * @param {number} [ttlMs] 过期时间（毫秒），缺省则不自动过期
 */
function set(key, value, ttlMs) {
  if (!key) return
  const opts = ttlMs && ttlMs > 0 ? { ttl: ttlMs } : undefined
  cache.set(key, value, opts)
}

/**
 * 删除单个 key
 * @param {string} key
 * @returns {boolean} 是否实际删除
 */
function del(key) {
  if (!key) return false
  return cache.delete(key)
}

/**
 * 按前缀批量删除（用于缓存失效 hook）
 * lru-cache v10 没有原生 prefix delete，需遍历 keys
 * @param {string} prefix key 前缀，如 'rating:summary:'
 * @returns {number} 删除的条目数
 */
function delByPrefix(prefix) {
  if (!prefix) return 0
  let count = 0
  // 收集所有匹配的 key（避免在迭代中删除）
  const matched = []
  for (const key of cache.keys()) {
    if (typeof key === 'string' && key.startsWith(prefix)) {
      matched.push(key)
    }
  }
  for (const key of matched) {
    if (cache.delete(key)) count++
  }
  return count
}

/**
 * 清空整个缓存（紧急情况下使用，如配置变更后）
 */
function clear() {
  cache.clear()
}

/**
 * 获取当前缓存统计（调试 / 监控用）
 * @returns {{size: number, max: number}}
 */
function stats() {
  return {
    size: cache.size,
    max: DEFAULT_MAX
  }
}

module.exports = {
  get,
  set,
  del,
  delByPrefix,
  clear,
  stats
}
