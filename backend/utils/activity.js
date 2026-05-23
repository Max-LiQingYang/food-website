'use strict'

/**
 * utils/activity.js
 * 活动记录工具函数
 *
 * 统一入口，供各路由在业务操作完成后记录用户活动
 */

const { Activity } = require('../models')

/**
 * 创建活动记录
 * @param {string} userId - 用户 ID
 * @param {string} type   - 活动类型：create_recipe / comment / favorite / follow / review
 * @param {string} [targetId]    - 目标对象主键 ID
 * @param {string} [targetType]  - 目标类型：recipe / user / comment
 * @param {object} [extra]       - 附加信息对象（将被 JSON.stringify）
 */
async function createActivity(userId, type, targetId, targetType, extra) {
  try {
    await Activity.create({
      userId,
      type,
      targetId: targetId || null,
      targetType: targetType || null,
      extra: extra ? JSON.stringify(extra) : null
    })
  } catch (err) {
    console.error(`[activity/${type}] Error:`, err.message)
  }
}

module.exports = { createActivity }