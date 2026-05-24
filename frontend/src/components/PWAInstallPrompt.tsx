import { useState, useEffect } from 'react'
import './PWAInstallPrompt.css'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // 已安装检测
    window.addEventListener('appinstalled', () => {
      setInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
    })

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setInstalled(true)
    }
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setDeferredPrompt(null)
  }

  if (!showPrompt || installed) return null

  return (
    <div className="pwa-prompt" role="alertdialog" aria-label="安装应用" aria-describedby="pwa-prompt-desc">
      <button
        className="pwa-prompt__close"
        onClick={handleDismiss}
        aria-label="关闭安装提示"
      >
        ✕
      </button>
      <div className="pwa-prompt__content">
        <div className="pwa-prompt__icon">🍽️</div>
        <div className="pwa-prompt__text">
          <p id="pwa-prompt-desc" className="pwa-prompt__title">安装美食食谱应用</p>
          <p className="pwa-prompt__subtitle">一键安装，随时浏览美食</p>
        </div>
        <button className="pwa-prompt__install" onClick={handleInstall} aria-label="安装应用">
          安装
        </button>
      </div>
    </div>
  )
}