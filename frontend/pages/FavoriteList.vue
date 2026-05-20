<template>
  <div class="favorite-list">
    <!-- 页面标题 -->
    <div class="favorite-list__header">
      <h2 class="favorite-list__title">我的收藏</h2>
      <span class="favorite-list__count">共 {{ pagination.total }} 个食谱</span>
    </div>

    <!-- 加载骨架屏（首次加载） -->
    <div v-if="loading && list.length === 0" class="favorite-list__skeleton">
      <div v-for="n in 6" :key="n" class="recipe-card recipe-card--skeleton">
        <div class="recipe-card__cover skeleton-box" />
        <div class="recipe-card__info">
          <div class="skeleton-box skeleton-box--title" />
          <div class="skeleton-box skeleton-box--meta" />
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!loading && list.length === 0" class="favorite-list__empty">
      <div class="empty-icon">🍳</div>
      <p class="empty-text">还没有收藏任何食谱</p>
      <p class="empty-hint">去逛逛发现喜欢的菜品吧~</p>
      <button class="btn btn--primary" @click="$router.push('/')">去探索</button>
    </div>

    <!-- 食谱列表 -->
    <div v-else ref="listTop" class="favorite-list__grid">
      <div
        v-for="item in list"
        :key="item.id"
        class="recipe-card"
        @click="item.recipe && $router.push(`/recipe/${item.recipe.id}`)"
      >
        <!-- 食谱已被删除的兜底展示 -->
        <template v-if="!item.recipe">
          <div class="recipe-card__cover recipe-card__cover--deleted">
            <div class="recipe-card__deleted-icon">🍽️</div>
            <span class="recipe-card__deleted-badge">已删除</span>
          </div>
          <div class="recipe-card__info">
            <h3 class="recipe-card__title recipe-card__title--deleted">食谱已不存在</h3>
            <p class="recipe-card__author">该食谱已被作者删除</p>
            <p class="recipe-card__date">
              收藏于 {{ formatDate(item.createdAt) }}
            </p>
          </div>
        </template>

        <!-- 正常食谱卡片 -->
        <template v-else>
          <!-- 封面图 -->
          <div class="recipe-card__cover">
            <img
              :src="item.recipe.coverImage || '/images/default-recipe.jpg'"
              :alt="item.recipe.title"
              loading="lazy"
            />
            <!-- 烹饪时间角标 -->
            <span class="recipe-card__cooktime">
              ⏱ {{ item.recipe.cookTime || '—' }} 分钟
            </span>
          </div>

          <!-- 食谱信息 -->
          <div class="recipe-card__info">
            <h3 class="recipe-card__title">{{ item.recipe.title }}</h3>
            <p class="recipe-card__author">
              👨‍🍳 {{ item.recipe.author || '未知作者' }}
            </p>
            <p class="recipe-card__date">
              收藏于 {{ formatDate(item.createdAt) }}
            </p>
          </div>

          <!-- 取消收藏按钮（浮于封面右上角） -->
          <button
            class="recipe-card__unfav"
            :disabled="item.removing"
            :aria-label="'取消收藏：' + item.recipe.title"
            @click.stop="unfavorite(item)"
          >
            <span v-if="item.removing">⋯</span>
            <span v-else>❤️</span>
          </button>
        </template>
      </div>
    </div>

    <!-- 分页 -->
    <div
      v-if="pagination.total > pagination.pageSize"
      class="favorite-list__pagination"
    >
      <button
        class="pagination-btn"
        :disabled="pagination.page <= 1 || loading"
        @click="goPage(pagination.page - 1)"
      >
        ← 上一页
      </button>
      <span class="pagination-info">
        第 {{ pagination.page }} / {{ totalPages }} 页
      </span>
      <button
        class="pagination-btn"
        :disabled="pagination.page >= totalPages || loading"
        @click="goPage(pagination.page + 1)"
      >
        下一页 →
      </button>
    </div>

    <!-- 翻页加载遮罩 -->
    <div v-if="loading && list.length > 0" class="favorite-list__overlay">
      <div class="overlay-spinner" />
    </div>
  </div>
</template>

<script>
import { getFavoriteList, removeFavorite } from '../api'

