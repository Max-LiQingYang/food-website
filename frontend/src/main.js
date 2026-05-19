import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// ── 简易 $message 插件（兼容 FavoriteButton / FavoriteList 的 $message 调用）─────────
const messagePlugin = {
  install(app) {
    function createToast(type, content, duration = 2500) {
      // 移除已存在的 toast
      const existing = document.querySelector('.qclaw-toast')
      if (existing) existing.remove()

      const toast = document.createElement('div')
      toast.className = `qclaw-toast qclaw-toast--${type}`
      toast.textContent = content
      toast.style.cssText = [
        'position:fixed',
        'top:24px',
        'left:50%',
        'transform:translateX(-50%)',
        'padding:10px 20px',
        'border-radius:8px',
        'font-size:14px',
        'z-index:9999',
        'pointer-events:none',
        'transition:opacity 0.3s ease',
        'white-space:nowrap',
        'box-shadow:0 4px 12px rgba(0,0,0,0.15)',
        type === 'success' ? 'background:#52c41a;color:#fff' : '',
        type === 'error'   ? 'background:#ff4d4f;color:#fff' : '',
        type === 'warning' ? 'background:#faad14;color:#fff' : '',
        type === 'info'    ? 'background:#1890ff;color:#fff'  : ''
      ].filter(Boolean).join(';')

      document.body.appendChild(toast)
      setTimeout(() => { toast.style.opacity = '0' }, duration - 300)
      setTimeout(() => toast.remove(), duration)
    }

    app.config.globalProperties.$message = {
      success: (msg) => createToast('success', msg),
      error:   (msg) => createToast('error',   msg),
      warning: (msg) => createToast('warning', msg),
      info:    (msg) => createToast('info',    msg)
    }
  }
}

const app = createApp(App)

app.use(messagePlugin)
app.use(router)

app.mount('#app')
