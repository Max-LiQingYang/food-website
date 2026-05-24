import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import SkipLink from '../components/SkipLink'

describe('SkipLink', () => {
  it('renders a link with href to main content', () => {
    render(<SkipLink />)
    const link = screen.getByText('跳转到主要内容')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '#main-content')
  })

  it('has correct aria-label', () => {
    render(<SkipLink />)
    const link = screen.getByLabelText('跳转到主要内容')
    expect(link).toBeInTheDocument()
  })
})