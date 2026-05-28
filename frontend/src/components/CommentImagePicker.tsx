import { useRef, useState, useEffect } from 'react'
import './CommentImagePicker.css'

interface Props {
  images: File[]
  onChange: (files: File[]) => void
  maxCount?: number
  maxSizeMB?: number
}

export default function CommentImagePicker({ images, onChange, maxCount = 3, maxSizeMB = 5 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previews, setPreviews] = useState<string[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    // Generate preview URLs for display
    const urls = images.map(f => URL.createObjectURL(f))
    setPreviews(urls)
    return () => urls.forEach(url => URL.revokeObjectURL(url))
  }, [images])

  const handleSelect = () => {
    inputRef.current?.click()
  }

  const handleFiles = (fileList: FileList | null) => {
    setError('')
    if (!fileList || fileList.length === 0) return

    const newFiles: File[] = []
    const remaining = maxCount - images.length

    for (let i = 0; i < fileList.length && newFiles.length < remaining; i++) {
      const file = fileList[i]
      // Validate type
      const validTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!validTypes.includes(file.type)) {
        setError(`"${file.name}" 格式不支持，仅支持 jpg/png/webp`)
        continue
      }
      // Validate size
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`"${file.name}" 超过 ${maxSizeMB}MB 限制`)
        continue
      }
      newFiles.push(file)
    }

    if (newFiles.length > 0) {
      onChange([...images, ...newFiles])
    }
  }

  const handleRemove = (index: number) => {
    const next = images.filter((_, i) => i !== index)
    onChange(next)
  }

  return (
    <div className="comment-image-picker">
      <div className="comment-image-picker__previews">
        {previews.map((url, i) => (
          <div key={i} className="comment-image-picker__item">
            <img src={url} alt={`图片 ${i + 1}`} className="comment-image-picker__thumb" />
            <button
              type="button"
              className="comment-image-picker__remove"
              onClick={() => handleRemove(i)}
              aria-label="移除图片"
            >
              ✕
            </button>
          </div>
        ))}
        {images.length < maxCount && (
          <button type="button" className="comment-image-picker__add" onClick={handleSelect}>
            <span className="comment-image-picker__plus">+</span>
            <span className="comment-image-picker__hint">{images.length}/{maxCount}</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="comment-image-picker__input"
        onChange={e => { handleFiles(e.target.files); e.target.value = '' }}
      />

      {error && <p className="comment-image-picker__error">{error}</p>}
    </div>
  )
}
