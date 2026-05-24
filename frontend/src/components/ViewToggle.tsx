import React from 'react'
import './ViewToggle.css'

export type ViewMode = 'grid' | 'list'

interface ViewToggleProps {
  value: ViewMode
  onChange: (mode: ViewMode) => void
}

const ViewToggle: React.FC<ViewToggleProps> = ({ value, onChange }) => {
  return (
    <div className="view-toggle" role="radiogroup" aria-label="视图切换">
      <button
        className={`view-toggle__btn ${value === 'grid' ? 'view-toggle__btn--active' : ''}`}
        onClick={() => onChange('grid')}
        role="radio"
        aria-checked={value === 'grid'}
        title="网格视图"
      >
        ▦
      </button>
      <button
        className={`view-toggle__btn ${value === 'list' ? 'view-toggle__btn--active' : ''}`}
        onClick={() => onChange('list')}
        role="radio"
        aria-checked={value === 'list'}
        title="列表视图"
      >
        ☰
      </button>
    </div>
  )
}

export default ViewToggle