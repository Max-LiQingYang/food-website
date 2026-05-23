import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import './HeroSection.css'

interface HeroRecipe {
  id: string
  title: string
  image: string
  category?: string
}

interface HeroSectionProps {
  recipes?: HeroRecipe[]
}

const FALLBACK_RECIPES: HeroRecipe[] = [
  { id: '', title: '宫保鸡丁', image: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=800&h=500&fit=crop', category: '中餐' },
  { id: '', title: '红烧肉', image: 'https://images.unsplash.com/photo-1623689046286-01cd25b32d79?w=800&h=500&fit=crop', category: '中餐' },
  { id: '', title: '提拉米苏', image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800&h=500&fit=crop', category: '甜点' },
  { id: '', title: '清蒸鲈鱼', image: 'https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=800&h=500&fit=crop', category: '中餐' },
  { id: '', title: '凯撒沙拉', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=500&fit=crop', category: '西餐' },
]

export default function HeroSection({ recipes }: HeroSectionProps) {
  const items = recipes && recipes.length >= 3 ? recipes : FALLBACK_RECIPES
  const [current, setCurrent] = useState(0)
  const navigate = useNavigate()

  const goTo = useCallback((idx: number) => {
    setCurrent(idx)
  }, [])

  const goNext = useCallback(() => {
    setCurrent(prev => (prev + 1) % items.length)
  }, [items.length])

  // Auto rotate every 5s
  useEffect(() => {
    const timer = setInterval(goNext, 5000)
    return () => clearInterval(timer)
  }, [goNext])

  const handleRecipeClick = (recipe: HeroRecipe) => {
    if (recipe.id) {
      navigate(`/recipe/${recipe.id}`)
    } else {
      navigate(`/search?q=${encodeURIComponent(recipe.title)}`)
    }
  }

  return (
    <div className="hero-section">
      <div className="hero-track" style={{ transform: `translateX(-${current * 100}%)` }}>
        {items.map((recipe, idx) => (
          <div
            key={idx}
            className="hero-slide"
            onClick={() => handleRecipeClick(recipe)}
          >
            <img src={recipe.image} alt={recipe.title} className="hero-slide__img" />
            <div className="hero-slide__overlay" />
            <div className="hero-slide__content">
              <h2 className="hero-slide__title">{recipe.title}</h2>
              {recipe.category && <span className="hero-slide__tag">{recipe.category}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* 导航点 */}
      <div className="hero-dots">
        {items.map((_, idx) => (
          <button
            key={idx}
            className={`hero-dot ${idx === current ? 'hero-dot--active' : ''}`}
            onClick={() => goTo(idx)}
            aria-label={`第 ${idx + 1} 张`}
          />
        ))}
      </div>

      {/* 左右箭头 */}
      <button className="hero-arrow hero-arrow--prev" onClick={() => goTo((current - 1 + items.length) % items.length)} aria-label="上一张">
        ‹
      </button>
      <button className="hero-arrow hero-arrow--next" onClick={goNext} aria-label="下一张">
        ›
      </button>
    </div>
  )
}