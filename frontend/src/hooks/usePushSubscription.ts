/**
 * usePushSubscription
 * \u7ba1\u7406\u6d4f\u89c8\u5668 Web Push \u8ba2\u9605\u72b6\u6001\u4e0e\u8ba2\u9605/\u53d6\u6d88\u8ba2\u9605\u52a8\u4f5c
 *
 * \u66b4\u9732\u72b6\u6001\uff1a
 *   - permission   \u6d4f\u89c8\u5668\u539f\u751f\u6743\u9650 'default'|'granted'|'denied'|'unsupported'
 *   - isSubscribed \u662f\u5426\u5df2\u6709\u6709\u6548\u8ba2\u9605
 *   - subscribing  \u8ba2\u9605/\u53d6\u6d88\u4e2d\uff08\u6309\u94ae loading\uff09
 *   - subscriptions \u540e\u7aef\u8bb0\u5f55\u7684\u8ba2\u9605\u5217\u8868\uff08\u7528\u4e8e\u591a\u8bbe\u5907\u5c55\u793a\uff09
 *   - subscribe()  \u8bf7\u6c42\u6743\u9650 + \u521b\u5efa\u8ba2\u9605 + \u540e\u7aef\u6ce8\u518c\n *   - unsubscribe() \u53d6\u6d88\u5f53\u524d\u8bbe\u5907\u8ba2\u9605 + \u540e\u7aef\u5220\u9664
 *   - refresh()    \u91cd\u62c9\u8ba2\u9605\u5217\u8868
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getPushSubscriptions,
  registerPushSubscription,
  unregisterPushSubscription,
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

  // \u521d\u59cb\u5316\u68c0\u67e5
  useEffect(() => {
    mounted.current = true
    if (!isPushSupported()) {
      setPermission('unsupported')
      return () => {
        mounted.current = false
      }
    }
    setPermission(Notification.permission as PushPermissionState)

    // \u68c0\u67e5\u662f\u5426\u5df2\u6709\u6d4f\u89c8\u5668\u7aef\u8ba2\u9605
    ;(async () => {
      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (mounted.current) setIsSubscribed(!!sub)
      } catch {
        if (mounted.current) setIsSubscribed(false)
      }
    })()

    // \u62c9\u53d6\u540e\u7aef\u8bb0\u5f55\u7684\u8ba2\u9605
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
      // \u7533\u8bf7\u6743\u9650
      let perm: NotificationPermission = Notification.permission
      if (perm === 'default') {
        perm = await Notification.requestPermission()
      }
      setPermission(perm as PushPermissionState)
      if (perm !== 'granted') {
        return
      }

      const reg = await navigator.serviceWorker.ready

      // \u83b7\u53d6 VAPID \u516c\u94a5
      const vapidKey = (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY as string | undefined
      if (!vapidKey) {
        console.error('[push] VITE_VAPID_PUBLIC_KEY \u672a\u914d\u7f6e')
        return
      }

      // \u590d\u7528\u73b0\u6709\u8ba2\u9605\uff0c\u5426\u5219\u521b\u5efa\u65b0\u8ba2\u9605
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

      // \u53d6\u6d88\u6d4f\u89c8\u5668\u7aef\u8ba2\u9605
      if (sub) {
        try {
          await sub.unsubscribe()
        } catch {
          // ignore
        }
      }

      // \u540e\u7aef\u5220\u9664\uff1a\u4f18\u5148\u5220\u9664\u5f53\u524d\u8bbe\u5907\u7aef\u70b9\uff0c\u5176\u4f59\u4fdd\u7559
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
