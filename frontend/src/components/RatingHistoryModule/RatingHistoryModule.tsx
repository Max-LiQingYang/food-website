import { useEffect, useState, useRef, useCallback } from 'react'
import {
  getUserRatingSummary,
  getUserRatingHistory,
  getUserRatingTop,
  getUserRatingPrivacy,
  type RatingSummary,
  type RatingHistoryItem
} from '../../api'
import RatingDimensionAverages from './RatingDimensionAverages'
import RatingRadar from './RatingRadar'
import RatingTrendChart from './RatingTrendChart'
import RatingDistribution from './RatingDistribution'
import RatingTopList from './RatingTopList'
import RatingHistoryList from './RatingHistoryList'
import RatingPrivacyToggle from './RatingPrivacyToggle'
import RatingEmptyState from './RatingEmptyState'
import './RatingHistoryModule.css'

interface RatingHistoryModuleProps {
  userId: string
  isOwner: boolean
  /** 父级已读到的隐私值（避免模块内重复拉取） */
  privacyPublic: boolean
  /** 当前用户是否已登录（未登录时显示登录引导） */
  isLoggedIn: boolean
  /** 切到私有后回调（让父级刷新） */
  onPrivacyChange?: (next: boolean) => void
}

/** 4 维标签映射（前端多组件复用，与 DimensionRadar 保持一致） */
export const DIMENSION_LABELS: Record<string, string> = {
  taste: '口味',
  difficulty: '难度',
  presentation: '卖相',
  value: '性价比'
}

/** 4 维图标（用 emoji 保持轻量） */
export const DIMENSION_ICONS: Record<string, string> = {
  taste: '🍴',
  difficulty: '🔥',
  presentation: '🎨',
  value: '💰'
}

