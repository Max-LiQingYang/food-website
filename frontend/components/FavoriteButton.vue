<template>
  <button
    :class="['favorite-btn', { 'is-favorited': localFavorited, 'is-loading': loading, 'is-heart-burst': heartAnimating }]"
    :disabled="loading"
    :title="localFavorited ? '取消收藏' : '收藏'"
    :aria-label="localFavorited ? '取消收藏' : '收藏'"
    :aria-pressed="localFavorited"
    @click="handleClick"
  >
    <!-- 加载中状态 -->
    <span v-if="loading" class="favorite-btn__spinner" aria-hidden="true" />
    <!-- 已收藏状态 -->
    <span v-else-if="localFavorited" class="favorite-btn__icon">❤️</span>
    <!-- 未收藏状态 -->
    <span v-else class="favorite-btn__icon">🤍</span>
    <span class="favorite-btn__text">{{ localFavorited ? '已收藏' : '收藏' }}</span>
  </button>
</template>

<script>
import { addFavorite, removeFavorite } from '../api'

export default {
  name: 'FavoriteButton',

  props: {
    recipeId: {
      type: String,
      required: true
    },
    isFavorited: {
      type: Boolean,
      default: false
    },
    // 是否在点击时弹出 Toast（可选，依赖项目 Toast 组件）
    showToast: {
      type: Boolean,
      default: true
    }
  },

  data() {
    return {
      loading: false,
      localFavorited: false,
      heartAnimating: false
    }
  },

  watch: {
    // 同步外部传入的收藏状态
    isFavorited: {
      immediate: true,
      handler(val) {
        this.localFavorited = val
      }
    }
  },

  methods: {
    /**
     * 点击收藏按钮
     * — 未登录：引导至登录页
     * — 已登录：乐观更新 + 调用 API
     */
    async handleClick() {
      // 未登录用户：弹窗提示或跳转登录页
      if (!this.checkLogin()) {
        this.$message.warning('请先登录后再收藏~')
        this.$router.push('/login?redirect=' + encodeURIComponent(this.$route.fullPath))
        return
      }

      // 防止重复点击
      if (this.loading) return

      // ── 乐观更新（先更新 UI，再请求 API）─────────────────
      const previousState = this.localFavorited
      this.localFavorited = !previousState
      this.loading = true

      try {
        if (previousState) {
          // 取消收藏
          await removeFavorite(this.recipeId)
          this.$message.success('已取消收藏')
        } else {
          // 添加收藏：触发心形动画
          this.heartAnimating = true
          setTimeout(() => { this.heartAnimating = false }, 600)
          await addFavorite(this.recipeId)
          this.$message.success('收藏成功 ❤️')
        }
      } catch (error) {
        // API 失败：回滚 UI 状态
        this.localFavorited = previousState
        this.$message.error(error.message || '操作失败，请稍后重试')
      } finally {
        this.loading = false
      }
    },

    /**
     * 检查用户是否已登录
     * @returns {boolean}
     */
    checkLogin() {
      return !!localStorage.getItem('token')
    }
  }
}
</script>

<style scoped>
.favorite-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border: 1px solid #d9d9d9;
  border-radius: 20px;
  background: #fff;
  color: #666;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
  user-select: none;
}

.favorite-btn:hover:not(:disabled) {
  border-color: #ff4d4f;
  color: #ff4d4f;
}

.favorite-btn:focus-visible {
  box-shadow: 0 0 0 2px rgba(255, 77, 79, 0.2);
}

/* 已收藏状态 */
.favorite-btn.is-favorited {
  border-color: #ff4d4f;
  color: #ff4d4f;
  background: #fff1f0;
}

.favorite-btn.is-favorited:hover:not(:disabled) {
  background: #ff4d4f;
  color: #fff;
}

/* 加载状态 */
.favorite-btn.is-loading {
  opacity: 0.6;
  cursor: not-allowed;
}

.favorite-btn__spinner {
  width: 14px;
  height: 14px;
  border: 2px solid #d9d9d9;
  border-top-color: #ff4d4f;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.favorite-btn__icon {
  font-size: 16px;
  line-height: 1;
}

.favorite-btn__text {
  font-weight: 500;
}

/* ── 心形缩放弹跳动画 ── */
.favorite-btn.is-heart-burst .favorite-btn__icon {
  animation: heartBurst 0.6s ease;
}

@keyframes heartBurst {
  0% { transform: scale(1); }
  15% { transform: scale(0.5); }
  30% { transform: scale(1.4); }
  45% { transform: scale(0.85); }
  60% { transform: scale(1.15); }
  75% { transform: scale(0.95); }
  100% { transform: scale(1); }
}
</style>