export default {
  name: 'FavoriteList',

  data() {
    return {
      loading: false,
      list: [], // 当前页收藏数据
      pagination: {
        page: 1,
        pageSize: 12,
        total: 0
      }
    }
  },

  computed: {
    totalPages() {
      return Math.ceil(this.pagination.total / this.pagination.pageSize)
    }
  },

  mounted() {
    this.fetchList()
  },

  methods: {
    /** 获取收藏列表 */
    async fetchList() {
      this.loading = true
      try {
        const res = await getFavoriteList({
          page: this.pagination.page,
          pageSize: this.pagination.pageSize
        })
        // 注入 removing 标记（用于取消收藏局部更新）
        this.list = (res.data.list || []).map((item) => ({
          ...item,
          removing: false
        }))
        this.pagination.total = res.data.total || 0
      } catch (error) {
        this.$message.error(error.message || '加载收藏列表失败')
      } finally {
        this.loading = false
      }
    },

    /** 取消收藏（局部更新，无需重新请求列表） */
    async unfavorite(item) {
      if (item.removing) return
      item.removing = true

      try {
        await removeFavorite(item.recipe.id)
        // 乐观删除：从列表中移除
        this.list = this.list.filter((i) => i.id !== item.id)
        this.pagination.total -= 1
        this.$message.success('已取消收藏')
      } catch (error) {
        item.removing = false
        this.$message.error(error.message || '取消收藏失败')
      }
    },

    /** 翻页 */
    async goPage(page) {
      this.pagination.page = page
      await this.fetchList()
      // 翻页后滚动到列表顶部
      this.$nextTick(() => {
        const el = this.$refs.listTop
        if (el && typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        } else if (el) {
          // jsdom 测试环境中 scrollIntoView 不可用，降级为 scrollTop
          window.scrollTo({ top: el.offsetTop, behavior: 'smooth' })
        }
      })
    },

    /** 格式化收藏时间 */
    formatDate(isoString) {
      if (!isoString) return '—'
      const date = new Date(isoString)
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }
  }
}
</script>

<style scoped>
.favorite-list {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px 16px;
  position: relative;
}

/* ── 页面头部 ── */
.favorite-list__header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 24px;
}

.favorite-list__title {
  font-size: 22px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
}

.favorite-list__count {
  font-size: 14px;
  color: #999;
}

/* ── 空状态 ── */
.favorite-list__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 0;
  gap: 12px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 8px;
}

.empty-text {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.empty-hint {
  font-size: 14px;
  color: #999;
  margin: 0 0 16px;
}

/* ── 卡片网格 ── */
.favorite-list__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
}

/* ── 食谱卡片 ── */
.recipe-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  position: relative;
}

.recipe-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
}

.recipe-card__cover {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: #f5f5f5;
}

/* 已删除食谱占位封面 */
.recipe-card__cover--deleted {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f0f0f0, #e8e8e8);
  cursor: default;
}

.recipe-card__deleted-icon {
  font-size: 48px;
  opacity: 0.4;
  margin-bottom: 8px;
}

.recipe-card__deleted-badge {
  font-size: 12px;
  color: #999;
  background: #e0e0e0;
  padding: 2px 10px;
  border-radius: 10px;
}

.recipe-card__title--deleted {
  color: #bbb;
  font-style: italic;
}

.recipe-card__cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.recipe-card:hover .recipe-card__cover img {
  transform: scale(1.05);
}

.recipe-card__cooktime {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  backdrop-filter: blur(4px);
}

.recipe-card__info {
  padding: 12px 14px 14px;
}

.recipe-card__title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recipe-card__author {
  font-size: 13px;
  color: #666;
  margin: 0 0 4px;
}

.recipe-card__date {
  font-size: 12px;
  color: #bbb;
  margin: 0;
}

/* 取消收藏按钮 */
.recipe-card__unfav {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.recipe-card__unfav:hover:not(:disabled) {
  background: #fff;
  transform: scale(1.15);
}

.recipe-card__unfav:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ── 骨架屏 ── */
.skeleton-box {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border-radius: 6px;
}

.skeleton-box--title {
  height: 18px;
  width: 70%;
  margin-bottom: 8px;
}

.skeleton-box--meta {
  height: 14px;
  width: 45%;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── 分页 ── */
.favorite-list__pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 32px;
}

.pagination-btn {
  padding: 8px 20px;
  border: 1px solid #d9d9d9;
  border-radius: 20px;
  background: #fff;
  font-size: 14px;
  color: #333;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pagination-btn:hover:not(:disabled) {
  border-color: #ff4d4f;
  color: #ff4d4f;
}

.pagination-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pagination-info {
  font-size: 14px;
  color: #666;
}

/* ── 翻页加载遮罩 ── */
.favorite-list__overlay {
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.overlay-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f0f0f0;
  border-top-color: #ff4d4f;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── 移动端响应式（375px 宽度）── */
@media (max-width: 480px) {
  .favorite-list {
    padding: 16px 12px;
  }

  .favorite-list__title {
    font-size: 18px;
  }

  .favorite-list__count {
    font-size: 12px;
  }

  .favorite-list__grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .recipe-card__info {
    padding: 10px 12px 12px;
  }

  .recipe-card__title {
    font-size: 15px;
  }

  .recipe-card__author {
    font-size: 12px;
  }

  .recipe-card__date {
    font-size: 11px;
  }

  .recipe-card__unfav {
    width: 28px;
    height: 28px;
    font-size: 14px;
    top: 8px;
    right: 8px;
  }

  .favorite-list__pagination {
    flex-wrap: wrap;
    gap: 10px;
  }

  .pagination-btn {
    padding: 6px 14px;
    font-size: 13px;
  }

  .pagination-info {
    font-size: 13px;
  }

  .favorite-list__empty {
    padding: 40px 0;
  }

  .empty-icon {
    font-size: 48px;
  }

  .empty-text {
    font-size: 16px;
  }
}
</style>
