/**
 * 将外部图片 URL 转为代理 URL
 * 仅对需要代理的域名（如 images.unsplash.com）进行转换
 */
const PROXY_DOMAINS = ['images.unsplash.com']

export function getProxiedImageUrl(url: string | null | undefined): string | null | undefined {
  if (!url) return url
  try {
    const parsed = new URL(url)
    if (PROXY_DOMAINS.includes(parsed.hostname)) {
      return `/api/image-proxy?url=${encodeURIComponent(url)}`
    }
    return url
  } catch {
    return url
  }
}
