'use strict'

/**
 * utils/notificationHelper.js
 * 创建通知 + 发送 Web Push 推送
 *
 * 兼容对象参数 createNotification({ userId, type, message, link, actorId, targetId, targetType })
 * 以及旧式位置参数（向后兼容）
 *
 * Web Push 流程：
 *   1. createNotification() 写入站内通知（按用户 inApp 偏好；若关闭则跳过）
 *   2. 非阻塞调用 sendPushForNotification()：根据 push 偏好遍历 PushSubscription 发送
 *   3. 失败时清理过期订阅（statusCode 410 / 404 自动删除 endpoint）
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

// 单例 web-push 实例（避免每次调用都重新 setVapidDetails）
let webPushReady = null
function getWebPush() {
  if (webPushReady !== null) return webPushReady
  try {
    const webPush = require('web-push')
    const publicKey = process.env.VAPID_PUBLIC_KEY
    const privateKey = process.env.VAPID_PRIVATE_KEY
    const subject = process.env.VAPID_SUBJECT || 'mailto:admin@food-website.com'
    if (!publicKey || !privateKey) {
      webPushReady = false
      return false
    }
    webPush.setVapidDetails(subject, publicKey, privateKey)
    webPushReady = webPush
    return webPush
  } catch (err) {
    console.error('[web-push init err]', err && err.message)
    webPushReady = false
    return false
  }
}

/**
 * 解析用户 preferences JSON
 */
function parsePreferences(rawPrefs) {
  if (!rawPrefs) return {}
  try {
    if (typeof rawPrefs === 'string') return JSON.parse(rawPrefs)
    if (typeof rawPrefs === 'object') return rawPrefs
  } catch {
    return {}
  }
  return {}
}

/**
 * 从用户偏好中读取某类通知的 channel 开关（默认全开）
 * 返回 { inApp: boolean, push: boolean }
 */
function getChannelPrefs(prefs, type) {
  const npref = (prefs && prefs.notificationPreferences) || {}
  const t = npref[type] || {}
  return {
    inApp: t.inApp !== false,
    push: t.push !== false
  }
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

  // 查询用户偏好（决定是否写站内 + 是否推送）
  let prefs = {}
  try {
    const User = require('../models').User
    const user = await User.findByPk(opts.userId, { attributes: ['preferences'] })
    if (user) prefs = parsePreferences(user.preferences)
  } catch {
    prefs = {}
  }
  const channels = getChannelPrefs(prefs, opts.type)

  let notif = null
  if (channels.inApp) {
    notif = await Notification.create({
      userId: opts.userId,
      actorId: opts.actorId || null,
      type: opts.type || 'system',
      message: opts.message,
      link: opts.link || null,
      targetId: opts.targetId || null,
      targetType: opts.targetType || null,
      isRead: false
    })
  }

  // 非阻塞发送 Web Push（按 push 偏好）
  if (channels.push) {
    sendPushNotification(opts.userId, opts.message, opts.link, {
      type: opts.type,
      titleOverride: opts.pushTitle
    }).catch(err => console.error('[push send err]', err && err.message))
  }

  return notif
}

/**
 * 实际发送 Web Push（独立函数，便于外部调用）
 * @param {string} userId
 * @param {string} body — 通知正文
 * @param {string} link — 跳转链接
 * @param {object} options — { type, titleOverride }
 */
async function sendPushNotification(userId, body, link, options = {}) {
  const webPush = getWebPush()
  if (!webPush) return

  const PushSubscription = getPushModel()
  const subs = await PushSubscription.findAll({ where: { userId } })
  if (!subs || subs.length === 0) return

  // 默认标题按通知类型
  const defaultTitle = '美食食谱'
  const title = options.titleOverride || defaultTitle

  const payload = JSON.stringify({
    title,
    body: body || '',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    url: link || '/notifications',
    type: options.type || 'system'
  })

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth }
          },
          payload
        )
      } catch (err) {
        const status = err && err.statusCode
        // 410 Gone / 404 Not Found → 订阅已失效，清理
        if (status === 410 || status === 404) {
          sub.destroy().catch(() => {})
        } else {
          // 其他错误：记录但不抛出
          console.error('[push send] endpoint failed', status, err && err.message)
        }
      }
    })
  )
}

module.exports = {
  createNotification,
  sendPushNotification
}
