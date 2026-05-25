'use strict'

/**
 * utils/notificationHelper.js
 * 创建通知 + 发送 Web Push 推送
 * 兼容对象参数 createNotification({ userId, type, message, link, actorId, targetId, targetType })
 * 以及旧式位置参数（向后兼容）
 */

let NotificationModel
function getNotificationModel() {
  if (!NotificationModel) {
    NotificationModel = require('../models').Notification
  }
  return NotificationModel
}

let PushModel
function getPushModel() {
  if (!PushModel) {
    PushModel = require('../models').PushSubscription
  }
  return PushModel
}

/**
 * 兼容旧式位置参数调用: createNotification(recipient, type, actorId, targetId, targetType)
 * 新式对象调用: createNotification({ userId, type, message, link, actorId, targetId, targetType })
 */
async function createNotification(...args) {
  const Notification = getNotificationModel()

  let opts
  if (args.length > 1 || typeof args[0] !== 'object') {
    // 位置参数: (userId, type, actorId, targetId, targetType)
    opts = {
      userId: args[0],
      type: args[1] || 'system',
      actorId: args[2] || null,
      targetId: args[3] || null,
      targetType: args[4] || null,
      message: args[1] === 'follow' ? (args[2]?.username || '有人') + ' 关注了你' : '新通知',
      link: args[3] ? '/' + (args[4] || 'recipe') + '/' + args[3] : '/notifications'
    }
  } else {
    opts = args[0]
  }

  // 确保必填字段
  if (!opts.message && opts.type) {
    const typeMessages = {
      follow: (opts.actorName || '有人') + ' 关注了你',
      comment: '有人评论了你的内容',
      reply: (opts.actorName || '有人') + ' 回复了你的评论',
      favorite: '有人收藏了你的食谱',
      collection_add: '你的食谱被加入收藏集',
      achievement_unlock: '🏆 解锁了新成就！',
      challenge_update: '🏅 挑战赛有新的进展',
      system: '系统通知',
      meal_plan_reminder: '⏰ 餐单提醒',
      cooking_log_reminder: '📝 烹饪日志提醒'
    }
    opts.message = typeMessages[opts.type] || '新通知'
  }

  const notif = await Notification.create({
    userId: opts.userId,
    actorId: opts.actorId || null,
    type: opts.type || 'system',
    message: opts.message,
    link: opts.link || null,
    targetId: opts.targetId || null,
    targetType: opts.targetType || null,
    isRead: false
  })

  // 非阻塞发送 Web Push
  sendPushForNotification(opts).catch(() => {})

  return notif
}

/**
 * 根据用户通知偏好发送 Web Push 推送
 */
async function sendPushForNotification(opts) {
  try {
    const User = require('../models').User
    const PushSubscription = getPushModel()

    // 获取用户偏好
    const user = await User.findByPk(opts.userId, { attributes: ['preferences'] })
    if (!user) return

    let prefs = {}
    try {
      if (user.preferences && typeof user.preferences === 'string') {
        prefs = JSON.parse(user.preferences)
      } else if (user.preferences && typeof user.preferences === 'object') {
        prefs = user.preferences
      }
    } catch {
      prefs = {}
    }

    const notifPrefs = prefs.notificationPreferences || {}
    const typePref = notifPrefs[opts.type]
    // 默认启用推送，除非用户明确关闭
    if (typePref && typePref.push === false) return

    // 获取用户所有推送订阅
    const subs = await PushSubscription.findAll({ where: { userId: opts.userId } })
    if (subs.length === 0) return

    // 动态加载 web-push
    let webPush
    try {
      webPush = require('web-push')
    } catch {
      return // web-push 未安装
    }

    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY

    if (!vapidPublicKey || !vapidPrivateKey) return

    webPush.setVapidDetails(
      'mailto:' + (process.env.ADMIN_EMAIL || 'admin@food.com'),
      vapidPublicKey,
      vapidPrivateKey
    )

    const payload = JSON.stringify({
      title: '美食食谱',
      body: opts.message,
      icon: '/icon.svg',
      badge: '/icon.svg',
      data: { url: opts.link || '/notifications' }
    })

    for (const sub of subs) {
      try {
        await webPush.sendNotification({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth }
        }, payload)
      } catch (err) {
        // 410 Gone → 订阅过期，删除
        if (err.statusCode === 410) {
          sub.destroy().catch(() => {})
        }
        // 其他错误静默处理
      }
    }
  } catch (err) {
    console.error('[push error]', err.message)
  }
}

module.exports = { createNotification }