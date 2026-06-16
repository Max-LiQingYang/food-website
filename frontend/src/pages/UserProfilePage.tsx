import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  getUserProfile,
  getUserRecipes,
  getUserFavorites,
  getUserStats,
  getCollections,
  getUserAchievements,
  updateProfile,
  getAuthorInfo,
  getUserForks,
  getCookedRecipes,
  getUserRatingPrivacy,
  putUserRatingPrivacy,
  type Recipe,
  type UserStats,
  type Collection,
  type AchievementItem,
  type AuthorLevelInfo,
  type ForkInfo,
  type CookedRecipeItem,
} from '../api'
import RecipeCard from '../components/RecipeCard'
import FavoriteNoteModal from '../components/FavoriteNoteModal'
import Pagination from '../components/Pagination'
import BrowsingHistory from '../components/BrowsingHistory'
import ActivityHeatmap from '../components/ActivityHeatmap'
import AchievementDetailModal from '../components/AchievementDetailModal'
import './UserProfilePage.css'
import PageSkeleton from '../components/PageSkeleton'
import StatsCharts from '../components/StatsCharts/StatsCharts'
import AchievementsPanel from '../components/AchievementsPanel/AchievementsPanel'
import RatingHistoryModule from '../components/RatingHistoryModule'

type TabType = 'recipes' | 'favorites' | 'collections' | 'cooked'
type TabTypeWithHistory = TabType | 'history' | 'forks'

