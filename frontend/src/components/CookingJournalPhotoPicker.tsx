import { useRef, useState } from 'react'
import { uploadCookingLogImages } from '../api'
import { useToast } from '../context/ToastContext'
import './CookingJournalPhotoPicker.css'

interface Props {
  photoUrls: string[]
  onChange: (urls: string[]) => void
  maxCount?: number
  maxSizeMB?: number
}

interface UploadingItem {
  id: string
  progress: number
  preview: string
}

export default function CookingJournalPhotoPicker({
  photoUrls,
  onChange,
  maxCount = 3,
  maxSizeMB = 5,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState<UploadingItem[]>([])
  const [dragOver, setDragOver] = useState(false)
  const toast = useToast()

  const totalSlots = photoUrls.length + uploading.length
  const canAddMore = totalSlots < maxCount

  const validateFile = (file: File): string | null => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return `"${file.name}" 格式不支持，仅支持 jpg/png/webp`
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `"${file.name}" 超过 ${maxSizeMB}MB 限制`
    }
    return null
  }

  const handleUpload = async (files: File[]) => {
    if (files.length === 0) return

    // Validate all files first
    for (const file of files) {
      const err = validateFile(file)
      if (err) {
        toast.error(err)
        return
      }
    }

    // Check slot limit
    const remaining = maxCount - photoUrls.length - uploading.length
    if (remaining <= 0) {
      toast.warning(`最多上传 ${maxCount} 张照片`)
      return
    }

    const filesToUpload = files.slice(0, remaining)
    if (filesToUpload.length < files.length) {
      toast.warning(`已选 ${files.length} 张，但只剩 ${remaining} 个位置`)
    }

    // Create uploading items with local previews
    const newUploading: UploadingItem[] = filesToUpload.map(f => ({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      progress: 0,
      preview: URL.createObjectURL(f),
    }))
    setUploading(prev => [...prev, ...newUploading])

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploading(prev =>
          prev.map(item => {
            if (newUploading.find(n => n.id === item.id)) {
              return { ...item, progress: Math.min(item.progress + 30, 90) }
            }
            return item
          })
        )
      }, 200)

      const result = await uploadCookingLogImages(filesToUpload)
      clearInterval(progressInterval)

      if (result.urls && result.urls.length > 0) {
        onChange([...photoUrls, ...result.urls])
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || '上传失败')
    } finally {
      // Clean up previews
      newUploading.forEach(item => URL.revokeObjectURL(item.preview))
      setUploading(prev => prev.filter(item => !newUploading.find(n => n.id === item.id)))
    }
  }

  const handleSelect = () => {
    if (!canAddMore) return
    inputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleUpload(Array.from(e.target.files))
    }
    e.target.value = ''
  }

  const handleRemove = (index: number) => {
    const next = [...photoUrls]
    next.splice(index, 1)
    onChange(next)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (canAddMore) setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    if (!canAddMore) return
    const files = Array.from(e.dataTransfer.files).filter(f =>
      ['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
    )
    if (files.length > 0) {
      handleUpload(files)
    }
  }

  return (
    <div className="cooking-journal-photo-picker">
      <div className="cooking-journal-photo-picker__content">
        {/* Uploaded photo thumbnails */}
        {photoUrls.map((url, i) => (
          <div key={url} className="cooking-journal-photo-picker__item">
            <img
              src={url}
              alt={`照片 ${i + 1}`}
              className="cooking-journal-photo-picker__thumb"
            />
            <button
              type="button"
              className="cooking-journal-photo-picker__remove"
              onClick={() => handleRemove(i)}
              aria-label="移除照片"
            >
              ✕
            </button>
          </div>
        ))}

        {/* Uploading items with progress */}
        {uploading.map(item => (
          <div key={item.id} className="cooking-journal-photo-picker__item cooking-journal-photo-picker__item--uploading">
            <img
              src={item.preview}
              alt="上传中"
              className="cooking-journal-photo-picker__thumb"
            />
            <div className="cooking-journal-photo-picker__progress">
              <div
                className="cooking-journal-photo-picker__progress-bar"
                style={{ width: `${item.progress}%` }}
              />
            </div>
          </div>
        ))}

        {/* Dropzone */}
        {canAddMore && (
          <button
            type="button"
            className={`cooking-journal-photo-picker__dropzone ${dragOver ? 'cooking-journal-photo-picker__dropzone--active' : ''}`}
            onClick={handleSelect}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <span className="cooking-journal-photo-picker__dropzone-icon">📸</span>
            <span className="cooking-journal-photo-picker__dropzone-text">拖拽照片到此处或点击上传</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="cooking-journal-photo-picker__input"
        onChange={handleFileChange}
      />

      {totalSlots > 0 && (
        <p className="cooking-journal-photo-picker__hint">
          {photoUrls.length}/{maxCount} 张 · 支持 jpg/png/webp，单张 ≤{maxSizeMB}MB
        </p>
      )}
    </div>
  )
}
