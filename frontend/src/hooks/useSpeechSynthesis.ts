import { useState, useRef, useCallback, useEffect } from 'react'

interface SpeechSynthesisHook {
  speak: (text: string, onEnd?: () => void) => void
  pause: () => void
  resume: () => void
  stop: () => void
  speaking: boolean
  paused: boolean
  supported: boolean
}

export function useSpeechSynthesis(): SpeechSynthesisHook {
  const [speaking, setSpeaking] = useState(false)
  const [paused, setPaused] = useState(false)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const onEndRef = useRef<(() => void) | null>(null)

  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (utteranceRef.current) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!supported || !text) return

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.volume = 1.0

    utterance.onstart = () => {
      setSpeaking(true)
      setPaused(false)
    }

    utterance.onend = () => {
      setSpeaking(false)
      setPaused(false)
      onEndRef.current?.()
    }

    utterance.onerror = () => {
      setSpeaking(false)
      setPaused(false)
    }

    // Chrome requires user gesture context, but that's satisfied by button clicks
    utteranceRef.current = utterance
    onEndRef.current = onEnd || null
    window.speechSynthesis.speak(utterance)
  }, [supported])

  const pause = useCallback(() => {
    if (!supported) return
    window.speechSynthesis.pause()
    setPaused(true)
  }, [supported])

  const resume = useCallback(() => {
    if (!supported) return
    window.speechSynthesis.resume()
    setPaused(false)
  }, [supported])

  const stop = useCallback(() => {
    if (!supported) return
    window.speechSynthesis.cancel()
    setSpeaking(false)
    setPaused(false)
  }, [supported])

  return { speak, pause, resume, stop, speaking, paused, supported }
}