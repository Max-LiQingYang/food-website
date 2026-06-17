import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getRecipeById, deleteRecipe } from '../api'
import { addFavorite, removeFavorite, getFavoriteStatus } from '../api'
import { getAuthorInfo, getCookStatus, cookRecipe, uncookRecipe } from '../api'
import type { AuthorLevelInfo } from '../api'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { forkRecipe, getRecipeForks, getRecipeForkLineage } from '../api'
import type { ForkInfo, ForkLineageItem } from '../api'
import CommentSection from '../components/CommentSection'
import NutritionCard from '../components/NutritionCard'
import SimilarRecipes from '../components/SimilarRecipes'
import ImageLightbox from '../components/ImageLightbox'
import StepTimer from '../components/StepTimer'
import ImagePlaceholder from '../components/ImagePlaceholder'
import ShareModal from '../components/ShareModal'
import AddToCollectionDropdown from '../components/AddToCollectionDropdown'
import AddToShoppingListButton from '../components/AddToShoppingListButton'
import RecipeVersionPanel from '../components/RecipeVersionPanel'
import SubstitutionPanel from '../components/SubstitutionPanel'
import VideoPlayer from '../components/VideoPlayer'
import QualityScoreModal from '../components/QualityScoreModal'
import ExportMenu from '../components/ExportMenu'
import FavoriteNoteModal from '../components/FavoriteNoteModal'
import AuthorLevelBadge from '../components/AuthorLevelBadge'
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis'
import { trackBehavior, trackBehaviorAnonymous } from '../api'
import type { RecipeDetail } from '../api'
import type { NutritionData } from '../components/NutritionCard'
import { useRecipeStructuredData, useMetaTags, usePageTitle } from '../hooks/useSEO'
import CookingTimeBar from '../components/CookingTimeBar'
import './RecipeDetailPage.css'
import '../components/PrintView.css'
import PageSkeleton from '../components/PageSkeleton'
import { getMotionSafeScrollBehavior } from '../context/MotionPreferenceContext'

/** 分类中文映射 */
const CATEGORY_NAMES: Record<string, string> = {
  chinese: '中餐',
  western: '西餐',
  japanese: '日料',
  korean: '韩料',
  dessert: '甜点',
  thai: '泰式',
  indian: '印式',
  vietnamese: '越式',
}
const DIFFICULTY_NAMES: Record<string, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
}

const SMART_DIFFICULTY_LABELS: Record<string, string> = {
  beginner: '🟢 入门',
  intermediate: '🟡 进阶',
  advanced: '🔴 高手',
}

const NUTRI_SCORE_COLORS: Record<string, string> = {
  A: '#22c55e',
  B: '#86efac',
  C: '#eab308',
  D: '#f97316',
  E: '#ef4444',
}

const SEASON_LABELS: Record<string, string> = {
  spring: '🌸 春季',
  summer: '☀️ 夏季',
  autumn: '🍂 秋季',
  winter: '❄️ 冬季',
  all: '🔄 四季皆宜',
}

/** 食材自动分类(基于中文名关键词启发式) */
type IngredientCategory = 'main' | 'auxiliary' | 'seasoning'

const INGREDIENT_CATEGORY_META: Record<IngredientCategory, { label: string; icon: string; cls: string }> = {
  main:       { label: '主料', icon: '🥩', cls: 'ingredient-group--main' },
  auxiliary:  { label: '辅料', icon: '🌿', cls: 'ingredient-group--auxiliary' },
  seasoning:  { label: '调料', icon: '🧂', cls: 'ingredient-group--seasoning' },
}

const MAIN_KEYWORDS = ['肉', '鸡', '鸭', '鹅', '鱼', '虾', '蟹', '蛋', '豆', '腐', '菜', '菇', '菌',
  '米', '面', '饭', '馒', '饼', '蔬', '瓜', '果', '牛', '羊', '猪', '排', '里脊', '五花', '肉末', '肉丝',
  '肉片', '肉馅', '肉排', '鸡翅', '鸡腿', '鸡胸', '五花肉', '排骨', '里脊肉']
const SEASONING_KEYWORDS = ['盐', '糖', '醋', '酱油', '生抽', '老抽', '蚝油', '料酒', '油', '花椒',
  '八角', '桂皮', '香叶', '辣椒', '胡椒', '味精', '鸡精', '淀粉', '粉', '酱', '豆瓣', '甜面酱',
  '番茄酱', '沙拉酱', '芝麻酱', '黄油', '奶油', '奶酪', '芝士', '孜然', '茴香', '白芷', '丁香',
  '陈皮', '草果', '麻油', '香油', '橄榄油', '豆豉', '辣酱', '椒盐', '芥末', '蜂蜜']

