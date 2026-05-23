/**
 * hooks/useSEO.ts
 * SEO 标签注入 —— 使用 useEffect + document 操作注入 meta/JSON-LD
 * 避免引入额外依赖
 */
import { useEffect } from 'react'

interface RecipeStructuredData {
  name: string
  description?: string
  image?: string
  recipeIngredient: string[]
  recipeInstructions: { text: string; name?: string }[]
  cookTime?: string
  prepTime?: string
  totalTime?: string
  recipeYield?: string
  author?: string
  keywords?: string[]
  nutrition?: {
    calories?: string
    protein?: string
    fat?: string
    carbs?: string
  }
}

/**
 * 注入食谱 JSON-LD 结构化数据到 <head>
 * 注入后返回清理函数（组件卸载时自动移除）
 */
export function useRecipeStructuredData(recipe: RecipeStructuredData | null) {
  useEffect(() => {
    if (!recipe) return

    const scriptId = `recipe-jsonld-${Date.now()}`
    const script = document.createElement('script')
    script.id = scriptId
    script.type = 'application/ld+json'

    const structuredData: Record<string, any> = {
      '@context': 'https://schema.org',
      '@type': 'Recipe',
      name: recipe.name,
      description: recipe.description || '',
      image: recipe.image || '',
      recipeIngredient: recipe.recipeIngredient || [],
      recipeInstructions: recipe.recipeInstructions.map((step, i) => ({
        '@type': 'HowToStep',
        position: i + 1,
        name: step.name || `步骤 ${i + 1}`,
        text: step.text,
      })),
      keywords: (recipe.keywords || []).join(', '),
    }

    if (recipe.author) {
      structuredData.author = {
        '@type': 'Person',
        name: recipe.author,
      }
    }

    if (recipe.cookTime) {
      const minMatch = recipe.cookTime.match(/^(\d+)/)
      if (minMatch) {
        structuredData.cookTime = `PT${minMatch[1]}M`
      }
    }

    if (recipe.recipeYield) {
      structuredData.recipeYield = recipe.recipeYield
    }

    if (recipe.nutrition) {
      const nutr: Record<string, string> = {}
      if (recipe.nutrition.calories) nutr.calories = recipe.nutrition.calories
      if (recipe.nutrition.protein) nutr.protein = recipe.nutrition.protein
      if (recipe.nutrition.fat) nutr.fat = recipe.nutrition.fat
      if (recipe.nutrition.carbs) nutr.carbs = recipe.nutrition.carbs
      if (Object.keys(nutr).length > 0) {
        structuredData.nutrition = { '@type': 'NutritionInformation', ...nutr }
      }
    }

    script.textContent = JSON.stringify(structuredData, null, 2)
    document.head.appendChild(script)

    return () => {
      const el = document.getElementById(scriptId)
      if (el) el.remove()
    }
  }, [recipe])
}

/**
 * 注入 Open Graph 和标准 meta 标签
 */
export function useMetaTags(tags: Record<string, string>) {
  useEffect(() => {
    const createdIds: string[] = []

    for (const [name, content] of Object.entries(tags)) {
      if (!content) continue

      // Determine if it's property (og:) or name (other)
      const attr = name.startsWith('og:') ? 'property' : 'name'
      const id = `meta-${name}`

      // Remove existing
      const existing = document.querySelector(`meta[${attr}="${name}"]`)
      if (existing) existing.remove()

      const meta = document.createElement('meta')
      meta.setAttribute(attr, name)
      meta.content = content
      meta.id = id
      document.head.appendChild(meta)
      createdIds.push(id)
    }

    return () => {
      createdIds.forEach(id => {
        const el = document.getElementById(id)
        if (el) el.remove()
      })
    }
  }, [JSON.stringify(tags)])
}

/**
 * 更新页面标题
 */
export function usePageTitle(title: string) {
  useEffect(() => {
    const prev = document.title
    document.title = title
    return () => { document.title = prev }
  }, [title])
}