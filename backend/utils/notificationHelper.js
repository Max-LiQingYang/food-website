'use strict'

/**
 * utils/notificationHelper.js
 * 创建通知的辅助函数
 */

async function createNotification({ userId, type, message, link }) {
  const { Notification } = require('../models')
  return await Notification.create({ userId, type, message, link })
}

module.exports = { createNotification }