function classifyIngredient(name: string): IngredientCategory {
  for (const kw of MAIN_KEYWORDS) { if (name.includes(kw)) return 'main' }
  for (const kw of SEASONING_KEYWORDS) { if (name.includes(kw)) return 'seasoning' }
  return 'auxiliary'
}

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const { isAuthenticated, user } = useAuth()

  const [recipe, setRecipe] = useState<RecipeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [isFavorited, setIsFavorited] = useState(false)
  const [favLoading, setFavLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [activeStep, setActiveStep] = useState<number | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showQualityModal, setShowQualityModal] = useState(false)
  const [showSubstitution, setShowSubstitution] = useState(false)
  const [authorLevel, setAuthorLevel] = useState<AuthorLevelInfo | null>(null)
  const [showStory, setShowStory] = useState(false)
  const [showCulturalBg, setShowCulturalBg] = useState(false)
  const [favoriteNote, setFavoriteNote] = useState('')
  const [noteModalVisible, setNoteModalVisible] = useState(false)

  // ═══ Iter#99: "我做过"标记 ──
  const [isCooked, setIsCooked] = useState(false)
  const [cookCount, setCookCount] = useState(0)
  const [totalCookedCount, setTotalCookedCount] = useState(0)
  const [cookLoading, setCookLoading] = useState(false)

  // ═══ #63: 食谱改编 ──
  const [forks, setForks] = useState<ForkInfo[]>([])
  const [forkCount, setForkCount] = useState(0)
  const [forking, setForking] = useState(false)

  // ═══ #54: 乐观更新评分 ──
  const handleRatingUpdate = useCallback((newAvg: number, newCount: number) => {
    setRecipe(prev => prev ? { ...prev, avgRating: newAvg, ratingCount: newCount } : prev)
  }, [])

  // ── 语音播报 ──
  const { speak, pause, resume, stop: stopSpeech, speaking, paused, supported: speechSupported } = useSpeechSynthesis()

  // 兼容 steps 字符串数组格式
  const normalizedSteps = recipe?.steps?.map((step, index) =>
    typeof step === 'string'
      ? { stepNumber: index + 1, content: step, image: null }
      : step
  ) ?? []

  // 收集所有可查看的图片（封面 + 步骤图片）
  const allImages = [
    ...(recipe?.coverImage ? [{ src: recipe.coverImage, alt: recipe.title }] : []),
    ...(normalizedSteps
      .filter(s => s.image)
      .map(s => ({ src: s.image || '', alt: `步骤 ${s.stepNumber}: ${s.content || ''}` }))
    ),
  ]

  // ── 份量缩放 ──
  const scaleKey = id ? `serving_scale_${id}` : ''
  const [servingScale, setServingScale] = useState<number>(() => {
    if (!scaleKey) return 1
    try {
      const saved = localStorage.getItem(scaleKey)
      return saved ? JSON.parse(saved) : 1
    } catch {
      return 1
    }
  })

  // 持久化份量缩放
  useEffect(() => {
    if (scaleKey) {
      localStorage.setItem(scaleKey, JSON.stringify(servingScale))
    }
  }, [servingScale, scaleKey])

  // 缩放后的食材
  const scaledIngredients = recipe?.ingredients?.map(ing => ({
    ...ing,
    displayAmount: ing.amount * servingScale,
  })) ?? []

  // ── 已完成步骤（localStorage 持久化）
  const storageKey = id ? `step_completed_${id}` : ''
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(() => {
    if (!storageKey) return new Set()
    try {
      const saved = localStorage.getItem(storageKey)
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
      return new Set()
    }
  })

  // 保存已完成步骤到 localStorage
  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify([...completedSteps]))
    }
  }, [completedSteps, storageKey])

  const toggleStep = (stepNumber: number) => {
    setCompletedSteps(prev => {
      const next = new Set(prev)
      if (next.has(stepNumber)) {
        next.delete(stepNumber)
      } else {
        next.add(stepNumber)
      }
      return next
    })
  }

  // ── 食材分组折叠
  const [collapsedGroups, setCollapsedGroups] = useState<Set<IngredientCategory>>(() => {
    try {
      const saved = localStorage.getItem(`ingredient_groups_collapsed_${id}`)
      return saved ? new Set(JSON.parse(saved) as IngredientCategory[]) : new Set()
    } catch { return new Set() }
  })

  useEffect(() => {
    if (id) localStorage.setItem(`ingredient_groups_collapsed_${id}`, JSON.stringify([...collapsedGroups]))
  }, [collapsedGroups, id])

  const toggleGroup = (cat: IngredientCategory) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat); else next.add(cat)
      return next
    })
  }

  const groupedIngredients = useMemo(() => {
    const groups: Record<IngredientCategory, typeof scaledIngredients> = { main: [], auxiliary: [], seasoning: [] }
    scaledIngredients.forEach(ing => {
      if (typeof ing === 'string') return
      groups[classifyIngredient(ing.name || '')].push(ing)
    })
    return groups
  }, [scaledIngredients])

  // ── 返回顶部按钮状态
  const [showBackToTop, setShowBackToTop] = useState(false)

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 500)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: getMotionSafeScrollBehavior() })

  // ── 章节导航锚点
  const [activeSection, setActiveSection] = useState<string>('section-ingredients')

  useEffect(() => {
    if (!recipe) return
    const sectionIds = ['section-video', 'section-ingredients', 'section-steps', 'section-story', 'section-comments']
    const sections = sectionIds
      .map(id => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)
    if (sections.length === 0) return

    const observer = new IntersectionObserver(
      entries => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActiveSection(visible[0].target.id)
      },
      { rootMargin: '-100px 0px -60% 0px', threshold: 0 }
    )
    sections.forEach(s => observer.observe(s))
    return () => observer.disconnect()
  }, [recipe])

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      const offset = 110
      const top = el.getBoundingClientRect().top + window.scrollY - offset
      window.scrollTo({ top, behavior: getMotionSafeScrollBehavior() })
    }
  }

  const SECTIONS = [
    { id: 'section-ingredients', label: '食材', icon: '🥬' },
    { id: 'section-steps',       label: '步骤', icon: '📝' },
    { id: 'section-video',       label: '视频', icon: '🎬' },
    { id: 'section-story',       label: '故事', icon: '📖' },
    { id: 'section-comments',    label: '评论', icon: '💬' },
  ]

  // ── SEO: 食谱结构化数据 + OG meta ──
  const seoRecipe = recipe
    ? {
        name: recipe.title,
        description: recipe.description,
        image: recipe.coverImage,
        recipeIngredient: (recipe.ingredients || []).map((i) => `${i.name} ${i.amount || ''}${i.unit || ''}`.trim()),
        recipeInstructions: ((recipe?.steps) || []).map((s) => ({
          text: typeof s === 'string' ? s : s.content || '',
          name: typeof s !== 'string' ? s.name : undefined,
        })),
        cookTime: recipe.cookTime ? `${recipe.cookTime}` : undefined,
        recipeYield: recipe.servings ? `${recipe.servings}人份` : undefined,
        author: recipe.author || undefined,
        keywords: recipe.categoryTags ? [recipe.category, ...Object.values(recipe.categoryTags)] : [recipe.category].filter(Boolean),
        nutrition: recipe.nutrition || undefined,
      }
    : null

  usePageTitle(recipe ? `${recipe.title} - 美食食谱` : '加载中... - 美食食谱')
  useRecipeStructuredData(seoRecipe)
  useMetaTags({
    'og:title': recipe?.title || '美食食谱',
    'og:description': recipe?.description?.slice(0, 200) || '三餐四季，与美食相伴——每一个菜谱都值得分享',
    'og:image': recipe?.coverImage || '',
    'og:type': 'article',
    'og:url': window.location.href,
    'twitter:card': 'summary_large_image',
    'twitter:title': recipe?.title || '美食食谱',
    'twitter:description': recipe?.description?.slice(0, 200) || '',
    'twitter:image': recipe?.coverImage || '',
  })

  // 复制食材清单
  const handleCopyIngredients = () => {
    if (!recipe?.ingredients?.length) return
    const text = scaledIngredients
      .map(ing => `${ing.name} ${ing.displayAmount}${ing.unit}`)
      .join('\n')
    navigator.clipboard.writeText(text).then(() => {
      toast.success('食材清单已复制')
    }).catch(() => {
      toast.error('复制失败')
    })
  }

  const isAuthor = isAuthenticated && user && recipe && recipe.userId === user.id

  useEffect(() => {
    if (!id) {
      setNotFound(true)
      setLoading(false)
      return
    }

    setLoading(true)
    setNotFound(false)

    Promise.all([
      getRecipeById(id),
      getFavoriteStatus(id).catch(() => ({ isFavorited: false, favoriteId: '' })),
      getCookStatus(id).catch(() => ({ isCooked: false, count: 0, lastCookedAt: null, totalCookedCount: 0 })),
    ] as const)
      .then(([res, favStatus, cookStatus]) => {
        const recipeData = (res as any).data ?? res
        setRecipe(recipeData as RecipeDetail)
        setIsFavorited(favStatus.isFavorited)
        setFavoriteNote(favStatus.note || '')
        setIsCooked(cookStatus.isCooked)
        setCookCount(cookStatus.count)
        setTotalCookedCount(cookStatus.totalCookedCount)
        // 获取改编版本列表
        if (recipeData && recipeData.forkCount > 0) {
          getRecipeForks(id).then(forkRes => {
            if (forkRes.success && forkRes.forks) {
              setForks(forkRes.forks)
              setForkCount(forkRes.count)
            }
          }).catch(() => {})
        }
        // 如果当前食谱是改编版本，也尝试获取其祖先谱系
        if (recipeData && recipeData.sourceInfo?.forkedFrom) {
          getRecipeForkLineage(id).catch(() => {})
        }
      })
      .catch(() => {
        setNotFound(true)
      })
      .finally(() => setLoading(false))
  }, [id])

  // ═══ 迭代#46: 加载作者等级信息 ═══
  useEffect(() => {
    if (!recipe || !recipe.userId) return
    getAuthorInfo(String(recipe.userId))
      .then(res => {
        setAuthorLevel(res.level)
      })
      .catch(() => {
        // 静默失败
      })
  }, [recipe?.userId])

  // 迭代#35: 记录浏览行为
  useEffect(() => {
    if (!id || !recipe) return
    // 延迟记录，避免干扰首屏渲染
    const timer = setTimeout(() => {
      if (user) {
        trackBehavior(user.id, 'view', { targetId: id, targetType: 'recipe' }).catch(() => {})
      } else {
        trackBehaviorAnonymous('view', { targetId: id, targetType: 'recipe' }).catch(() => {})
      }
    }, 3000)
    return () => clearTimeout(timer)
  }, [id, recipe, user])

  const handleFavoriteToggle = async () => {
    if (!id || favLoading) return
    const token = localStorage.getItem('token')
    if (!token) {
      toast.warning('请先登录')
      navigate('/login')
      return
    }

    // Optimistic UI: 立即切换收藏状态
    const prevState = isFavorited
    setIsFavorited(!prevState)
    setFavLoading(true)

    try {
      if (prevState) {
        await removeFavorite(id)
        toast.success('已取消收藏')
      } else {
        await addFavorite(id)
        toast.success('已收藏')
      }
    } catch (err: any) {
      // Revert on failure
      setIsFavorited(prevState)
      toast.error(err?.message || '操作失败')
    } finally {
      setFavLoading(false)
    }
  }

  // ═══ Iter#99: "我做过"标记切换 ──
  const handleCookToggle = async () => {
    if (!id || cookLoading) return
    const token = localStorage.getItem('token')
    if (!token) {
      toast.info('请先登录')
      navigate('/login')
      return
    }

    setCookLoading(true)
    const prevIsCooked = isCooked
    const prevCount = cookCount

    // Optimistic UI
    try {
      if (prevIsCooked) {
        setIsCooked(false)
        setCookCount(0)
        setTotalCookedCount(prev => Math.max(0, prev - 1))
        await uncookRecipe(id)
        toast.success('已取消标记')
      } else {
        setIsCooked(true)
        setCookCount(1)
        setTotalCookedCount(prev => prev + 1)
        const res = await cookRecipe(id)
        setCookCount(res.count)
        toast.success('已标记为做过')
      }
    } catch {
      setIsCooked(prevIsCooked)
      setCookCount(prevCount)
      toast.error('操作失败，请重试')
    } finally {
      setCookLoading(false)
    }
  }

  const handleShare = async () => {
    if (!recipe) return
    setShowShareModal(true)
  }

  // ═══ #63: 食谱改编 ──
  const handleFork = async () => {
    if (!id) return
    if (!isAuthenticated) {
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname))
      return
    }
    setForking(true)
    try {
      const changesNote = prompt('请输入你的改编说明（可留空）：')
      const result = await forkRecipe(id, changesNote || undefined)
      if (result.success) {
        toast.success('改编成功！正在跳转到新食谱...')
        navigate(`/recipe/${result.recipeId}`)
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '创建改编失败')
    } finally {
      setForking(false)
    }
  }

  const handleDelete = async () => {
    if (!id || !isAuthor || deleting) return
    if (!window.confirm('确定要删除这份食谱吗？此操作不可撤销。')) return

    setDeleting(true)
    try {
      await deleteRecipe(id)
      toast.success('食谱已删除')
      navigate('/')
    } catch (err: any) {
      toast.error(err?.message || '删除失败')
    } finally {
      setDeleting(false)
    }
  }

  const handleStepClick = (stepNum: number) => {
    setActiveStep(activeStep === stepNum ? null : stepNum)
  }

  // ── 步骤滑动导航 ──
  const stepList = normalizedSteps
  const [stepSwipeStart, setStepSwipeStart] = useState<number | null>(null)
  const [focusedStepIndex, setFocusedStepIndex] = useState(0)

  // 滚动到第几步（自动定位）
  useEffect(() => {
    if (stepList.length === 0) return
    // 找到第一个未完成的步骤
    const firstIncomplete = stepList.findIndex(s => !completedSteps.has(s.stepNumber))
    setFocusedStepIndex(firstIncomplete >= 0 ? firstIncomplete : 0)
  }, [stepList.length, completedSteps])

  const handleStepSwipeStart = useCallback((e: React.TouchEvent) => {
    setStepSwipeStart(e.touches[0].clientX)
  }, [])

  const handleStepSwipeEnd = useCallback(
    (e: React.TouchEvent) => {
      if (stepSwipeStart === null || stepList.length === 0) return
      const diff = e.changedTouches[0].clientX - stepSwipeStart
      setStepSwipeStart(null)

      if (Math.abs(diff) < 50) return

      // 左滑 → 上一步，右滑 → 下一步
      if (diff > 0 && focusedStepIndex > 0) {
        const newIdx = focusedStepIndex - 1
        setFocusedStepIndex(newIdx)
        setActiveStep(stepList[newIdx].stepNumber)
        document.querySelector(`.detail-step:nth-child(${newIdx + 1})`)?.scrollIntoView({ behavior: getMotionSafeScrollBehavior(), block: 'center' })
      } else if (diff < 0 && focusedStepIndex < stepList.length - 1) {
        const newIdx = focusedStepIndex + 1
        setFocusedStepIndex(newIdx)
        setActiveStep(stepList[newIdx].stepNumber)
        document.querySelector(`.detail-step:nth-child(${newIdx + 1})`)?.scrollIntoView({ behavior: getMotionSafeScrollBehavior(), block: 'center' })
      }
    },
    [stepSwipeStart, stepList, focusedStepIndex]
  )

  const goPrevStep = useCallback(() => {
    if (focusedStepIndex > 0) {
      const newIdx = focusedStepIndex - 1
      setFocusedStepIndex(newIdx)
      setActiveStep(stepList[newIdx].stepNumber)
      const el = document.querySelector(`.detail-step:nth-child(${newIdx + 1})`)
      if (el) el.scrollIntoView({ behavior: getMotionSafeScrollBehavior(), block: 'center' })
    }
  }, [focusedStepIndex, stepList])

  const goNextStep = useCallback(() => {
    if (focusedStepIndex < stepList.length - 1) {
      const newIdx = focusedStepIndex + 1
      setFocusedStepIndex(newIdx)
      setActiveStep(stepList[newIdx].stepNumber)
      const el = document.querySelector(`.detail-step:nth-child(${newIdx + 1})`)
      if (el) el.scrollIntoView({ behavior: getMotionSafeScrollBehavior(), block: 'center' })
    }
  }, [focusedStepIndex, stepList])

  // ── 加载态（骨架屏） ─────────────────────────────────────

  if (loading) {
    return (
      <div className="detail-page">
        <PageSkeleton type="detail" />
      </div>
    )
  }

  // ── 404 ──────────────────────────────────────────────────

  if (notFound || !recipe) {
    return (
      <div className="detail-page">
        <div className="detail-notfound">
          <div className="detail-notfound__icon">🍽️</div>
          <h2>食谱不存在</h2>
          <p>该食谱可能已被作者删除</p>
          <button className="btn btn--primary" onClick={() => navigate('/')}>
            返回首页
          </button>
        </div>
      </div>
    )
  }

  // ── 处理 categoryTags ────────────────────────────────────
  let categoryTags: Record<string, string> | null = null
  if (recipe.categoryTags) {
    if (typeof recipe.categoryTags === 'string') {
      try {
        categoryTags = JSON.parse(recipe.categoryTags)
      } catch {
        categoryTags = null
      }
    } else {
      categoryTags = recipe.categoryTags as any
    }
  }

  const tagFilters = categoryTags
    ? [
        { label: '食材分类', value: categoryTags.ingredient },
        { label: '做法', value: categoryTags.method },
        { label: '菜系', value: categoryTags.cuisine },
        { label: '口味', value: categoryTags.flavor },
        { label: '价格', value: categoryTags.price },
      ].filter(t => t.value)
    : []

  // ── 提取营养信息 ─────────────────────────────────────────
  const nutrition: NutritionData | null =
    (recipe as any).nutrition ? (recipe as any).nutrition : null

  // ── 详情 ──────────────────────────────────────────────────

  return (
    <div className="detail-page">
      <div className="detail-container">
        {/* 返回按钮 */}
        <button className="detail-back" onClick={() => navigate(-1)}>
          ← 返回
        </button>

        {/* 封面图 - 点击打开灯箱 */}
        <div
          className="detail-cover"
          role="button"
          tabIndex={0}
          aria-label={`点击查看 ${recipe.title} 的大图`}
          onClick={() => setLightboxIndex(0)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLightboxIndex(0) } }}
        >
          {recipe.coverImage ? (
            <ImagePlaceholder
              src={recipe.coverImage}
              alt={recipe.title}
              className="detail-cover__img"
            />
          ) : (
            <div className="detail-cover__placeholder">🍽️</div>
          )}

          {/* 收藏按钮 */}
          <div className="detail-cover-actions">
            <button
              className={`detail-fav-btn ${isFavorited ? 'is-favorited' : ''}`}
              onClick={handleFavoriteToggle}
              disabled={favLoading}
              title={isFavorited ? '取消收藏' : '收藏'}
            >
              <span className="fav-icon">{favLoading ? '⋯' : isFavorited ? '❤️' : '🤍'}</span>
              <span className="fav-text">{isFavorited ? '已收藏' : '收藏'}</span>
            </button>
            <AddToCollectionDropdown recipeId={id} label="📁 收藏到" />
            {/* Cook It 按钮 */}
            <button
              className={`detail-cook-btn ${isCooked ? 'is-cooked' : ''}`}
              onClick={handleCookToggle}
              disabled={cookLoading}
              title={isCooked ? '取消标记' : '我做过'}
            >
              <span className="cook-btn-icon">
                {cookLoading ? '⋯' : isCooked ? '👨‍🍳' : '🍳'}
              </span>
              <span className="cook-btn-text">
                {isCooked ? `已做过${cookCount > 1 ? `(${cookCount}次)` : ''}` : '我做过'}
                {totalCookedCount > 0 && (
                  <span className="cook-btn-count">({totalCookedCount})</span>
                )}
              </span>
            </button>
          </div>

          {/* 作者操作栏 */}
          {isAuthor && (
            <div className="detail-author-actions">
              <Link to={`/recipe/${id}/edit`} className="detail-btn-edit">
                ✏️ 编辑
              </Link>
              <button className="detail-btn-delete" onClick={handleDelete} disabled={deleting}>
                🗑️ {deleting ? '删除中…' : '删除'}
              </button>
            </div>
          )}
        </div>

        {/* 基本信息 */}
        <div className="detail-header">
          <h1 className="detail-title">{recipe.title}</h1>

          {/* 章节快速导航 */}
          <nav className="section-nav" aria-label="章节导航">
            <ul className="section-nav__list">
              {SECTIONS.map(s => (
                <li key={s.id} className="section-nav__item">
                  <button
                    type="button"
                    className={`section-nav__btn ${activeSection === s.id ? 'section-nav__btn--active' : ''}`}
                    onClick={() => scrollToSection(s.id)}
                    aria-current={activeSection === s.id ? 'true' : undefined}
                  >
                    <span className="section-nav__icon">{s.icon}</span>
                    <span>{s.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* 分享按钮 — 仅桌面端可见 */}
          <div className="detail-header-actions">
            <button className="detail-share-btn" onClick={handleShare} title="分享食谱">
              📤 分享
            </button>
            <button className="detail-share-btn" onClick={() => window.print()} title="打印食谱">
              🖨️ 打印
            </button>
            <ExportMenu recipeId={recipe.id} recipeTitle={recipe.title} />
            <button className="detail-share-btn" onClick={() => setShowQualityModal(true)} title="查看质量评分">
              📊 评分
            </button>
          </div>

          <p className="detail-author">
            👨🍳{' '}
            {recipe.userId && isAuthenticated ? (
              <Link to={`/user/${recipe.userId}`} className="detail-author-link">
                {recipe.author || '未知作者'}
              </Link>
            ) : (
              recipe.author || '未知作者'
            )}
            {authorLevel && (
              <AuthorLevelBadge
                level={authorLevel.level}
                title={authorLevel.title}
                icon={authorLevel.icon}
              />
            )}
          </p>

          {/* ═══ #63: 食谱改编来源信息 ═══ */}
          {recipe.sourceInfo?.forkedFrom && (
            <div className="detail-fork-source">
              🍴 改编自{' '}
              <Link to={`/recipe/${recipe.sourceInfo.forkedFrom.id}`}>
                {recipe.sourceInfo.forkedFrom.title}
              </Link>
              {recipe.sourceInfo.forkedBy?.nickname && (
                <> · 改编者：{recipe.sourceInfo.forkedBy.nickname}</>
              )}
              {recipe.sourceInfo.changesNote && (
                <div className="detail-fork-source__note">{recipe.sourceInfo.changesNote}</div>
              )}
            </div>
          )}

          {/* 分类/难度/份数/时间徽标 */}
          <div className="detail-meta">
            {recipe.category && (
              <span className="detail-tag">
                {CATEGORY_NAMES[recipe.category] || recipe.category}
              </span>
            )}
            {recipe.difficulty && (
              <span className="detail-tag">
                {DIFFICULTY_NAMES[recipe.difficulty] || recipe.difficulty}
              </span>
            )}
            {recipe.servings != null && (
              <span className="detail-tag">🍽️ {recipe.servings} 人份</span>
            )}
            {/* 份量缩放 */}
            {recipe.servings != null && (
              <div className="serving-scaler">
                <button
                  className="serving-scaler__btn"
                  onClick={() => setServingScale(s => Math.max(0.25, s - 0.25))}
                  disabled={servingScale <= 0.25}
                  title="减少份量"
                >−</button>
                <span className="serving-scaler__value">
                  {Math.round(recipe.servings * servingScale)} 人份
                </span>
                <button
                  className="serving-scaler__btn"
                  onClick={() => setServingScale(s => Math.min(10, s + 0.25))}
                  disabled={servingScale >= 10}
                  title="增加份量"
                >+</button>
                {servingScale !== 1 && (
                  <button
                    className="serving-scaler__reset"
                    onClick={() => setServingScale(1)}
                    title="重置"
                  >↺</button>
                )}
              </div>
            )}
            {recipe.cookTime != null && (
              <CookingTimeBar cookTime={recipe.cookTime} difficulty={recipe.difficulty} maxTime={180} />
            )}
            {/* 质量标签 */}
            {recipe.qualityLabel && (
              <span className="detail-tag detail-tag--quality">
                {recipe.qualityLabel}
              </span>
            )}
            {/* T-2026-0617-002 S3: 评分→评论→浏览三件套套入 triad，权重左>右 */}
            <span className="detail-meta__triad">
              {/* 评分标签 */}
              {recipe.avgRating != null && recipe.avgRating > 0 ? (
                <span className="detail-tag detail-tag--rating" data-testid="detail-meta-avg">
                  {"★".repeat(Math.round(recipe.avgRating))}{"☆".repeat(5 - Math.round(recipe.avgRating))}
                  {" "}{recipe.avgRating.toFixed(1)}
                  {recipe.ratingCount != null && recipe.ratingCount > 0 && (
                    <span> ({recipe.ratingCount}人评分)</span>
                  )}
                </span>
              ) : (
                <span className="detail-tag detail-tag--unrated">
                  ⭐ 暂无评分
                </span>
              )}
              {/* 评论数标签 */}
              {recipe.commentCount != null && recipe.commentCount > 0 && (
                <span className="detail-tag detail-tag--comments" data-testid="detail-meta-comment">
                  💬 {recipe.commentCount} 条评论
                </span>
              )}
              {/* 浏览量标签 */}
              {recipe.viewCount != null && recipe.viewCount > 0 && (
                <span className="detail-tag detail-tag--views" data-testid="detail-meta-view">
                  &#x1F441;&#xFE0F; {recipe.viewCount >= 1000 ? ((recipe.viewCount / 1000).toFixed(1) + "k") : recipe.viewCount} 次浏览
                </span>
              )}
            </span>
            {/* 季节标签 */}
            {recipe.season && SEASON_LABELS[recipe.season] && (
              <span className="detail-tag detail-tag--season">
                {SEASON_LABELS[recipe.season]}
              </span>
            )}
          </div>

          {/* 多维分类标签（categoryTags） */}
          {tagFilters.length > 0 && (
            <div className="detail-tags-row">
              {tagFilters.map(t => (
                <span key={t.label} className="detail-tag-dim">
                  <span className="tag-dim-label">{t.label}</span>
                  <span className="tag-dim-value">{t.value}</span>
                </span>
              ))}
            </div>
          )}

          {recipe.description && <p className="detail-desc">{recipe.description}</p>}
        </div>

        {/* 营养信息卡片 — 增强展示 */}
        {nutrition && (
          <div className="nutrition-enhanced">
            <div className="nutri-score-header">
              {recipe.nutriScore && (
                <span
                  className="nutri-score-badge"
                  style={{ backgroundColor: NUTRI_SCORE_COLORS[recipe.nutriScore] || '#aaa' }}
                >
                  NutriScore {recipe.nutriScore}
                </span>
              )}
            </div>
            <NutritionCard nutrition={nutrition} />
          </div>
        )}

        {/* 视频教程 */}
        {id && (
          <div id="section-video" className="detail-container__section">
            <VideoPlayer recipeId={id} />
          </div>
        )}

        {/* 食材清单 */}
        {recipe.ingredients && recipe.ingredients.length > 0 && (
          <section id="section-ingredients" className="detail-section">
            <h2 className="detail-section__title">
              🥬 食材清单
              <span className="section-count">{recipe.ingredients.length} 种</span>
              <button
                className="ingredient-copy-btn"
                onClick={handleCopyIngredients}
                title="复制食材清单"
              >
                📋 复制
              </button>
            </h2>
            <AddToShoppingListButton recipeId={id} className="detail-shop-btn" />
            {servingScale !== 1 && (
              <p className="ingredient-scaled-hint">
                原 {recipe.servings} 人份 → 当前 {Math.round(recipe.servings * servingScale)} 人份（{servingScale === 1 ? '×1' : `×${servingScale}`}）
              </p>
            )}
            {/* 食材分组展示 */}
            <div className="ingredient-groups">
              {(['main', 'auxiliary', 'seasoning'] as IngredientCategory[]).map(cat => {
                const items = groupedIngredients[cat]
                if (items.length === 0) return null
                const meta = INGREDIENT_CATEGORY_META[cat]
                const collapsed = collapsedGroups.has(cat)
                return (
                  <div key={cat} className={`ingredient-group ${meta.cls} ${collapsed ? 'ingredient-group--collapsed' : ''}`}>
                    <div className="ingredient-group__header" onClick={() => toggleGroup(cat)} role="button" tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleGroup(cat) } }}>
                      <span className="ingredient-group__title">
                        <span className="ingredient-group__icon">{meta.icon}</span>
                        <span className="ingredient-group__label">{meta.label}</span>
                        <span className="ingredient-group__count">{items.length}</span>
                      </span>
                      <button className="ingredient-group__toggle" type="button" aria-label={collapsed ? '展开' : '折叠'}
                        aria-expanded={!collapsed} tabIndex={-1}>
                        <span className="ingredient-group__toggle-icon">▼</span>
                      </button>
                    </div>
                    <div className="ingredient-group__body" role="list">
                      {items.map((ing, i) => (
                        <div key={`${cat}-${i}`} className="detail-ingredient" role="listitem">
                          <span className="ingredient-name">{ing.name}</span>
                          <span className="ingredient-divider" />
                          <span className="ingredient-amount">
                            {ing.displayAmount % 1 === 0 ? ing.displayAmount : ing.displayAmount.toFixed(1)}{' '}{ing.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            {/* 食材替换建议 */}
            <button
              className="substitution-toggle"
              onClick={() => setShowSubstitution(s => !s)}
            >
              {showSubstitution ? '▲ 收起替换建议' : '🔄 食材替换建议'}
            </button>
            {showSubstitution && (
              <SubstitutionPanel
                recipeId={id}
                ingredientNames={(recipe.ingredients || []).map(i =>
                  typeof i === 'string' ? i : (i.name || '')
                ).filter(Boolean)}
                onClose={() => setShowSubstitution(false)}
              />
            )}
          </section>
        )}

        {/* 制作步骤 */}
        {normalizedSteps.length > 0 && (
          <section
            id="section-steps"
            className="detail-section"
            onTouchStart={handleStepSwipeStart}
            onTouchEnd={handleStepSwipeEnd}
          >
            <h2 className="detail-section__title">
              📝 制作步骤
              <span className="section-count">{recipe?.steps?.length || 0} 步</span>
            </h2>
            {/* 步骤进度指示器 */}
            {(() => {
              const total = normalizedSteps.length
              const done = completedSteps.size
              const percent = total > 0 ? Math.round((done / total) * 100) : 0
              const fillCls = percent === 100 ? 'step-progress__fill--done'
                : percent >= 70 ? 'step-progress__fill--late'
                : percent >= 30 ? 'step-progress__fill--mid'
                : 'step-progress__fill--early'
              return (
                <div className="step-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
                  <div className="step-progress__header">
                    <span className="step-progress__label">
                      <span className="step-progress__label-icon">📊</span>
                      <span>烹饪进度</span>
                    </span>
                    <span className="step-progress__stats">
                      <span className="step-progress__count-current">{done}</span>
                      <span className="step-progress__count-total">/ {total} 步</span>
                      <span className="step-progress__percent">{percent}%</span>
                    </span>
                  </div>
                  <div className="step-progress__bar">
                    <div className={`step-progress__fill ${fillCls}`} style={{ width: `${percent}%` }} />
                  </div>
                  {done > 0 && (
                    <div className="step-progress__dones" aria-label="已完成步骤">
                      {[...completedSteps].sort((a, b) => a - b).map(n => (
                        <span key={n} className="step-progress__check" title={`步骤 ${n}`}>
                          <span className="step-progress__check-icon">✓</span>{n}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}
            <ol className="detail-steps">
              {normalizedSteps.map(step => {
                const isActive = activeStep === step.stepNumber
                return (
                  <li
                    key={step.stepNumber}
                    className={`detail-step ${isActive ? 'is-active' : ''} ${completedSteps.has(step.stepNumber) ? 'is-completed' : ''}`}
                    onClick={() => handleStepClick(step.stepNumber)}
                  >
                    <div className="step-checkbox" onClick={e => { e.stopPropagation(); toggleStep(step.stepNumber); }}>
                      <div className={`step-checkbox__box ${completedSteps.has(step.stepNumber) ? 'is-checked' : ''}`}>
                        {completedSteps.has(step.stepNumber) && '✓'}
                      </div>
                    </div>
                    <div className="step-number">{step.stepNumber}</div>
                    <div className="step-body">
                      <p className="step-content">{step.content}</p>
                      <StepTimer stepNumber={step.stepNumber} stepContent={step.content} />
                      {/* 语音播报按钮 */}
                      {speechSupported && (
                        <div className="step-voice-controls">
                          {!speaking && (
                            <button
                              className="step-voice-btn"
                              onClick={(e) => { e.stopPropagation(); speak(step.content || '') }}
                              title="朗读此步骤"
                            >
                              🔊 朗读
                            </button>
                          )}
                          {speaking && (
                            <>
                              <span className="step-voice-indicator">🔊 朗读中...</span>
                              <button
                                className="step-voice-btn step-voice-btn--small"
                                onClick={(e) => { e.stopPropagation(); stopSpeech() }}
                                title="停止朗读"
                              >
                                ⏹ 停止
                              </button>
                            </>
                          )}
                        </div>
                      )}
                      {step.image && (
                        <img
                          src={step.image}
                          alt={`步骤 ${step.stepNumber}: ${step.content}`}
                          className="step-image"
                          loading="lazy"
                          role="button"
                          tabIndex={0}
                          aria-label={`点击查看步骤 ${step.stepNumber} 的图片`}
                          onClick={e => {
                            e.stopPropagation()
                            const stepIdx = (normalizedSteps || []).findIndex(s => s.image === step.image)
                            const imgIdx = 1 + stepIdx // +1 因为 index 0 是封面
                            setLightboxIndex(imgIdx >= 0 ? imgIdx : 0)
                          }}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (e.target as HTMLElement).click() } }}
                        />
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
            {/* 步骤导航箭头 */}
            <div className="step-nav">
              <button
                className="step-nav__btn step-nav__btn--prev"
                onClick={goPrevStep}
                disabled={focusedStepIndex <= 0}
                aria-label="上一步"
              >
                ◀ 上一步
              </button>
              <span className="step-nav__info">
                {focusedStepIndex + 1} / {normalizedSteps.length}
              </span>
              <button
                className="step-nav__btn step-nav__btn--next"
                onClick={goNextStep}
                disabled={focusedStepIndex >= normalizedSteps.length - 1}
                aria-label="下一步"
              >
                下一步 ▶
              </button>
            </div>
            {/* 烹饪模式按钮 */}
            <div className="step-nav cooking-mode-launch">
              <Link
                to={`/recipe/${id}/cook`}
                className="cooking-mode-btn"
                aria-label="进入烹饪模式"
              >
                🍳 烹饪模式
              </Link>
            </div>
          </section>
        )}

        {/* 食谱故事（折叠式） */}
        {recipe.story && (
          <section id="section-story" className="detail-section detail-section--story">
            <h2
              className="detail-section__title detail-section__title--toggle"
              onClick={() => setShowStory(!showStory)}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowStory(!showStory) } }}
            >
              📖 食谱故事
              <span className={`accordion-arrow ${showStory ? 'accordion-arrow--open' : ''}`}>▸</span>
            </h2>
            {showStory && (
              <div className="detail-section__content story-content">
                <p>{recipe.story}</p>
              </div>
            )}
          </section>
        )}

        {/* 文化背景（折叠式） */}
        {recipe.culturalBackground && (
          <section className="detail-section detail-section--cultural">
            <h2
              className="detail-section__title detail-section__title--toggle"
              onClick={() => setShowCulturalBg(!showCulturalBg)}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowCulturalBg(!showCulturalBg) } }}
            >
              🌍 文化背景
              <span className={`accordion-arrow ${showCulturalBg ? 'accordion-arrow--open' : ''}`}>▸</span>
            </h2>
            {showCulturalBg && (
              <div className="detail-section__content cultural-content">
                <p>{recipe.culturalBackground}</p>
              </div>
            )}
          </section>
        )}

        {/* 烹饪小贴士 */}
        {recipe.tips && (
          <section className="detail-section detail-section--tips">
            <h2 className="detail-section__title">💡 烹饪小贴士</h2>
            <div className="tips-content">
              {(() => {
                // 按 • 或换行分割，生成列表
                const lines = recipe.tips
                  .split(/[•·]|\n/)
                  .map(l => l.trim())
                  .filter(Boolean)
                if (lines.length > 1) {
                  return (
                    <ul className="tips-list">
                      {lines.map((line, i) => (
                        <li key={i} className="tips-list__item">{line}</li>
                      ))}
                    </ul>
                  )
                }
                return <p>{recipe.tips}</p>
              })()}
            </div>
          </section>
        )}

        {/* 相似食谱推荐 */}
        {id && (
          <div className="detail-container__section">
            <SimilarRecipes recipeId={id} />
          </div>
        )}

        {/* 版本历史 */}
        {id && (
          <div className="detail-container__section">
            <RecipeVersionPanel recipeId={id} />
          </div>
        )}

        {/* 评论区 */}
        {id && (
          <section id="section-comments" className="detail-section detail-section--comments">
            <h2 className="detail-section__title">💬 评价与留言</h2>
            {/* 评分空状态引导 */}
            {recipe.avgRating != null && recipe.ratingCount === 0 && (
              <section className="detail-section detail-section--rating-prompt">
                <div className="rating-prompt">
                  <div className="rating-prompt__stars">☆ ☆ ☆ ☆ ☆</div>
                  <p className="rating-prompt__text">暂无评分，来做第一个评分的人吧！</p>
                  <p className="rating-prompt__hint">评分后可以帮助其他用户发现更好吃的菜谱 🍽️</p>
                </div>
              </section>
            )}
            <CommentSection recipeId={id} onRatingUpdate={handleRatingUpdate} />

            {/* ═══ #63: 改编版本列表 ═══ */}
            {(recipe as any)?.forkCount > 0 && forks.length > 0 && (
              <section className="detail-forks-section">
                <h3>🍴 改编版本（{forks.length}）</h3>
                <div className="detail-forks-list">
                  {forks.map(f => (
                    <Link key={f.id} to={`/recipe/${f.id}`} className="detail-forks-card">
                      {f.coverImage ? (
                        <img src={f.coverImage} alt={f.title} className="detail-forks-card__img" />
                      ) : (
                        <div className="detail-forks-card__img detail-forks-card__img--placeholder">🍽️</div>
                      )}
                      <div className="detail-forks-card__info">
                        <span className="detail-forks-card__title">{f.title}</span>
                        {f.forkedBy && (
                          <span className="detail-forks-card__author">{f.forkedBy.nickname || f.forkedBy.username}</span>
                        )}
                        {f.changesNote && (
                          <span className="detail-forks-card__note">{f.changesNote}</span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </section>
        )}
      </div>

      {/* ═══ 浮动操作栏（移动端）═══ */}
      <div className="floating-action-bar">
        <button
          className={`fab-btn ${isFavorited ? 'fab-btn--favorite' : ''}`}
          onClick={handleFavoriteToggle}
          disabled={favLoading}
          title={isFavorited ? '取消收藏' : '收藏'}
        >
          <span className={`fab-btn__icon ${favLoading ? '' : isFavorited ? 'fab-btn__heart-active' : ''}`}>
            {favLoading ? '⋯' : isFavorited ? '❤️' : '🤍'}
          </span>
          <span>{isFavorited ? '已收藏' : '收藏'}</span>
        </button>
        {isFavorited && (
          <button
            className="fab-btn"
            onClick={() => setNoteModalVisible(true)}
            title={favoriteNote ? '编辑备注' : '添加备注'}
          >
            <span className="fab-btn__icon">📝</span>
            <span>{favoriteNote ? '备注' : '加备注'}</span>
          </button>
        )}

        {/* Cook It 按钮 — 移动端 */}
        <button
          className={`fab-btn ${isCooked ? 'fab-btn--cooked' : ''}`}
          onClick={handleCookToggle}
          disabled={cookLoading}
          title={isCooked ? '取消标记' : '我做过'}
        >
          <span className="fab-btn__icon">
            {cookLoading ? '⋯' : isCooked ? '👨‍🍳' : '🍳'}
          </span>
          <span>
            {cookLoading ? '' : isCooked
              ? `已做过${cookCount > 1 ? cookCount + '次' : ''}`
              : '我做过'}
          </span>
        </button>

        {/* 做过状态下 → 写日志快捷入口 */}
        {isCooked && (
          <Link to={`/cooking-journal?recipeId=${id}`} className="fab-btn" title="写烹饪日志">
            <span className="fab-btn__icon">📝</span>
            <span>写日志</span>
          </Link>
        )}

        <button className="fab-btn" onClick={handleFork} disabled={forking} title="改编食谱">
          <span className="fab-btn__icon">{forking ? '⋯' : '🍴'}</span>
          <span>{forking ? '改编中...' : '改编'}</span>
        </button>

        <AddToCollectionDropdown recipeId={id} label="📁" />

        <button className="fab-btn" onClick={handleShare} title="分享食谱">
          <span className="fab-btn__icon">📤</span>
          <span>分享</span>
        </button>

        <button className="fab-btn" onClick={() => window.print()} title="打印食谱">
          <span className="fab-btn__icon">🖨️</span>
          <span>打印</span>
        </button>

        {recipe && (
          <ExportMenu recipeId={recipe.id} recipeTitle={recipe.title} mobile />
        )}

        {recipe && (
          <button className="fab-btn" onClick={() => setShowQualityModal(true)} title="查看质量评分">
            <span className="fab-btn__icon">📊</span>
            <span>评分</span>
          </button>
        )}

        {recipe && (
          <button className="fab-btn" onClick={handleCopyIngredients} title="复制食材">
            <span className="fab-btn__icon">📋</span>
            <span>食材</span>
          </button>
        )}
      </div>

      {/* 图片灯箱 */}
      {lightboxIndex !== null && allImages.length > 0 && (
        <ImageLightbox
          images={allImages}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {/* 分享弹窗 */}
      {showShareModal && id && (
        <ShareModal
          recipeId={id}
          recipeTitle={recipe.title}
          recipeImage={recipe.coverImage}
          recipeDesc={recipe.description}
          onClose={() => setShowShareModal(false)}
        />
      )}
      {showQualityModal && (
        <QualityScoreModal
          recipeId={id!}
          onClose={() => setShowQualityModal(false)}
        />
      )}

      {/* 收藏备注弹窗 */}
      <FavoriteNoteModal
        visible={noteModalVisible}
        onClose={() => setNoteModalVisible(false)}
        recipeId={id!}
        initialNote={favoriteNote}
        onSaved={(newNote) => setFavoriteNote(newNote)}
      />

      {/* 返回顶部 */}
      <button
        className={`back-to-top ${showBackToTop ? 'back-to-top--visible' : 'back-to-top--hidden'}`}
        onClick={scrollToTop}
        aria-label="返回顶部"
        title="返回顶部"
      >
        ↑
      </button>

    </div>
  )
}