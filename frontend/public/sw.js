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