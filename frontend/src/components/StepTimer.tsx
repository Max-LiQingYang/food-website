import { useState, useRef, useCallback, useEffect } from 'react'
import './StepTimer.css'

interface StepTimerProps {
  stepNumber: number
  /** 原始步骤文本 */
  stepContent: string
}

/**
 * 从时间描述中解析秒数
 * 支持格式: "X分钟"、"X小时"、"X小时Y分钟"
 */
function parseDuration(text: string): number | null {
  const patterns = [
    // "1小时30分钟"
    { re: /(\d+)\s*小时\s*(\d+)\s*分钟/, fn: (m: RegExpMatchArray) => parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 },
    // "30分钟"
    { re: /(\d+)\s*分钟/, fn: (m: RegExpMatchArray) => parseInt(m[1]) * 60 },
    // "1小时"
    { re: /(\d+)\s*小时/, fn: (m: RegExpMatchArray) => parseInt(m[1]) * 3600 },
    // "Xs" 或 "X秒"
    { re: /(\d+)\s*秒/, fn: (m: RegExpMatchArray) => parseInt(m[1]) },
  ]

  for (const { re, fn } of patterns) {
    const match = text.match(re)
    if (match) {
      const secs = fn(match)
      if (secs > 0 && secs <= 36000) return secs // 上限10h
    }
  }
  return null
}

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function StepTimer({ stepNumber, stepContent }: StepTimerProps) {
  const seconds = parseDuration(stepContent)
  const [remaining, setRemaining] = useState<number | null>(seconds)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const intervalRef = useRef<number | null>(null)
  const notificationShown = useRef(false)

  // 同步 seconds 变化（步骤数据更新时重置）
  useEffect(() => {
    setRemaining(seconds)
    setRunning(false)
    setFinished(false)
    notificationShown.current = false
  }, [seconds])

  useEffect(() => {
    if (running && remaining != null && remaining > 0) {
      intervalRef.current = window.setInterval(() => {
        setRemaining(prev => {
          if (prev == null || prev <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current)
            setRunning(false)
            setFinished(true)
            // 播放提示音
            if (!notificationShown.current) {
              notificationShown.current = true
              try {
                const ctx = new AudioContext()
                const osc = ctx.createOscillator()
                const gain = ctx.createGain()
                osc.connect(gain)
                gain.connect(ctx.destination)
                osc.frequency.value = 880
                gain.gain.value = 0.3
                osc.start()
                osc.stop(ctx.currentTime + 0.5)
              } catch { /* 音频不可用 */ }
              if (Notification.permission === 'granted') {
                new Notification('⏰ 计时器完成', {
                  body: `步骤 ${stepNumber} 的计时已完成！`,
                  icon: '/icon.svg',
                })
              }
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running, stepNumber])

  const handleStart = useCallback(() => {
    if (remaining == null || remaining <= 0) {
      setRemaining(seconds)
    }
    setRunning(true)
    setFinished(false)
    notificationShown.current = false
  }, [remaining, seconds])

  const handlePause = useCallback(() => {
    setRunning(false)
  }, [])

  const handleReset = useCallback(() => {
    setRunning(false)
    setRemaining(seconds)
    setFinished(false)
    notificationShown.current = false
  }, [seconds])

  if (seconds == null) return null

  const progress = seconds > 0 && remaining != null
    ? Math.round(((seconds - remaining) / seconds) * 100)
    : finished ? 100 : 0

  return (
    <div
      className={`step-timer ${running ? 'step-timer--running' : ''} ${finished ? 'step-timer--done' : ''}`}
      role="timer"
      aria-label={`步骤 ${stepNumber} 计时器: ${remaining != null ? formatTime(remaining) : '未开始'}`}
      aria-live={running ? 'polite' : 'off'}
    >
      <div className="step-timer__display">
        <span className="step-timer__time">{remaining != null ? formatTime(remaining) : '--:--'}</span>
        {finished && <span className="step-timer__done-label">✓ 完成</span>}
      </div>
      <div className="step-timer__bar">
        <div
          className="step-timer__bar-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="step-timer__actions">
        {!running ? (
          <button
            className="step-timer__btn step-timer__btn--start"
            onClick={running ? undefined : handleStart}
            aria-label="开始计时"
          >
            ▶ {finished ? '重新计时' : (remaining === seconds ? '开始' : '继续')}
          </button>
        ) : (
          <button
            className="step-timer__btn step-timer__btn--pause"
            onClick={handlePause}
            aria-label="暂停计时"
          >
            ⏸ 暂停
          </button>
        )}
        {remaining != null && remaining < seconds && (
          <button
            className="step-timer__btn step-timer__btn--reset"
            onClick={handleReset}
            aria-label="重置计时器"
          >
            ↺ 重置
          </button>
        )}
      </div>
    </div>
  )
}