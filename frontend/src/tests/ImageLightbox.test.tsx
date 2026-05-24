import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ImageLightbox from '../components/ImageLightbox'

const mockImages = [
  { src: 'https://example.com/img1.jpg', alt: '封面图' },
  { src: 'https://example.com/img2.jpg', alt: '步骤图' },
]

describe('ImageLightbox', () => {
  it('renders current image', () => {
    render(<ImageLightbox images={mockImages} initialIndex={0} onClose={() => {}} />)
    const img = screen.getByAltText('封面图')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'https://example.com/img1.jpg')
  })

  it('shows image counter for multiple images', () => {
    render(<ImageLightbox images={mockImages} initialIndex={0} onClose={() => {}} />)
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
  })

  it('navigates to next image on right arrow click', () => {
    render(<ImageLightbox images={mockImages} initialIndex={0} onClose={() => {}} />)
    const nextBtn = screen.getByLabelText('下一张图片')
    fireEvent.click(nextBtn)
    expect(screen.getByText('2 / 2')).toBeInTheDocument()
  })

  it('navigates to prev image on left arrow click', () => {
    render(<ImageLightbox images={mockImages} initialIndex={1} onClose={() => {}} />)
    const prevBtn = screen.getByLabelText('上一张图片')
    fireEvent.click(prevBtn)
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
  })

  it('navigates with keyboard ArrowLeft', () => {
    render(<ImageLightbox images={mockImages} initialIndex={1} onClose={() => {}} />)
    fireEvent.keyDown(document, { key: 'ArrowLeft' })
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
  })

  it('navigates with keyboard ArrowRight', () => {
    render(<ImageLightbox images={mockImages} initialIndex={0} onClose={() => {}} />)
    fireEvent.keyDown(document, { key: 'ArrowRight' })
    expect(screen.getByText('2 / 2')).toBeInTheDocument()
  })

  it('closes on Escape key', () => {
    const onClose = vi.fn()
    render(<ImageLightbox images={mockImages} initialIndex={0} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn()
    render(<ImageLightbox images={mockImages} initialIndex={0} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('关闭图片查看器'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes when clicking overlay background', () => {
    const onClose = vi.fn()
    const { container } = render(<ImageLightbox images={mockImages} initialIndex={0} onClose={onClose} />)
    fireEvent.click(container.firstChild!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('has dialog role with modal attribute', () => {
    render(<ImageLightbox images={mockImages} initialIndex={0} onClose={() => {}} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-label', '图片查看器')
  })

  it('locks body scroll when mounted', () => {
    render(<ImageLightbox images={[{ src: 'img.jpg' }]} initialIndex={0} onClose={() => {}} />)
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('restores body scroll when unmounted', () => {
    const { unmount } = render(<ImageLightbox images={[{ src: 'img.jpg' }]} initialIndex={0} onClose={() => {}} />)
    unmount()
    expect(document.body.style.overflow).toBe('')
  })

  it('does not show counter for single image', () => {
    render(<ImageLightbox images={[{ src: 'img.jpg' }]} initialIndex={0} onClose={() => {}} />)
    expect(screen.queryByText('1 / 1')).not.toBeInTheDocument()
  })
})