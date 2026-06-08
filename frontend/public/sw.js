const CACHE_VERSION = 'v1'
const STATIC_CACHE = `food-static-${CACHE_VERSION}`
const API_CACHE = `food-api-${CACHE_VERSION}`

const STATIC_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
]

const API_CACHE_PATTERNS = [
  /\/api\/recipes\/(\d+\/detail|\d+\/similar|seasonal|featured|search|recommend)/,
  /\/api\/recipes$/,
]

// ── 安装：预缓存静态资源 ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll(STATIC_URLS).catch(() => {
        // 部分资源可能暂时不可用，忽略
      })
    })
  )
  self.skipWaiting()
})

// ── 激活：清理旧缓存 ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key.startsWith('food-') && key !== STATIC_CACHE && key !== API_CACHE)
          .map(key => caches.delete(key))
      )
    })
  )
  self.clients.claim()
})

// ── 网络请求拦截 ──
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // 仅拦截同源请求
  if (url.origin !== self.location.origin) return

  // API 请求：网络优先，回退缓存
  if (url.pathname.startsWith('/api/')) {
    const shouldCache = API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))
    if (shouldCache) {
      event.respondWith(networkFirst(request, API_CACHE))
    } else {
      event.respondWith(networkFirst(request))
    }
    return
  }

  // 静态资源：缓存优先
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/icon.svg'
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // 导航请求：网络优先，回退缓存
  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirst(request, STATIC_CACHE).catch(() => {
        return caches.match('/offline.html').then(res => {
          return res || caches.match('/')
        })
      })
    )
    return
  }
})

// ── 策略：缓存优先 ──
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok && cacheName) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('Offline', { status: 503 })
  }
}

// ── 策略：网络优先 ──
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request)
    if (response.ok && cacheName) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    return new Response(JSON.stringify({ code: -1, message: '离线模式' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// ── Web Push: 接收服务器推送 ──
self.addEventListener('push', function (event) {
  if (!event.data) return
  let data = {}
  try {
    data = event.data.json()
  } catch (e) {
    try {
      data = { title: '美食食谱', body: event.data.text() }
    } catch {
      data = {}
    }
  }
  const title = data.title || '美食食谱'
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/badge-72.png',
    tag: data.tag || data.type || 'food-notif',
    renotify: false,
    data: {
      url: data.url || '/',
      type: data.type || 'system'
    }
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

// ── Web Push: 点击通知 ──
self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  const targetUrl = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // 如已存在打开的同源窗口，聚焦并导航
        for (const client of clientList) {
          if ('focus' in client) {
            try {
              const u = new URL(client.url)
              if (u.origin === self.location.origin) {
                client.focus()
                if ('navigate' in client) {
                  client.navigate(targetUrl).catch(() => {})
                }
                return
              }
            } catch {
              // ignore
            }
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl)
        }
      })
  )
})
