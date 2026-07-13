import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import SkipLink from './components/SkipLink'
import { ToastProvider } from './context/ToastContext'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { MotionPreferenceProvider } from './context/MotionPreferenceContext'
import { DeviceTierProvider } from './context/DeviceTierContext'
import { ParticleProvider } from './context/ParticleContext'
import './styles/tokens.css'

// ── Service Worker 注册 ──
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(async (reg) => {
        // 检查是否已有推送订阅（供诊断使用）
        try {
          if (reg && reg.pushManager) {
            const sub = await reg.pushManager.getSubscription()
            if (sub) {
              // 已有订阅：后续 UI 会通过 usePushSubscription 读取
            }
          }
        } catch {
          // ignore
        }
      })
      .catch(() => {
        // SW 注册失败不影响主功能
      })
  })
}

const root = createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <SkipLink />
    <ThemeProvider>
      <MotionPreferenceProvider>
        <DeviceTierProvider>
          <ParticleProvider>
            <AuthProvider>
              <ToastProvider>
                <App />
              </ToastProvider>
            </AuthProvider>
          </ParticleProvider>
        </DeviceTierProvider>
      </MotionPreferenceProvider>
    </ThemeProvider>
  </React.StrictMode>
)