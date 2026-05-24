import React, { useState, useRef, useEffect } from 'react'
import { exportRecipeMD, exportRecipePDF } from '../api'
import './ExportMenu.css'

interface ExportMenuProps {
  recipeId: string
  recipeTitle: string
  className?: string
}

const ExportMenu: React.FC<ExportMenuProps> = ({ recipeId, recipeTitle, className }) => {
  const [open, setOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [toast, setToast] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const handleExportMD = async () => {
    setExporting(true)
    setOpen(false)
    try {
      const blob = await exportRecipeMD(recipeId)
      // Create download link
      const url = URL.createObjectURL(blob as Blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${recipeTitle}.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showToast('✅ Markdown 已下载')
    } catch {
      // Fallback: open in new tab
      window.open(`/api/recipes/${recipeId}/export?format=md`, '_blank')
    }
    setExporting(false)
  }

  const handleExportPDF = async () => {
    setExporting(true)
    setOpen(false)
    try {
      const blob = await exportRecipePDF(recipeId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${recipeTitle}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showToast('✅ PDF 已下载')
    } catch {
      showToast('❌ PDF 导出失败')
    }
    setExporting(false)
  }

  return (
    <div className={`export-menu-container ${className || ''}`} ref={ref}>
      <button
        className="export-btn"
        onClick={() => setOpen(!open)}
        disabled={exporting}
        aria-label="导出食谱"
      >
        📥 {exporting ? '导出中...' : '导出'}
      </button>

      {open && (
        <div className="export-dropdown">
          <button className="export-option" onClick={handleExportMD}>
            <span className="export-icon">📝</span>
            导出为 Markdown
          </button>
          <button className="export-option" onClick={handleExportPDF}>
            <span className="export-icon">📄</span>
            导出为 PDF
          </button>
        </div>
      )}

      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--color-bg)',
          color: 'var(--color-text)',
          padding: '10px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          zIndex: 9999,
          fontSize: '14px',
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}

export default ExportMenu