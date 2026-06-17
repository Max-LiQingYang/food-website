import { useState, useEffect } from 'react'
import { getMotionSafeScrollBehavior } from '../context/MotionPreferenceContext'
export default function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 400)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: getMotionSafeScrollBehavior() })
  }

  return (
    <button
      className={`back-to-top ${visible ? '' : 'back-to-top--hidden'}`}
      onClick={scrollToTop}
      aria-label="回到顶部"
    >
      ↑
    </button>
  )
}