/**
 * usePushSubscription
 * 管理浏览器 Web Push 订阅状态与订阅/取消订阅动作
 *
 * 暴露状态：
 *   - permission   浏览器原生权限 'default'|'granted'|'denied'|'unsupported'
 *   - isSubscribed 是否已有有效订阅
 *   - subscribing  订阅/取消中（按钮 loading）
 *   - subscriptions 后端记录的订阅列表（用于多设备展示）
 *   - subscribe()  请求权限 + 创建订阅 + 后端注册
 *   - unsubscribe() 取消当前设备订阅 + 后端删除
 *   - refresh()    重拉订阅列表
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getPushSubscriptions,
  registerPushSubscription,
  unregisterPushSubscription,
  getVapidPublicKey,
  PushSubscriptionInfo
} from '../api'

export type PushPermissionState =
  | 'default'
  | 'granted'
  | 'denied'
  | 'unsupported'

function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

function arrayBufferToBase64(buf: ArrayBuffer | null): string {
  if (!buf) return ''
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return window.btoa(bin)
}

export interface UsePushSubscriptionResult {
  permission: PushPermissionState
  isSubscribed: boolean
  subscribing: boolean
  subscriptions: PushSubscriptionInfo[]
  subscribe: () => Promise<void>
  unsubscribe: () => Promise<void>
  refresh: () => Promise<void>
}

export function usePushSubscription(): UsePushSubscriptionResult {
  const [permission, setPermission] = useState<PushPermissionState>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [subscribing, setSubscribing] = useState(false)
  const [subscriptions, setSubscriptions] = useState<PushSubscriptionInfo[]>([])
  const mounted = useRef(true)

  // 初始化检查
  useEffect(() => {
    mounted.current = true
    if (!isPushSupported()) {
      setPermission('unsupported')
      return () => {
        mounted.current = false
      }
    }
    setPermission(Notification.permission as PushPermissionState)

    // 检查是否已有浏览器端订阅
    ;(async () => {
      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (mounted.current) setIsSubscribed(!!sub)
      } catch {
        if (mounted.current) setIsSubscribed(false)
      }
    })()

    // 拉取后端记录的订阅
    refreshInner()

    return () => {
      mounted.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refreshInner = useCallback(async () => {
    try {
      const list = await getPushSubscriptions()
      if (mounted.current) setSubscriptions(Array.isArray(list) ? list : [])
    } catch {
      if (mounted.current) setSubscriptions([])
    }
  }, [])

  const refresh = useCallback(async () => {
    await refreshInner()
  }, [refreshInner])

  const subscribe = useCallback(async () => {
    if (!isPushSupported()) return
    if (subscribing) return
    setSubscribing(true)
    try {
      // 申请权限
      let perm: NotificationPermission = Notification.permission
      if (perm === 'default') {
        perm = await Notification.requestPermission()
      }
      setPermission(perm as PushPermissionState)
      if (perm !== 'granted') {
        return
      }

      const reg = await navigator.serviceWorker.ready

      // 获取 VAPID 公钥（优先 API 运行时获取，备用编译时 env）
      let vapidKey = ''
      try {
        vapidKey = await getVapidPublicKey()
      } catch {
        // API 失败时回退到编译时变量
      }
      if (!vapidKey) {
        vapidKey = (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY as string | undefined
      }
      if (!vapidKey) {
        console.error('[push] VAPID 公钥未配置（API 和 env 均无效）')
        return
      }

      // 复用现有订阅，否则创建新订阅
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey)
        })
      }

      const p256dh = arrayBufferToBase64(sub.getKey('p256dh'))
      const auth = arrayBufferToBase64(sub.getKey('auth'))

      await registerPushSubscription({
        endpoint: sub.endpoint,
        keys: { p256dh, auth },
        userAgent: navigator.userAgent
      })

      if (mounted.current) {
        setIsSubscribed(true)
      }
      await refreshInner()
    } finally {
      if (mounted.current) setSubscribing(false)
    }
  }, [subscribing, refreshInner])

  const unsubscribe = useCallback(async () => {
    if (!isPushSupported()) return
    if (subscribing) return
    setSubscribing(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      const currentEndpoint = sub?.endpoint || ''

      // 取消浏览器端订阅
      if (sub) {
        try {
          await sub.unsubscribe()
        } catch {
          // ignore
        }
      }

      // 后端删除：优先删除当前设备端点，其余保留
      const list = subscriptions
      const target =
        list.find((s) => s.endpoint === currentEndpoint) || null
      const toDelete = target ? [target] : list
      await Promise.all(
        toDelete.map((s) =>
          unregisterPushSubscription(s.id).catch(() => undefined)
        )
      )

      if (mounted.current) {
        setIsSubscribed(false)
      }
      await refreshInner()
    } finally {
      if (mounted.current) setSubscribing(false)
    }
  }, [subscribing, subscriptions, refreshInner])

  return {
    permission,
    isSubscribed,
    subscribing,
    subscriptions,
    subscribe,
    unsubscribe,
    refresh
  }
}

export default usePushSubscription
