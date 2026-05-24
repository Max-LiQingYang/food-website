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
  type Recipe,
  type UserStats,
  type Collection,
  type AchievementItem,
} from '../api'
import RecipeCard from '../components/RecipeCard'
import BrowsingHistory from '../components/BrowsingHistory'
import ActivityHeatmap from '../components/ActivityHeatmap'
import './UserProfilePage.css'

type TabType = 'recipes' | 'favorites' | 'collections'
type TabTypeWithHistory = TabType | 'history'

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
function AchievementBadge({ achievement }: { achievement: AchievementItem }) {
  const defaultIcons: Record<string, string> = {
    'first-recipe': '👨‍🍳',
    'first-favorite': '💖',
    'first-comment': '💬',
    'popular-recipe': '🏆',
    'favorite-50': '⭐',
    'master-chef': '👑',
  }
  const icon = achievement.icon || defaultIcons[achievement.type] || '🎖️'

  return (
    <div className="achievement-badge" title={`${achievement.title}: ${achievement.description}`}>
      <div className="achievement-badge__glow">
        <span className="achievement-badge__icon">{icon}</span>
      </div>
      <span className="achievement-badge__name">{achievement.title}</span>
      {achievement.progress != null && achievement.maxProgress != null && (
        <div className="achievement-badge__progress">
          <div
            className="achievement-badge__progress-fill"
            style={{ width: `${Math.min(100, (achievement.progress / achievement.maxProgress) * 100)}%` }}
          />
        </div>
      )}
      <div className="achievement-badge__tooltip">
        <div className="achievement-badge__tooltip-title">{achievement.title}</div>
        <div className="achievement-badge__tooltip-desc">{achievement.description}</div>
        <div className="achievement-badge__tooltip-date">
          获得于 {new Date(achievement.unlockedAt).toLocaleDateString('zh-CN')}
        </div>
      </div>
    </div>
  )
}

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>()
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [activeTab, setActiveTab] = useState<TabTypeWithHistory>('recipes')
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [achievements, setAchievements] = useState<AchievementItem[]>([])

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
    } catch {
      // ignore
    }
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
        const a = Array.isArray(achRes) ? achRes : (achRes.data ?? [])
        setProfile(p)
        setStats(s)
        setAchievements(a)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
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
      {/* Header */}
      <div className="profile-header">
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
        <p className="profile-joined">
          加入于 {new Date(profile.createdAt).toLocaleDateString('zh-CN')}
        </p>
      </div>

      {/* Stats Cards with CountUp */}
      {stats && (
        <div className="profile-stats">
          <div className="profile-stats__card">
            <span className="profile-stats__icon">📝</span>
            <span className="profile-stats__value"><AnimatedNumber value={stats.recipeCount ?? 0} /></span>
            <span className="profile-stats__label">食谱</span>
          </div>
          <div className="profile-stats__card">
            <span className="profile-stats__icon">❤️</span>
            <span className="profile-stats__value"><AnimatedNumber value={stats.favoriteCount ?? 0} /></span>
            <span className="profile-stats__label">收藏</span>
          </div>
          <div className="profile-stats__card">
            <span className="profile-stats__icon">💬</span>
            <span className="profile-stats__value"><AnimatedNumber value={stats.commentCount ?? 0} /></span>
            <span className="profile-stats__label">评论</span>
          </div>
          <div className="profile-stats__card">
            <span className="profile-stats__icon">👥</span>
            <span className="profile-stats__value"><AnimatedNumber value={stats.followersCount ?? 0} /></span>
            <span className="profile-stats__label">粉丝</span>
          </div>
          <div className="profile-stats__card">
            <span className="profile-stats__icon">➡️</span>
            <span className="profile-stats__value"><AnimatedNumber value={stats.followingCount ?? 0} /></span>
            <span className="profile-stats__label">关注</span>
          </div>
        </div>
      )}

      {/* 成就徽章区 */}
      {achievements.length > 0 && (
        <div className="profile-achievements">
          <h4 className="profile-achievements__title">🏅 成就</h4>
          <div className="profile-achievements__list">
            {achievements.map(ach => (
              <AchievementBadge key={ach.id} achievement={ach} />
            ))}
          </div>
        </div>
      )}

      {/* 烹饪热力图 */}
      {id && <ActivityHeatmap userId={id} />}

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
              <div className="profile-empty">
                <div className="profile-empty__icon">{cur.emptyIcon}</div>
                <p className="profile-empty__text">{cur.emptyText}</p>
                {activeTab === 'recipes' && (
                  <Link to="/create" className="btn btn--primary" style={{ marginTop: 12 }}>
                    发布第一个食谱
                  </Link>
                )}
              </div>
            ) : (
              <>
                <div className="profile-grid">
                  {cur.items.map((recipe: Recipe) => (
                    <RecipeCard key={recipe.id} recipe={recipe} />
                  ))}
                </div>
                {cur.total > pageSize && (
                  <div className="profile-pagination">
                    <button className="pagination-btn" disabled={cur.page <= 1} onClick={() => cur.setPage(p => p - 1)}>
                      上一页
                    </button>
                    <span className="pagination-info">{cur.page} / {Math.ceil(cur.total / pageSize)}</span>
                    <button className="pagination-btn" disabled={cur.page >= Math.ceil(cur.total / pageSize)} onClick={() => cur.setPage(p => p + 1)}>
                      下一页
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

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
    </div>
  )
}
