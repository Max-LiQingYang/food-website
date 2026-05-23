import { useState, useEffect, useRef } from 'react'
import { importRecipeFromUrl } from '../api'
import { useToast } from '../context/ToastContext'
import type { ImportedRecipe } from '../api'
import './ImportFromUrl.css'

interface Props {
  onImport: (data: ImportedRecipe) => void
}

export default function ImportFromUrl({ onImport }: Props) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [errorDetail, setErrorDetail] = useState<string | null>(null)
  const [detectedUrl, setDetectedUrl] = useState<string | null>(null)
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)

  // 从剪贴板自动检测 URL
  useEffect(() => {
    const detectClipboard = async () => {
      try {
        // 使用 navigator.clipboard 读取
        const text = await navigator.clipboard.readText()
        if (text && isValidUrl(text) && !url) {
          setDetectedUrl(text)
          setUrl(text)
        }
      } catch {
        // 剪贴板权限不足，静默忽略
      }
    }
    detectClipboard()
  }, [])

  // 输入框 change 时清除检测状态和错误
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value)
    setErrorDetail(null)
    if (detectedUrl && e.target.value !== detectedUrl) {
      setDetectedUrl(null)
    }
  }

  const isValidUrl = (str: string) => {
    try {
      const u = new URL(str)
      return u.protocol === 'http:' || u.protocol === 'https:'
    } catch {
      return false
    }
  }

  const handleImport = async () => {
    const urlToUse = url.trim()
    if (!urlToUse) {
      toast.warning('请输入食谱 URL')
      return
    }

    if (!isValidUrl(urlToUse)) {
      setErrorDetail('请输入有效的网址（以 http:// 或 https:// 开头）')
      toast.error('无效的 URL 格式')
      return
    }

    setLoading(true)
    setErrorDetail(null)
    setProgress(10)

    // 进度模拟（实际导入以真实状态为准）
    const progressTimer = setInterval(() => {
      setProgress(prev => Math.min(prev + 15, 85))
    }, 800)

    try {
      const result = await importRecipeFromUrl(urlToUse)
      clearInterval(progressTimer)
      setProgress(100)
      setTimeout(() => {
        onImport(result)
        toast.success('导入成功！请确认内容后发布')
        setUrl('')
        setProgress(0)
        setDetectedUrl(null)
      }, 400)
    } catch (err: any) {
      clearInterval(progressTimer)
      setProgress(0)
      const msg = err?.message || err?.response?.data?.message || '导入失败'

      // 详细错误信息
      let detail = ''
      if (msg.includes('422')) {
        detail = '该页面未找到结构化食谱数据，请检查链接是否正确'
      } else if (msg.includes('408') || msg.includes('timeout') || msg.includes('超时')) {
        detail = '请求超时，请检查 URL 是否正确或网络连接是否正常'
      } else if (msg.includes('404')) {
        detail = '页面不存在，请确认链接地址正确'
      } else if (msg.includes('500') || msg.includes('服务器')) {
        detail = '服务器解析出错，请稍后重试'
      } else {
        detail = msg
      }
      setErrorDetail(detail)
      toast.error(msg.length > 40 ? '导入失败，请查看详细信息' : msg)
    } finally {
      if (progressTimer) clearInterval(progressTimer)
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      e.preventDefault()
      handleImport()
    }
  }

  // 粘贴时自动检测
  const handlePaste = () => {
    setTimeout(() => {
      const val = inputRef.current?.value || ''
      if (isValidUrl(val)) {
        setDetectedUrl(val)
        setErrorDetail(null)
      }
    }, 50)
  }

  return (
    <div className="import-url">
      <div className="import-url__row">
        <div className="import-url__input-wrap">
          <input
            ref={inputRef}
            type="url"
            className="import-url__input"
            value={url}
            onChange={handleChange}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            placeholder="粘贴食谱网页链接（支持 Schema.org 结构化数据）"
            disabled={loading}
          />
          {detectedUrl && !loading && (
            <span className="import-url__clipboard-indicator">
              📋 检测到剪贴板链接
            </span>
          )}
        </div>
        <button
          className="import-url__btn"
          onClick={handleImport}
          disabled={loading || !url.trim()}
        >
          {loading ? `解析中 ${progress}%` : '从 URL 导入 📥'}
        </button>
      </div>

      {/* 进度条 */}
      {loading && (
        <div className="import-url__progress-bar">
          <div
            className="import-url__progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* 错误详情 */}
      {errorDetail && (
        <div className="import-url__error">
          <span className="import-url__error-icon">⚠️</span>
          <span className="import-url__error-text">{errorDetail}</span>
        </div>
      )}

      {!loading && !errorDetail && (
        <p className="import-url__hint">
          支持大多数包含 Schema.org Recipe 结构化数据的食谱网站（下厨房、豆果美食等）
        </p>
      )}
    </div>
  )
}