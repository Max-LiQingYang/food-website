import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProxiedImageUrl } from '../utils/imageProxy'
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

/** Seasonal configuration based on current month */
function getSeasonConfig(): { season: string; tagline: string; gradient: string; emoji: string; overlayColor: string } {
  const month = new Date().getMonth()
  if (month >= 2 && month <= 4) {
    return {
      season: 'spring',
      tagline: '🌸 春鲜正当时 — 当季时蔬，简单烹饪就很好',
      gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 50%, #a8edea 100%)',
      emoji: '🌸',
      overlayColor: 'rgba(232, 126, 109, 0.15)',
    }
  }
  if (month >= 5 && month <= 7) {
    return {
      season: 'summer',
      tagline: '☀️ 炎炎夏日 — 橙粉暖阳，清爽消暑，缤纷一夏',
      gradient: 'linear-gradient(135deg, #FF6B35 0%, #FF8E53 20%, #FF6B9D 50%, #C084FC 80%, #7C3AED 100%)',
      emoji: '☀️',
      overlayColor: 'rgba(255, 107, 53, 0.15)',
    }
  }
  if (month >= 8 && month <= 10) {
    return {
      season: 'autumn',
      tagline: '🍂 秋日滋补 — 一锅暖汤，满屋飘香，暖心暖胃',
      gradient: 'linear-gradient(135deg, #d4a762 0%, #e8d5b7 50%, #ffecd2 100%)',
      emoji: '🍂',
      overlayColor: 'rgba(212, 167, 98, 0.15)',
    }
  }
  return {
    season: 'winter',
    tagline: '❄️ 冬日暖锅 — 热气腾腾，围炉共食，幸福满满',
    gradient: 'linear-gradient(135deg, #e0e5ec 0%, #b8c6db 40%, #f5f7fa 100%)',
    emoji: '❄️',
    overlayColor: 'rgba(184, 198, 219, 0.2)',
  }
}

const FALLBACK_RECIPES: HeroRecipe[] = [
  { id: '', title: '宫保鸡丁', image: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=1200&h=900&fit=crop&crop=center', category: '中餐' },
  { id: '', title: '红烧肉', image: 'https://images.unsplash.com/photo-1623689046286-01cd25b32d79?w=1200&h=900&fit=crop&crop=center', category: '中餐' },
  { id: '', title: '提拉米苏', image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=1200&h=900&fit=crop&crop=center', category: '甜点' },
  { id: '', title: '清蒸鲈鱼', image: 'https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=1200&h=900&fit=crop&crop=center', category: '中餐' },
  { id: '', title: '凯撒沙拉', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&h=900&fit=crop&crop=center', category: '西餐' },
]

export default function HeroSection({ recipes }: HeroSectionProps) {
  const items = recipes && recipes.length >= 3 ? recipes : FALLBACK_RECIPES
  const [current, setCurrent] = useState(0)
  const [imagesLoaded, setImagesLoaded] = useState(false)
  const navigate = useNavigate()

  const seasonCfg = useMemo(() => getSeasonConfig(), [])

  const goTo = useCallback((idx: number) => {
    setCurrent(idx)
  }, [])

  const goNext = useCallback(() => {
    setCurrent(prev => (prev + 1) % items.length)
  }, [items.length])

  useEffect(() => {
    const timer = setInterval(goNext, 5000)
    return () => clearInterval(timer)
  }, [goNext])

  // Preload first image with high priority; rest lazy via <img loading="lazy">
  useEffect(() => {
    if (items.length === 0) return
    const firstImg = new Image()
    ;(firstImg as any).fetchPriority = 'high'
    firstImg.onload = () => setImagesLoaded(true)
    firstImg.onerror = () => setImagesLoaded(true)
    firstImg.src = getProxiedImageUrl(items[0].image) || items[0].image
    // 其余图片靠 <img loading="lazy"> 处理，不再循环预加载
  }, [items])

  const handleRecipeClick = (recipe: HeroRecipe) => {
    if (recipe.id) {
      navigate(`/recipe/${recipe.id}`)
    } else {
      navigate(`/search?q=${encodeURIComponent(recipe.title)}`)
    }
  }

  return (
    <div className="hero-section">
      {/* 季节性标语 — 半透明悬浮在顶部 */}
      <div className="hero-seasonal" style={{ background: seasonCfg.gradient }}>
        <span className="hero-seasonal__emoji">{seasonCfg.emoji}</span>
        <span className="hero-seasonal__text">{seasonCfg.tagline}</span>
      </div>

      {!imagesLoaded && (
        <div className="hero-skeleton">
          <div className="hero-skeleton__title" />
          <div className="hero-skeleton__tag" />
        </div>
      )}

      <div
        className="hero-track"
        style={{
          transform: `translateX(-${current * 100}%)`,
          opacity: imagesLoaded ? 1 : 0,
          transition: imagesLoaded ? 'transform 0.6s cubic-bezier(0.25, 0.1, 0.25, 1), opacity 0.4s ease' : 'none',
        }}
      >
        {items.map((recipe, idx) => (
          <div
            key={idx}
            className="hero-slide"
            onClick={() => handleRecipeClick(recipe)}
          >
            <img
              src={getProxiedImageUrl(recipe.image)}
              alt={recipe.title}
              className="hero-slide__img"
              loading={idx === 0 ? 'eager' : 'lazy'}
              {...({ fetchpriority: idx === 0 ? 'high' : 'auto' } as any)}
              decoding={idx === 0 ? 'sync' : 'async'}
            />
            <div className="hero-slide__overlay" style={{ background: `linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.2) 35%, ${seasonCfg.overlayColor} 100%)` }} />
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