// ─── CountUp 组件 ───
function AnimatedNumber({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0)
  const [started, setStarted] = useState(false)
  const startTimeRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [started])

  useEffect(() => {
    if (!started) return
    startTimeRef.current = null
    const step = (timestamp: number) => {
      if (startTimeRef.current === null) startTimeRef.current = timestamp
      const elapsed = timestamp - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = progress * (2 - progress)
      setDisplay(Math.round(value * eased))
      if (progress < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [value, duration, started])

  return <span ref={ref} className="countup-value">{display}</span>
}

// ─── Achievement 成就徽章组件 ───
function AchievementBadge({ achievement, onClick }: { achievement: AchievementItem; onClick?: () => void }) {
  const icon = achievement.icon || '🎖️'
  const unlocked = achievement.unlocked !== false

  return (
    <div
      className={`achievement-badge ${unlocked ? '' : 'achievement-badge--locked'}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.() } }}
      title={`${achievement.title}: ${achievement.description}`}
    >
      <div className="achievement-badge__glow" style={unlocked ? {} : { filter: 'grayscale(1)', opacity: 0.5 }}>
        <span className="achievement-badge__icon">{icon}</span>
      </div>
      <span className="achievement-badge__name">{achievement.title}</span>
      {achievement.progress != null && achievement.maxProgress != null && (
        <div className="achievement-badge__progress">
          <div
            className="achievement-badge__progress-fill"
            style={{
              width: `${Math.min(100, (achievement.progress / achievement.maxProgress) * 100)}%`,
              background: unlocked ? 'linear-gradient(90deg, #f5a623, #f7c948)' : '#888'
            }}
          />
        </div>
      )}
      {unlocked && achievement.unlockedAt && (
        <div className="achievement-badge__tooltip">
          <div className="achievement-badge__tooltip-title">{achievement.title}</div>
          <div className="achievement-badge__tooltip-desc">{achievement.description}</div>
          <div className="achievement-badge__tooltip-date">
            获得于 {new Date(achievement.unlockedAt).toLocaleDateString('zh-CN')}
          </div>
        </div>
      )}
    </div>
  )
}

// ═══ #63: 改编食谱组件 ═══
function ForksTab({ userId }: { userId: string }) {
  const [forks, setForks] = useState<ForkInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 20

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    getUserForks(userId, { page, pageSize })
      .then(res => {
        if (res.success) {
          setForks(res.forks)
          setTotal(res.count)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId, page])

  if (loading) {
    return (
      <div className="profile-page">
        <PageSkeleton type="profile" />
      </div>
    )
  }

  if (forks.length === 0) {
    return (
      <div className="profile-empty">
        <div className="profile-empty__icon" style={{ fontSize: 48 }}>🍴</div>
        <p className="profile-empty__text">还没有改编过食谱</p>
        <p style={{ color: '#888', fontSize: 14 }}>浏览食谱，点击「改编」按钮创建自己的版本</p>
      </div>
    )
  }

  return (
    <>
      <div className="profile-grid">
        {forks.map(f => (
          <Link key={f.id} to={`/recipe/${f.id}`}>
            <RecipeCard
              recipe={{
                id: f.id,
                title: f.title,
                coverImage: f.coverImage,
                description: f.description,
                category: f.category,
                cookTime: f.cookTime,
                servings: f.servings,
                difficulty: f.difficulty as any,
                createdAt: f.createdAt,
              }}
            />
          </Link>
        ))}
      </div>
      {total > pageSize && (
        <div className="profile-pagination">
          {Array.from({ length: Math.ceil(total / pageSize) }, (_, i) => (
            <button
              key={i}
              className={`btn btn--sm ${page === i + 1 ? 'btn--primary' : 'btn--outline'}`}
              onClick={() => setPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </>
  )
}

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>()
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [activeTab, setActiveTab] = useState<TabTypeWithHistory>('recipes')
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [achievements, setAchievements] = useState<AchievementItem[]>([])
  // 迭代 #134：评分历史隐私设置（默认公开）
  const [ratingsHistoryPublic, setRatingsHistoryPublic] = useState(true)
  const [authorLevel, setAuthorLevel] = useState<AuthorLevelInfo | null>(null)
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementItem | null>(null)

  // Recipes state
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [recipesTotal, setRecipesTotal] = useState(0)
  const [recipesPage, setRecipesPage] = useState(1)
  const [recipesLoading, setRecipesLoading] = useState(true)

  // Favorites state
  const [favorites, setFavorites] = useState<Recipe[]>([])
  const [favoritesTotal, setFavoritesTotal] = useState(0)
  const [favoritesPage, setFavoritesPage] = useState(1)
  const [favoritesLoading, setFavoritesLoading] = useState(true)

  // Collections state
  const [collections, setCollections] = useState<Collection[]>([])
  const [collectionsLoading, setCollectionsLoading] = useState(true)

  // Cooked state (Iter#99)
  const [cookedRecipes, setCookedRecipes] = useState<CookedRecipeItem[]>([])
  const [cookedTotal, setCookedTotal] = useState(0)
  const [cookedLoading, setCookedLoading] = useState(false)
  const [cookedPage, setCookedPage] = useState(1)
  const cookedPageSize = 20

  // Note modal state
  const [noteModalVisible, setNoteModalVisible] = useState(false)
  const [noteTargetId, setNoteTargetId] = useState<string>('')
  const [noteTargetRecipe, setNoteTargetRecipe] = useState<Recipe | null>(null)
  const [noteTargetNote, setNoteTargetNote] = useState<string | null>(null)

  // Edit profile modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [editNickname, setEditNickname] = useState('')
  const [editAvatar, setEditAvatar] = useState('')
  const [saving, setSaving] = useState(false)

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const pageSize = 12

  // Check if current user owns this profile
  useEffect(() => {
    try {
      const stored = localStorage.getItem('user')
      if (stored) {
        const user = JSON.parse(stored)
        setIsOwnProfile(user.id === id)
      }
      setIsLoggedIn(!!localStorage.getItem('token'))
    } catch {
      // ignore
    }
  }, [id])

  // 迭代 #134：加载评分历史隐私设置
  useEffect(() => {
    if (!id) return
    getUserRatingPrivacy(id)
      .then(res => {
        if (res && typeof res.ratingsHistoryPublic === 'boolean') {
          setRatingsHistoryPublic(res.ratingsHistoryPublic)
        }
      })
      .catch(err => {
        // 默认公开，失败不影响主流程
        console.warn('[UserProfilePage] failed to load rating privacy', err)
      })
  }, [id])

  // Load profile + stats + achievements
  useEffect(() => {
    if (!id) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setLoading(true)

    Promise.all([
      getUserProfile(id),
      getUserStats(id),
      getUserAchievements(id),
    ])
      .then(([profileRes, statsRes, achRes]: [any, any, any]) => {
        const p = profileRes.data ?? profileRes
        const s = statsRes.data ?? statsRes
        // 新 API 直接返回完整成就列表（含 unlocked 字段）
        const a = Array.isArray(achRes) ? achRes : (Array.isArray(achRes.data) ? achRes.data : [])
        setProfile(p)
        setStats(s)
        setAchievements(a)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))

    // 异步加载作者等级
    getAuthorInfo(id)
      .then(res => setAuthorLevel(res.level))
      .catch(() => {/* 静默 */})
  }, [id])

  // Load recipes tab
  useEffect(() => {
    if (!id || activeTab !== 'recipes') return
    setRecipesLoading(true)
    getUserRecipes({ userId: id, page: recipesPage, pageSize })
      .then((res: any) => {
        const d = res.data ?? res
        setRecipes(d.list || [])
        setRecipesTotal(d.total || 0)
      })
      .catch(() => {})
      .finally(() => setRecipesLoading(false))
  }, [id, activeTab, recipesPage])

  // Load favorites tab
  useEffect(() => {
    if (!id || activeTab !== 'favorites') return
    setFavoritesLoading(true)
    getUserFavorites({ userId: id, page: favoritesPage, pageSize })
      .then((res: any) => {
        const d = res.data ?? res
        setFavorites(d.list || [])
        setFavoritesTotal(d.total || 0)
      })
      .catch(() => {})
      .finally(() => setFavoritesLoading(false))
  }, [id, activeTab, favoritesPage])

  // Load collections tab
  useEffect(() => {
    if (!id || activeTab !== 'collections') return
    setCollectionsLoading(true)
    getCollections()
      .then((res: any) => {
        const list = res.data?.list ?? res.list ?? []
        setCollections(list)
      })
      .catch(() => {})
      .finally(() => setCollectionsLoading(false))
  }, [id, activeTab])

  // Load cooked tab (Iter#99)
  useEffect(() => {
    if (!id || activeTab !== 'cooked') return
    setCookedLoading(true)
    getCookedRecipes(id, { page: cookedPage, pageSize: cookedPageSize })
      .then(res => {
        setCookedRecipes(res.list)
        setCookedTotal(res.total)
      })
      .catch(() => {
        setCookedRecipes([])
        setCookedTotal(0)
      })
      .finally(() => setCookedLoading(false))
  }, [id, activeTab, cookedPage])

  // Open edit modal
  function openEditModal() {
    setEditNickname(profile?.nickname || '')
    setEditAvatar(profile?.avatar || '')
    setShowEditModal(true)
  }

  // Save profile edit
  async function handleSaveProfile() {
    setSaving(true)
    try {
      const res: any = await updateProfile({
        nickname: editNickname || null,
        avatar: editAvatar || null,
      })
      const updated = res.data ?? res
      setProfile(updated)
      setShowEditModal(false)
      try {
        const stored = localStorage.getItem('user')
        if (stored) {
          const user = JSON.parse(stored)
          user.nickname = updated.nickname
          user.avatar = updated.avatar
          localStorage.setItem('user', JSON.stringify(user))
        }
      } catch {
        // ignore
      }
    } catch (err) {
      console.error('Failed to update profile', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-skeleton">
          <div className="skeleton-box" style={{ width: 80, height: 80, borderRadius: '50%', margin: '0 auto' }} />
          <div className="skeleton-box skeleton-heading" style={{ width: '40%', margin: '16px auto' }} />
          <div className="skeleton-box skeleton-line short" style={{ margin: '0 auto' }} />
          <div className="profile-skeleton__stats">
            {[1, 2, 3].map(i => (
              <div key={i} className="profile-skeleton__stat-card">
                <div className="skeleton-box" style={{ width: 28, height: 28, margin: '0 auto', borderRadius: 8 }} />
                <div className="skeleton-box" style={{ width: 40, height: 14, margin: '8px auto 4px' }} />
                <div className="skeleton-box" style={{ width: 24, height: 10, margin: '0 auto' }} />
              </div>
            ))}
          </div>
          <div className="profile-skeleton__tabs">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton-box" style={{ width: 72, height: 32, borderRadius: 8 }} />
            ))}
          </div>
          <div className="profile-grid" style={{ marginTop: 20 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="profile-card-skeleton">
                <div className="skeleton-box skeleton-cover" style={{ height: 140 }} />
                <div style={{ padding: 12 }}>
                  <div className="skeleton-box" style={{ height: 16, width: '70%' }} />
                  <div className="skeleton-box" style={{ height: 12, width: '45%', marginTop: 8 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div className="profile-page">
        <div className="profile-notfound">
          <div className="profile-notfound__icon">👤</div>
          <h2>用户不存在</h2>
          <p>该用户可能已注销</p>
          <Link to="/" className="btn btn--primary">返回首页</Link>
        </div>
      </div>
    )
  }

  const displayName = profile.nickname || profile.username

  function renderCurrentList() {
    const lists: Record<TabType, { items: any[]; total: number; loading: boolean; page: number; setPage: (v: number | ((p: number) => number)) => void; emptyIcon: string; emptyText: string }> = {
      recipes: {
        items: recipes, total: recipesTotal, loading: recipesLoading, page: recipesPage,
        setPage: setRecipesPage, emptyIcon: '📝', emptyText: '还没有发布食谱',
      },
      favorites: {
        items: favorites, total: favoritesTotal, loading: favoritesLoading, page: favoritesPage,
        setPage: setFavoritesPage, emptyIcon: '❤️', emptyText: '还没有收藏食谱',
      },
      collections: {
        items: collections, total: collections.length, loading: collectionsLoading, page: 1,
        setPage: () => {}, emptyIcon: '📁', emptyText: '还没有创建收藏夹',
      },
    }
    return lists[activeTab]
  }

  const cur = renderCurrentList()

  return (
    <div className="profile-page">
      {/* Header (P-1: hero 渐变 + 段位徽章) */}
      <div className="profile-header">
        <div className="profile-header__hero" aria-hidden="true" />
        <div className="profile-avatar-wrapper">
          {profile.avatar ? (
            <img src={profile.avatar} alt={displayName} className="profile-avatar-img" />
          ) : (
            <div className="profile-avatar">{displayName.charAt(0).toUpperCase()}</div>
          )}
          {isOwnProfile && (
            <button className="profile-avatar-edit" onClick={openEditModal} title="编辑资料">
              ✏️
            </button>
          )}
        </div>
        <h1 className="profile-name">{displayName}</h1>
        {profile.nickname && <p className="profile-username">@{profile.username}</p>}
        {authorLevel && (
          <span
            className={`profile-level-chip ${authorLevel.isMaxLevel ? 'profile-level-chip--max' : ''}`}
            title={authorLevel.isMaxLevel ? '已达满级' : `Lv.${authorLevel.level} ${authorLevel.title}`}
          >
            {authorLevel.icon} Lv.{authorLevel.level} {authorLevel.title}
          </span>
        )}
        <p className="profile-joined">
          加入于 {new Date(profile.createdAt).toLocaleDateString('zh-CN')}
        </p>
      </div>

      {/* Stats Cards with CountUp (P-2: 食谱为主项，其余 4 个为次级) */}
      {stats && (
        <div className="profile-stats">
          <div className="profile-stats__card profile-stats__card--primary">
            <span className="profile-stats__icon">📝</span>
            <span className="profile-stats__value"><AnimatedNumber value={stats.recipeCount ?? 0} /></span>
            <span className="profile-stats__label">食谱</span>
          </div>
          <div className="profile-stats__card profile-stats__card--secondary">
            <span className="profile-stats__icon">❤️</span>
            <span className="profile-stats__value"><AnimatedNumber value={stats.favoriteCount ?? 0} /></span>
            <span className="profile-stats__label">收藏</span>
          </div>
          <div className="profile-stats__card profile-stats__card--secondary">
            <span className="profile-stats__icon">💬</span>
            <span className="profile-stats__value"><AnimatedNumber value={stats.commentCount ?? 0} /></span>
            <span className="profile-stats__label">评论</span>
          </div>
          <div className="profile-stats__card profile-stats__card--secondary">
            <span className="profile-stats__icon">👥</span>
            <span className="profile-stats__value"><AnimatedNumber value={stats.followersCount ?? 0} /></span>
            <span className="profile-stats__label">粉丝</span>
          </div>
          <div className="profile-stats__card profile-stats__card--secondary">
            <span className="profile-stats__icon">➡️</span>
            <span className="profile-stats__value"><AnimatedNumber value={stats.followingCount ?? 0} /></span>
            <span className="profile-stats__label">关注</span>
          </div>
        </div>
      )}

      {/* 作者等级 (P-3: 满级特殊视觉 — 金色边框 + 🏆 渐变进度条) */}
      {authorLevel && (
        <div className={`profile-level ${authorLevel.isMaxLevel ? 'profile-level--max' : ''}`}>
          <div className="profile-level__header">
            <span className="profile-level__icon">{authorLevel.isMaxLevel ? '🏆' : authorLevel.icon}</span>
            <span className="profile-level__title">Lv.{authorLevel.level} {authorLevel.title}</span>
            {!authorLevel.isMaxLevel && (
              <span className="profile-level__next">→ Lv.{authorLevel.level + 1} {authorLevel.nextTitle}</span>
            )}
          </div>
          <div className="profile-level__bar-container">
            <div
              className="profile-level__bar"
              style={{ width: `${(authorLevel.progress * 100).toFixed(1)}%` }}
            />
          </div>
          {!authorLevel.isMaxLevel && (
            <div className="profile-level__score">
              {authorLevel.score} / {authorLevel.nextLevelScore} 分
            </div>
          )}
          {authorLevel.isMaxLevel && (
            <div className="profile-level__score profile-level__score--max">🏆 已达满级！</div>
          )}
        </div>
      )}

      {/* 成就徽章区 (P-4: 强化引导 — 显示 N 待解锁 + 主色按钮样式) */}
      {achievements.length > 0 && (
        <section className="profile-section">
          <div className="profile-section__header">
            <h3 className="profile-section__title">🏅 成就</h3>
          </div>
          <div className="profile-achievements">
            <div className="profile-achievements__header">
              <div className="profile-achievements__stats">
                已解锁 {achievements.filter(a => a.unlocked).length} / {achievements.length}
                {achievements.filter(a => !a.unlocked).length > 0 && (
                  <span className="profile-achievements__locked-hint">
                    {' '}· 还有 {achievements.filter(a => !a.unlocked).length} 个待解锁
                  </span>
                )}
              </div>
              <Link to="/achievements" className="profile-achievements__view-all">
                查看全部成就 ›
              </Link>
            </div>
            <div className="profile-achievements__list">
              {achievements.filter(a => a.unlocked).slice(0, 12).map(ach => (
                <AchievementBadge
                  key={ach.type}
                  achievement={ach}
                  onClick={() => setSelectedAchievement(ach)}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 烹饪热力图 (P-6: 包装为 section 加 h3 + 视觉分隔) */}
      {id && (
        <section className="profile-section">
          <div className="profile-section__header">
            <h3 className="profile-section__title">🔥 烹饪足迹</h3>
          </div>
          <ActivityHeatmap userId={id} />
        </section>
      )}

      {/* 迭代 #134：用户个人评分历史可视化模块 */}
      {id && (
        <section className="profile-section">
          <RatingHistoryModule
            userId={id}
            isOwner={isOwnProfile}
            privacyPublic={ratingsHistoryPublic}
            isLoggedIn={isLoggedIn}
            onPrivacyChange={(next) => setRatingsHistoryPublic(next)}
          />
        </section>
      )}

      {/* 成就面板 */}
      <section className="profile-section">
        <div className="profile-section__header">
          <h3 className="profile-section__title">🎖️ 成就面板</h3>
        </div>
        <AchievementsPanel userId={id!} />
      </section>

      {/* 数据趋势图 */}
      <section className="profile-section">
        <div className="profile-section__header">
          <h3 className="profile-section__title">📊 数据趋势</h3>
        </div>
        <StatsCharts userId={id!} />
      </section>

      {/* Tabs */}
      <div className="profile-tabs">
        <button
          className={`profile-tab ${activeTab === 'recipes' ? 'profile-tab--active' : ''}`}
          onClick={() => setActiveTab('recipes')}
        >
          发布的食谱{' '}
          {recipesTotal > 0 && <span className="profile-tab__count">({recipesTotal})</span>}
        </button>
        <button
          className={`profile-tab ${activeTab === 'favorites' ? 'profile-tab--active' : ''}`}
          onClick={() => setActiveTab('favorites')}
        >
          收藏的食谱{' '}
          {favoritesTotal > 0 && <span className="profile-tab__count">({favoritesTotal})</span>}
        </button>
        <button
          className={`profile-tab ${activeTab === 'collections' ? 'profile-tab--active' : ''}`}
          onClick={() => setActiveTab('collections')}
        >
          收藏夹{' '}
          {collections.length > 0 && <span className="profile-tab__count">({collections.length})</span>}
        </button>
        {isOwnProfile && (
          <button
            className={`profile-tab ${activeTab === 'history' ? 'profile-tab--active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            👣 足迹
          </button>
        )}
        {isOwnProfile && (
          <button
            className={`profile-tab ${activeTab === 'forks' ? 'profile-tab--active' : ''}`}
            onClick={() => setActiveTab('forks')}
          >
            🍴 我的改编
          </button>
        )}
      </div>

      {/* Content */}
      <div className="profile-content">
        {activeTab === 'history' ? (
          <div style={{ padding: '0 0 20px' }}><BrowsingHistory /></div>
        ) : activeTab === 'collections' ? (
          <>
            {collectionsLoading ? (
              <div className="profile-grid">
                {[1, 2, 3].map(i => (
                  <div key={i} className="profile-card-skeleton">
                    <div className="skeleton-box skeleton-cover" style={{ height: 120 }} />
                    <div className="skeleton-box skeleton-line" style={{ margin: '12px 14px' }} />
                  </div>
                ))}
              </div>
            ) : collections.length === 0 ? (
              <div className="profile-empty">
                <div className="profile-empty__icon">{cur.emptyIcon}</div>
                <p className="profile-empty__text">{cur.emptyText}</p>
              </div>
            ) : (
              <>
                <div className="profile-collections-grid">
                  {collections.map(col => (
                    <Link to={`/collections/${col.id}`} key={col.id} className="collection-card">
                      <div className="collection-card__cover">
                        <span className="collection-card__icon">📁</span>
                      </div>
                      <div className="collection-card__info">
                        <h3 className="collection-card__name">{col.name}</h3>
                        {col.description && <p className="collection-card__desc">{col.description}</p>}
                        <span className="collection-card__count">
                          {(col as any).recipes?.length ?? (col as any).recipeCount ?? 0} 个食谱
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
                {isOwnProfile && (
                  <div style={{ textAlign: 'center', marginTop: 24 }}>
                    <Link to="/collections" className="btn btn--outline">管理所有收藏夹</Link>
                  </div>
                )}
              </>
            )}
          </>
        ) : activeTab === 'forks' ? (
          <ForksTab userId={id!} />
        ) : (
          <>
            {cur.loading ? (
              <div className="profile-grid">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="profile-card-skeleton">
                    <div className="skeleton-box skeleton-cover" />
                    <div className="skeleton-box skeleton-line" style={{ margin: '12px 14px' }} />
                    <div className="skeleton-box skeleton-line short" style={{ margin: '0 14px 14px' }} />
                  </div>
                ))}
              </div>
            ) : cur.items.length === 0 ? (
              <EmptyState
                icon={cur.emptyIcon}
                title={cur.emptyText}
                variant="compact"
                ctaText={activeTab === 'recipes' ? '发布第一个食谱' : '去探索'}
                ctaLink={activeTab === 'recipes' ? '/create' : '/'}
              />
            ) : (
              <>
                <div className="profile-grid">
                  {cur.items.map((recipe: Recipe) => (
                    <div key={recipe.id} className="profile-recipe-wrapper">
                      <RecipeCard recipe={recipe} />
                      {activeTab === 'favorites' && (
                        <div
                          className={`user-note-preview ${(recipe as any).note ? '' : 'user-note-preview--empty'}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            setNoteTargetId(recipe.id)
                            setNoteTargetNote((recipe as any).note || null)
                            setNoteModalVisible(true)
                          }}
                        >
                          {(recipe as any).note ? (
                            <span className="user-note-preview__text">{(recipe as any).note}</span>
                          ) : (
                            <span className="user-note-preview__add">+ 添加备注</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <Pagination current={cur.page} total={Math.ceil(cur.total / pageSize)} onChange={(p) => { cur.setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
              </>
            )}
          </>
        )}
      </div>

      {/* Achievement Detail Modal */}
      {selectedAchievement && (
        <AchievementDetailModal
          achievement={selectedAchievement}
          onClose={() => setSelectedAchievement(null)}
        />
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">编辑资料</h2>
            <div className="form-field">
              <label className="form-label">头像 URL</label>
              <input type="text" className="form-input" placeholder="输入头像图片链接..." value={editAvatar} onChange={e => setEditAvatar(e.target.value)} />
              {editAvatar && (
                <div className="avatar-preview-wrapper">
                  <img src={editAvatar} alt="预览" className="avatar-preview" />
                </div>
              )}
            </div>
            <div className="form-field">
              <label className="form-label">昵称</label>
              <input type="text" className="form-input" placeholder="输入新昵称..." value={editNickname} onChange={e => setEditNickname(e.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="btn btn--primary" disabled={saving} onClick={handleSaveProfile}>
                {saving ? '保存中...' : '保存'}
              </button>
              <button className="btn btn--outline" onClick={() => setShowEditModal(false)}>取消</button>
            </div>
          </div>
        </div>
      )}

      {/* 收藏备注弹窗 */}
      <FavoriteNoteModal
        visible={noteModalVisible}
        onClose={() => { setNoteModalVisible(false); setNoteTargetId(''); setNoteTargetNote(null) }}
        recipeId={noteTargetId}
        initialNote={noteTargetNote}
        onSaved={(newNote) => {
          setFavorites(prev => prev.map(r =>
            r.id === noteTargetId ? { ...r, note: newNote } : r
          ))
        }}
      />
    </div>
  )
}
