'use strict'

/**
 * Breadcrumb.tsx
 * 自动根据当前路由路径生成面包屑导航
 * 层级：首页 > 分类列表 > 食谱详情
 * 支持用户主页、排行榜、搜索等二级页面
 */

import { useLocation, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import type { Recipe } from '../api'
import './Breadcrumb.css'

interface BreadcrumbSegment {
  label: string
  path: string
}

/** 路径段 → 中文标签映射 */
const ROUTE_LABELS: Record<string, string> = {
  'favorites': '我的收藏',
  'search': '搜索',
  'recommend': '食材推荐',
  'collections': '收藏夹',
  'shopping-list': '购物清单',
  'rankings': '排行榜',
  'recipe': '食谱',
  'create': '创建食谱',
  'new': '新建',
  'edit': '编辑',
  'user': '用户',
  'login': '登录',
}

export default function Breadcrumb() {
  const location = useLocation()
  const [recipeTitle, setRecipeTitle] = useState<string | null>(null)

  // 获取食谱详情页面标题
  useEffect(() => {
    if (!location.pathname.startsWith('/recipe/')) {
      setRecipeTitle(null)
      return
    }

    const match = location.pathname.match(/^\/recipe\/([^/]+)/)
    if (!match) {
      setRecipeTitle(null)
      return
    }

    // 尝试从页面中读取标题（避免额外 API 请求）
    const titleEl = document.querySelector('[data-recipe-title]')
    if (titleEl) {
      setRecipeTitle(titleEl.getAttribute('data-recipe-title'))
    } else {
      // fallback：使用 URL 中已有信息
      setRecipeTitle(null)
    }
  }, [location.pathname])

  // 首页不显示面包屑
  if (location.pathname === '/') return null

  const segments = buildSegments(location.pathname, recipeTitle)

  return (
    <nav className="breadcrumb" aria-label="面包屑导航">
      <ol className="breadcrumb__list">
        {segments.map((seg, i) => (
          <li key={seg.path} className="breadcrumb__item">
            {i < segments.length - 1 ? (
              <Link to={seg.path} className="breadcrumb__link">
                {seg.label}
              </Link>
            ) : (
              <span className="breadcrumb__current" aria-current="page">
                {seg.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

function buildSegments(pathname: string, recipeTitle: string | null): BreadcrumbSegment[] {
  const parts = pathname.split('/').filter(Boolean)
  const segments: BreadcrumbSegment[] = [{ label: '首页', path: '/' }]

  let isRecipeDetail = false

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]

    // 处理动态路由参数
    if (part === 'recipe') {
      const nextPart = parts[i + 1]
      if (nextPart && nextPart !== 'new') {
        isRecipeDetail = true
        segments.push({ label: '食谱详情', path: `/recipe/${nextPart}` })
        const afterPart = parts[i + 2]
        if (afterPart === 'edit') {
          segments.push({ label: '编辑', path: `/recipe/${nextPart}/edit` })
        }
        break
      }
      // recipe/new
      segments.push({ label: '新建食谱', path: '/recipe/new' })
      break
    }

    if (part === 'user') {
      const nextPart = parts[i + 1]
      if (nextPart) {
        segments.push({ label: '用户主页', path: `/user/${nextPart}` })
        break
      }
      segments.push({ label: '用户', path: '/user/' })
      break
    }

    // 静态路由
    const label = ROUTE_LABELS[part]
    if (label) {
      segments.push({ label, path: '/' + part + '/' })
    }
  }

  // 如果获取到食谱标题，替换"食谱详情"
  if (recipeTitle && isRecipeDetail && segments.length >= 2) {
    segments[segments.length - 1] = { ...segments[segments.length - 1], label: recipeTitle }
  }

  return segments
}