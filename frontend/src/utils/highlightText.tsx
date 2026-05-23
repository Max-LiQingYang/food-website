import type { ReactNode } from 'react'

/**
 * 对搜索关键词进行高亮处理，返回 ReactNode 数组
 * @param text 原始文本
 * @param query 搜索关键词
 * @returns 包含高亮 <mark> 的 ReactNode 数组；若 query 为空则返回原文本
 */
export function highlightText(text: string, query: string): ReactNode {
  if (!query || !query.trim()) return text
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  const parts = text.split(regex)

  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark
        key={i}
        style={{
          background: '#FFE8D0',
          color: '#E8663E',
          borderRadius: '2px',
          padding: '0 2px',
        }}
      >
        {part}
      </mark>
    ) : (
      part
    )
  )
}