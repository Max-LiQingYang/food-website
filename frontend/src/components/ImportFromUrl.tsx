import { useState } from 'react'
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
  const toast = useToast()

  const handleImport = async () => {
    if (!url.trim()) {
      toast.warning('请输入食谱 URL')
      return
    }

    setLoading(true)
    try {
      const result = await importRecipeFromUrl(url.trim())
      onImport(result)
      toast.success('导入成功！请确认内容后发布')
      setUrl('')
    } catch (err: any) {
      const msg = err?.message || '导入失败'
      // 从错误响应中提取更具体的信息
      if (msg.includes('422')) toast.error('该页面未找到结构化食谱数据')
      else if (msg.includes('408')) toast.error('请求超时，请检查 URL')
      else toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      e.preventDefault()
      handleImport()
    }
  }

  return (
    <div className="import-url">
      <div className="import-url__row">
        <input
          type="url"
          className="import-url__input"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="粘贴食谱网页链接（支持 Schema.org 结构化数据）"
          disabled={loading}
        />
        <button
          className="import-url__btn"
          onClick={handleImport}
          disabled={loading || !url.trim()}
        >
          {loading ? '解析中…' : '从 URL 导入 📥'}
        </button>
      </div>
      <p className="import-url__hint">
        支持大多数包含 Schema.org Recipe 结构化数据的食谱网站（下厨房、豆果美食等）
      </p>
    </div>
  )
}