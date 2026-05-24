import { useEffect, useCallback, useState, useRef, createContext, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import './KeyboardShortcuts.css'

interface Shortcut {
  key: string
  ctrl?: boolean
  shift?: boolean
  label: string
  description: string
  action: () => void
}

interface ShortcutsContextType {
  isHelpOpen: boolean
  openHelp: () => void
  closeHelp: () => void
}

const ShortcutsContext = createContext<ShortcutsContextType>({
  isHelpOpen: false,
  openHelp: () => {},
  closeHelp: () => {},
})

export const useShortcuts = () => useContext(ShortcutsContext)

const isFormField = (el: EventTarget | null): boolean => {
  const tag = (el as HTMLElement)?.tagName?.toLowerCase()
  const role = (el as HTMLElement)?.getAttribute('role')
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    role === 'textbox' ||
    (el as HTMLElement)?.isContentEditable
  )
}

interface KeyboardShortcutsProps {
  onGlobalSearch?: () => void
}

export const KeyboardShortcutsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const navigate = useNavigate()
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  // Try to find the search input globally
  useEffect(() => {
    const findSearchInput = () => {
      const input = document.querySelector<HTMLInputElement>(
        'input[type="text"][placeholder*="搜索"], input[type="search"], .global-search-input'
      )
      if (input) searchInputRef.current = input
    }
    // Check on mount and after navigation
    findSearchInput()
    const observer = new MutationObserver(findSearchInput)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger in form fields (except Escape)
    if (isFormField(e.target) && e.key !== 'Escape') return

    const isCmdOrCtrl = e.metaKey || e.ctrlKey

    // Ctrl+K / Cmd+K - Open search
    if (isCmdOrCtrl && e.key === 'k') {
      e.preventDefault()
      const searchInput = document.querySelector<HTMLInputElement>(
        'input[type="text"][placeholder*="搜索"], input[type="search"], .global-search-input'
      )
      if (searchInput) {
        searchInput.focus()
        searchInput.select()
      } else {
        navigate('/search')
      }
      return
    }

    // Ctrl+N / Cmd+N - Create recipe
    if (isCmdOrCtrl && e.key === 'n') {
      e.preventDefault()
      navigate('/recipe/new')
      return
    }

    // Escape - Close modals/panels
    if (e.key === 'Escape') {
      // Close any open modal/panel
      const closeBtns = document.querySelectorAll<HTMLElement>(
        '[class*="modal"] [class*="close"], [class*="overlay"], [class*="panel"] [class*="close"]'
      )
      for (const btn of closeBtns) {
        btn.click()
        break
      }
      // Close help panel if open
      setIsHelpOpen(false)
      return
    }

    // ? - Show shortcuts help
    if (e.key === '?' && !isFormField(e.target)) {
      e.preventDefault()
      setIsHelpOpen(prev => !prev)
      return
    }
  }, [navigate])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <ShortcutsContext.Provider value={{
      isHelpOpen,
      openHelp: () => setIsHelpOpen(true),
      closeHelp: () => setIsHelpOpen(false),
    }}>
      {children}
      {isHelpOpen && <ShortcutsHelpPanel onClose={() => setIsHelpOpen(false)} />}
    </ShortcutsContext.Provider>
  )
}

const SHORTCUTS: Shortcut[] = [
  { key: 'K', ctrl: true, label: '⌘K / Ctrl+K', description: '打开全局搜索', action: () => {} },
  { key: 'N', ctrl: true, label: '⌘N / Ctrl+N', description: '创建新食谱', action: () => {} },
  { key: 'Escape', label: 'Esc', description: '关闭弹窗/面板', action: () => {} },
  { key: '?', label: '?', description: '显示快捷键帮助', action: () => {} },
]

const ShortcutsHelpPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  return (
    <div className="shortcuts-overlay" role="dialog" aria-label="快捷键帮助">
      <div className="shortcuts-panel" ref={panelRef}>
        <div className="shortcuts-panel__header">
          <h2>⌨️ 快捷键</h2>
          <button className="shortcuts-panel__close" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </div>
        <div className="shortcuts-panel__list">
          {SHORTCUTS.map(s => (
            <div key={s.key + (s.ctrl ? '-ctrl' : '')} className="shortcuts-panel__item">
              <kbd className="shortcuts-panel__key">{s.label}</kbd>
              <span className="shortcuts-panel__desc">{s.description}</span>
            </div>
          ))}
        </div>
        <p className="shortcuts-panel__hint">
          快捷键在输入框内不会触发，Esc 可以关闭此面板
        </p>
      </div>
    </div>
  )
}

export default KeyboardShortcutsProvider