export default function RatingHistoryModule({
  userId,
  isOwner,
  privacyPublic,
  isLoggedIn,
  onPrivacyChange
}: RatingHistoryModuleProps) {
  // ─── 数据状态 ────────────────────────────────────────
  const [summary, setSummary] = useState<RatingSummary | null>(null)
  const [topHigh, setTopHigh] = useState<RatingHistoryItem[]>([])
  const [topLow, setTopLow] = useState<RatingHistoryItem[]>([])
  const [historyItems, setHistoryItems] = useState<RatingHistoryItem[]>([])
  const [historyTotal, setHistoryTotal] = useState(0)
  const [historyPage, setHistoryPage] = useState(1)
  const [historySort, setHistorySort] = useState<'time_desc' | 'rating_desc' | 'rating_asc'>('time_desc')

  // ─── 加载 / 错误状态 ────────────────────────────────
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false)
  const [historyError, setHistoryError] = useState(false)

  // ─── 趋势图 timeRange ──────────────────────────────
  const [trendRange, setTrendRange] = useState<'all' | '30d' | '90d' | '1y'>('all')

  // ─── 视口检测（懒加载） ───────────────────────────
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  // ─── 三接口并发（summary + top high + top low + history page 1） ──
  const fetchInitial = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(false)
    try {
      // allSettled 永不 reject，所以需要逐项处理 status
      // 仅当 4 个 API 全部 rejected 时才置 error（单个失败用兜底空数据降级）
      const results = await Promise.allSettled([
        getUserRatingSummary(userId, trendRange),
        getUserRatingTop(userId, 'high', 5),
        getUserRatingTop(userId, 'low', 5),
        getUserRatingHistory(userId, { page: 1, pageSize: 10, sort: historySort })
      ])

      const [summaryRes, topHighRes, topLowRes, historyRes] = results
      const rejectedCount = results.filter(r => r.status === 'rejected').length

      if (summaryRes.status === 'fulfilled') {
        setSummary(summaryRes.value)
      } else {
        console.error('[RatingHistoryModule] summary fetch failed', summaryRes.reason)
      }
      if (topHighRes.status === 'fulfilled') {
        setTopHigh(topHighRes.value?.items || [])
      } else {
        console.error('[RatingHistoryModule] topHigh fetch failed', topHighRes.reason)
      }
      if (topLowRes.status === 'fulfilled') {
        setTopLow(topLowRes.value?.items || [])
      } else {
        console.error('[RatingHistoryModule] topLow fetch failed', topLowRes.reason)
      }
      if (historyRes.status === 'fulfilled') {
        setHistoryItems(historyRes.value?.items || [])
        setHistoryTotal(historyRes.value?.total || 0)
        setHistoryPage(1)
      } else {
        console.error('[RatingHistoryModule] history fetch failed', historyRes.reason)
      }

      // 4 个 API 全部失败时，才视为整体错误（重试按钮可见）
      if (rejectedCount === results.length) {
        setError(true)
      }
    } catch (err) {
      // 理论上 allSettled 不会到这里，但保留兜底
      console.error('[RatingHistoryModule] Initial fetch failed', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [userId, trendRange, historySort])

  // 当进入视口 + userId 变化时加载
  useEffect(() => {
    if (inView && userId) {
      fetchInitial()
    }
  }, [inView, userId, fetchInitial])

  // ─── timeRange 变化时只重拉 summary ────────────────
  useEffect(() => {
    if (!inView || !userId) return
    getUserRatingSummary(userId, trendRange)
      .then(setSummary)
      .catch(err => console.error('[RatingHistoryModule] summary refetch failed', err))
  }, [trendRange, userId, inView])

  // ─── 排序切换：重拉 history page 1 ────────────────
  const handleSortChange = useCallback((sort: 'time_desc' | 'rating_desc' | 'rating_asc') => {
    setHistorySort(sort)
    setHistoryPage(1)
    getUserRatingHistory(userId, { page: 1, pageSize: 10, sort })
      .then(res => {
        setHistoryItems(res?.items || [])
        setHistoryTotal(res?.total || 0)
      })
      .catch(err => console.error('[RatingHistoryModule] history sort refetch failed', err))
  }, [userId])

  // ─── 加载更多 ─────────────────────────────────────
  const handleLoadMore = useCallback(async () => {
    if (historyLoadingMore) return
    setHistoryLoadingMore(true)
    setHistoryError(false)
    try {
      const nextPage = historyPage + 1
      const res = await getUserRatingHistory(userId, {
        page: nextPage,
        pageSize: 10,
        sort: historySort
      })
      setHistoryItems(prev => [...prev, ...(res?.items || [])])
      setHistoryPage(nextPage)
    } catch (err) {
      console.error('[RatingHistoryModule] load more failed', err)
      setHistoryError(true)
    } finally {
      setHistoryLoadingMore(false)
    }
  }, [userId, historyPage, historySort, historyLoadingMore])

  // ─── 隐私切换 ─────────────────────────────────────
  const handlePrivacyChange = useCallback(async (next: boolean) => {
    if (!isOwner) return
    try {
      await getUserRatingPrivacy(userId) // 验证接口可达（无副作用）
      onPrivacyChange?.(next)
    } catch (err) {
      console.error('[RatingHistoryModule] privacy toggle failed', err)
    }
  }, [userId, isOwner, onPrivacyChange])

  // ─── 派生：数据样本量级 ────────────────────────────
  const totalRatings = summary?.totalRatings || 0
  const validDims = summary?.validDimensionRatings || 0
  const sampleLevel = totalRatings === 0 ? 'L0'
    : totalRatings <= 2 ? 'L1'
    : totalRatings <= 4 ? 'L2'
    : totalRatings <= 9 ? 'L3'
    : 'L4'

  // ─── 登录占位（未登录访问他人） ─────────────────────
  if (!isLoggedIn) {
    return (
      <section ref={containerRef} className="rhm-module">
        <RatingEmptyState variant="login" />
      </section>
    )
  }

  // ─── 隐私私有（非本人） ─────────────────────────────
  if (!isOwner && !privacyPublic) {
    return (
      <section ref={containerRef} className="rhm-module">
        <RatingEmptyState variant="privacy" />
      </section>
    )
  }

  // ─── 0 条评分（全空） ────────────────────────────────
  if (!loading && !error && sampleLevel === 'L0') {
    return (
      <section ref={containerRef} className="rhm-module">
        <div className="rhm-module__header">
          <div>
            <h2 className="rhm-module__title">
              <span className="rhm-module__title-icon">📊</span>
              我的评分历史
            </h2>
            <p className="rhm-module__subtitle">回顾你的口味画像，发现评分趋势</p>
          </div>
          {isOwner && (
            <RatingPrivacyToggle
              ratingsHistoryPublic={privacyPublic}
              onChange={handlePrivacyChange}
            />
          )}
        </div>
        <RatingEmptyState variant="empty" />
      </section>
    )
  }

  // ─── 错误态 ─────────────────────────────────────
  if (error && !loading) {
    return (
      <section ref={containerRef} className="rhm-module">
        <div className="rhm-module__header">
          <h2 className="rhm-module__title">
            <span className="rhm-module__title-icon">📊</span>
            我的评分历史
          </h2>
        </div>
        <div className="rhm-error">
          <div className="rhm-error__icon">⚠️</div>
          <p className="rhm-error__msg">加载失败，请稍后重试</p>
          <button className="rhm-error__btn" onClick={fetchInitial}>重试</button>
        </div>
      </section>
    )
  }

  // ─── 加载骨架屏 ─────────────────────────────────
  if (loading && !summary) {
    return (
      <section ref={containerRef} className="rhm-module">
        <div className="rhm-module__header">
          <h2 className="rhm-module__title">
            <span className="rhm-module__title-icon">📊</span>
            我的评分历史
          </h2>
        </div>
        <div className="rhm-skeleton rhm-skeleton-block" />
        <div className="rhm-skeleton rhm-skeleton-block" style={{ height: 280 }} />
        <div className="rhm-skeleton rhm-skeleton-block" style={{ height: 160 }} />
        <div className="rhm-skeleton rhm-skeleton-row" />
        <div className="rhm-skeleton rhm-skeleton-row" />
      </section>
    )
  }

  // ─── 正常渲染 ─────────────────────────────────────
  return (
    <section ref={containerRef} className="rhm-module" aria-label="评分历史">
      <div className="rhm-module__header">
        <div>
          <h2 className="rhm-module__title">
            <span className="rhm-module__title-icon">📊</span>
            我的评分历史
          </h2>
          <p className="rhm-module__subtitle">
            {summary ? (
              <span className="rhm-module__meta">
                已评 {validDims} 道菜 · 共 {totalRatings} 次评分
              </span>
            ) : (
              <span className="rhm-module__meta">回顾你的口味画像</span>
            )}
          </p>
        </div>
        {isOwner && (
          <RatingPrivacyToggle
            ratingsHistoryPublic={privacyPublic}
            onChange={handlePrivacyChange}
          />
        )}
      </div>

      {/* 样本不足 banner（1-9 条） */}
      {(sampleLevel === 'L1' || sampleLevel === 'L2' || sampleLevel === 'L3') && (
        <div className="rhm-module__sample-banner" role="status">
          <span>⚠️</span>
          <span>样本较少，建议多评几条解锁完整画像</span>
        </div>
      )}

      {/* 4 维平均分卡片（≥ 1 条才显示） */}
      {summary && validDims > 0 && (
        <RatingDimensionAverages
          dimensionAverages={summary.dimensionAverages}
          sampleLevel={sampleLevel}
        />
      )}

      {/* 雷达 + 趋势 分栏（≥ 3 个有效维度才显示雷达；趋势 < 3 点显示占位） */}
      {summary && (
        <div className="rhm-row">
          <div className="rhm-section rhm-radar">
            <h3 className="rhm-section__title">
              <span className="rhm-section__title-icon">🎯</span>
              我的口味画像
            </h3>
            <RatingRadar
              dimensionAverages={summary.dimensionAverages}
              sampleLevel={sampleLevel}
            />
          </div>

          <div className="rhm-section rhm-trend">
            <h3 className="rhm-section__title">
              <span className="rhm-section__title-icon">📈</span>
              评分趋势
            </h3>
            <RatingTrendChart
              trend={summary.trend}
              range={trendRange}
              onRangeChange={setTrendRange}
            />
          </div>
        </div>
      )}

      {/* 4 维分布直方图（≥ 5 条显示） */}
      {summary && totalRatings >= 5 && (
        <div className="rhm-section">
          <h3 className="rhm-section__title">
            <span className="rhm-section__title-icon">📊</span>
            评分分布
          </h3>
          <RatingDistribution
            distribution={summary.distribution}
            sampleLevel={sampleLevel}
          />
        </div>
      )}

      {/* TOP 5 列表（≥ 1 条 rating 评论才显示） */}
      {summary && totalRatings > 0 && (
        <div className="rhm-section">
          <RatingTopList
            topHigh={topHigh}
            topLow={topLow}
          />
        </div>
      )}

      {/* 历史列表（≥ 1 条才显示） */}
      {summary && totalRatings > 0 && (
        <div className="rhm-section">
          <RatingHistoryList
            items={historyItems}
            total={historyTotal}
            sort={historySort}
            onSortChange={handleSortChange}
            onLoadMore={handleLoadMore}
            loadingMore={historyLoadingMore}
            loadMoreError={historyError}
            onRetryLoadMore={handleLoadMore}
          />
        </div>
      )}
    </section>
  )
}
