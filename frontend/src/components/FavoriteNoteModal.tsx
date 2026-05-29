import { useState, useEffect, useRef, useCallback } from 'react'
import { updateFavoriteNote } from '../api'
import './FavoriteNoteModal.css'

interface FavoriteNoteModalProps {
  visible: boolean
  onClose: () => void
  recipeId: string
  initialNote: string | null
  onSaved: (note: string | null) => void
}

export default function FavoriteNoteModal({
  visible,
  onClose,
  recipeId,
  initialNote,
  onSaved
}: FavoriteNoteModalProps) {
  const [text, setText] = useState(initialNote || '')
  const [saving, setSaving] = useState(false)
  const [closing, setClosing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // 同步 initialNote
  useEffect(() => {
    setText(initialNote || '')
  }, [initialNote])

  // 打开时聚焦 textarea
  useEffect(() => {
    if (visible) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [visible])

  // ESC 关闭
  useEffect(() => {
    if (!visible) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [visible])

  // 拖拽关闭暂不实现（JS touch 事件链较复杂），保持 CSS 结构兼容

  const handleClose = useCallback(() => {
    setClosing(true)
    setTimeout(() => {
      setClosing(false)
      onClose()
    }, 200)
  }, [onClose])

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    try {
      const trimmed = text.trim()
      const noteValue = trimmed === '' ? '' : trimmed
      await updateFavoriteNote(recipeId, noteValue)
      onSaved(noteValue === '' ? null : noteValue)
      handleClose()
    } catch {
      // 保存失败静默
    } finally {
      setSaving(false)
    }
  }

  if (!visible) return null

  const charCount = text.length
  const isOverLimit = charCount > 500
  const isWarn = charCount >= 450 && !isOverLimit

  return (
    <div
      className={`favorite-note-overlay ${closing ? 'favorite-note-overlay--closing' : ''}`}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div
        ref={modalRef}
        className={`favorite-note-modal ${closing ? 'favorite-note-modal--closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 移动端拖拽指示条 */}
        <div className="favorite-note-modal__drag-handle" />

        {/* 头部 */}
        <div className="favorite-note-modal__header">
          <h3 className="favorite-note-modal__title">收藏备注</h3>
          <button
            className="favorite-note-modal__close"
            onClick={handleClose}
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        {/* 主体 */}
        <div className="favorite-note-modal__body">
          <textarea
            ref={textareaRef}
            className="favorite-note-modal__textarea"
            placeholder="记录你的烹饪笔记…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            disabled={saving}
            rows={5}
          />
        </div>

        {/* 底部 */}
        <div className="favorite-note-modal__footer">
          <span
            className={[
              'favorite-note-modal__counter',
              isOverLimit ? 'favorite-note-modal__counter--over' : '',
              isWarn ? 'favorite-note-modal__counter--warn' : ''
            ].filter(Boolean).join(' ')}
          >
            {charCount}/500
          </span>
          <div className="favorite-note-modal__actions">
            <button
              className="favorite-note-modal__cancel"
              onClick={handleClose}
              disabled={saving}
            >
              取消
            </button>
            <button
              className="favorite-note-modal__save"
              onClick={handleSave}
              disabled={saving || isOverLimit}
            >
              {saving ? '保存中…' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
