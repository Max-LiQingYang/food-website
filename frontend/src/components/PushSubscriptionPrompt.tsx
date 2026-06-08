/**
 * PushSubscriptionPrompt
 * \u6839\u636e\u6d4f\u89c8\u5668\u63a8\u9001\u6743\u9650\uff084 \u6001\uff09\u5c55\u793a\u4e0d\u540c\u63d0\u793a\u5361\u7247
 *
 * \u72b6\u6001\u6620\u5c04\uff08\u7ec4\u4ef6\u5185\u90e8\u5408\u5e76 dismissed\uff09\uff1a
 *   default      \u672a\u51b3\u5b9a\u3001\u672a\u59cb\u8ba2\u9605      \u2192 \u63a8\u5e7f\u5361\u7247\uff08\u5f00\u542f / \u7a0d\u540e\u518d\u8bf4\uff09
 *   granted      \u5df2\u6388\u6743\u4e14\u5df2\u8ba2\u9605           \u2192 \u6210\u529f\u7eff\u8272\u72b6\u6001 + \u53d6\u6d88\u8ba2\u9605\u6309\u94ae
 *   denied       \u7528\u6237\u62d2\u7edd                    \u2192 \u9ec4\u8272\u8b66\u793a + \u590d\u5236\u8bbe\u7f6e\u6307\u5f15\n *   unsupported  \u6d4f\u89c8\u5668\u4e0d\u652f\u6301                 \u2192 \u7070\u8272\u4fe1\u606f\u5361\u7247\u4e0d\u53ef\u64cd\u4f5c
 */
import { useState } from 'react'
import './PushSubscriptionPrompt.css'

export type PushPermissionState =
  | 'default'
  | 'granted'
  | 'denied'
  | 'unsupported'

export interface PushSubscriptionPromptProps {
  permission: PushPermissionState
  isSubscribed?: boolean
  subscriptionCount?: number
  subscribing?: boolean
  onSubscribe?: () => Promise<void> | void
  onUnsubscribe?: () => Promise<void> | void
  onDismiss?: () => void
  onClose?: () => void
  className?: string
}

const COPY_GUIDE_TEXT =
  '\u8bf7\u70b9\u51fb\u6d4f\u89c8\u5668\u5730\u5740\u680f\u5de6\u4fa7\u7684 \uD83D\uDD12 \u56fe\u6807 \u2192 \u9009\u62e9"\u7f51\u7ad9\u8bbe\u7f6e" \u2192 \u5c06"\u901a\u77e5"\u8bbe\u4e3a"\u5141\u8bb8"\uff0c\u7136\u540e\u5237\u65b0\u9875\u9762\u91cd\u8bd5\u3002'

export default function PushSubscriptionPrompt({
  permission,
  isSubscribed = false,
  subscriptionCount = 0,
  subscribing = false,
  onSubscribe,
  onUnsubscribe,
  onDismiss,
  onClose,
  className = ''
}: PushSubscriptionPromptProps) {
  const [closing, setClosing] = useState(false)
  const [copied, setCopied] = useState(false)

  // \u53d8\u4f53\u9009\u62e9
  let variant: 'default' | 'granted' | 'denied' | 'unsupported' = 'default'
  if (permission === 'granted' && isSubscribed) variant = 'granted'
  else if (permission === 'denied') variant = 'denied'
  else if (permission === 'unsupported') variant = 'unsupported'
  else variant = 'default'

  function handleClose() {
    setClosing(true)
    setTimeout(() => {
      if (onClose) onClose()
      else if (onDismiss) onDismiss()
    }, 250)
  }

  function handleDismiss() {
    setClosing(true)
    setTimeout(() => {
      if (onDismiss) onDismiss()
    }, 250)
  }

  async function handleSubscribe() {
    if (!onSubscribe) return
    try {
      await onSubscribe()
    } catch {
      // \u9519\u8bef\u7531\u4e0a\u5c42 toast \u63d0\u793a
    }
  }

  async function handleUnsubscribe() {
    if (!onUnsubscribe) return
    if (
      typeof window !== 'undefined' &&
      !window.confirm('\u786e\u8ba4\u53d6\u6d88\u6d4f\u89c8\u5668\u63a8\u9001\uff1f\u65b0\u8bc4\u8bba\u548c\u5173\u6ce8\u5c06\u4e0d\u518d\u5f39\u7a97\u901a\u77e5\u3002')
    ) {
      return
    }
    try {
      await onUnsubscribe()
    } catch {
      // ignore
    }
  }

  function handleCopyGuide() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(COPY_GUIDE_TEXT).then(
        () => {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        },
        () => {
          setCopied(false)
        }
      )
    }
  }

  // ── render ──
  const cls = [
    'push-prompt',
    `push-prompt--${variant}`,
    closing ? 'push-prompt--dismissing' : '',
    className
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={cls} role="region" aria-label="\u63a8\u9001\u8ba2\u9605\u63d0\u793a">
      <button
        type="button"
        className="push-prompt__close"
        aria-label="\u5173\u95ed\u63d0\u793a"
        onClick={handleClose}
      >
        ✕
      </button>

      <div className="push-prompt__row">
        <div className={`push-prompt__icon push-prompt__icon--${variant}`}>
          {variant === 'granted' && '✅'}
          {variant === 'denied' && '⚠️'}
          {variant === 'unsupported' && 'ℹ️'}
          {variant === 'default' && '🔔'}
        </div>
        <div className="push-prompt__body">
          {variant === 'default' && (
            <>
              <div className="push-prompt__title">\u5f00\u542f\u6d4f\u89c8\u5668\u63a8\u9001</div>
              <p className="push-prompt__desc">
                \u4e0d\u4f1a\u518d\u9519\u8fc7\u91cd\u8981\u52a8\u6001\uff1a\u65b0\u8bc4\u8bba\u3001\u5173\u6ce8\u3001\u6210\u5c31\u89e3\u9501\u7b2c\u4e00\u65f6\u95f4\u901a\u77e5\u4f60\uff0c\u53ef\u968f\u65f6\u5173\u95ed\u3002
              </p>
              <div className="push-prompt__actions">
                <button
                  type="button"
                  className="push-prompt__btn push-prompt__btn--primary"
                  onClick={handleSubscribe}
                  disabled={subscribing}
                >
                  {subscribing ? '\u8ba2\u9605\u4e2d...' : '\u5f00\u542f\u63a8\u9001'}
                </button>
                <button
                  type="button"
                  className="push-prompt__btn push-prompt__btn--secondary"
                  onClick={handleDismiss}
                  disabled={subscribing}
                >
                  \u7a0d\u540e\u518d\u8bf4
                </button>
              </div>
            </>
          )}

          {variant === 'granted' && (
            <>
              <div className="push-prompt__title">\u6d4f\u89c8\u5668\u63a8\u9001\u5df2\u5f00\u542f</div>
              <p className="push-prompt__desc">
                \u65b0\u8bc4\u8bba\u3001\u56de\u590d\u3001\u5173\u6ce8\u3001\u6210\u5c31\u5c06\u7acb\u5373\u63a8\u9001\u5230\u4f60\u7684\u8bbe\u5907\u3002
              </p>
              {subscriptionCount > 0 && (
                <p className="push-prompt__endpoint">
                  \u5f53\u524d\u8ba2\u9605\u7aef\u70b9\uff1a{subscriptionCount} \u4e2a
                </p>
              )}
              <div className="push-prompt__actions">
                <button
                  type="button"
                  className="push-prompt__btn push-prompt__btn--danger"
                  onClick={handleUnsubscribe}
                  disabled={subscribing}
                >
                  {subscribing ? '\u53d6\u6d88\u4e2d...' : '\u53d6\u6d88\u8ba2\u9605\u63a8\u9001'}
                </button>
              </div>
            </>
          )}

          {variant === 'denied' && (
            <>
              <div className="push-prompt__title">\u6d4f\u89c8\u5668\u63a8\u9001\u5df2\u5173\u95ed</div>
              <p className="push-prompt__desc">
                \u4f60\u5df2\u7981\u6b62\u6d4f\u89c8\u5668\u63a8\u9001\u901a\u77e5\u3002\u5982\u9700\u91cd\u65b0\u5f00\u542f\uff1a
                <br />
                \u70b9\u51fb\u5730\u5740\u680f\u5de6\u4fa7 \uD83D\uDD12 \u56fe\u6807 \u2192 \u7f51\u7ad9\u8bbe\u7f6e \u2192 \u901a\u77e5 \u2192 \u5141\u8bb8\u3002
              </p>
              <div className="push-prompt__actions">
                <button
                  type="button"
                  className="push-prompt__btn push-prompt__btn--secondary"
                  onClick={handleCopyGuide}
                >
                  {copied ? '\u5df2\u590d\u5236' : '\u590d\u5236\u8bbe\u7f6e\u6307\u5f15'}
                </button>
              </div>
            </>
          )}

          {variant === 'unsupported' && (
            <>
              <div className="push-prompt__title">\u5f53\u524d\u6d4f\u89c8\u5668\u4e0d\u652f\u6301\u63a8\u9001\u901a\u77e5</div>
              <p className="push-prompt__desc">
                \u8bf7\u4f7f\u7528\u6700\u65b0\u7248\u672c\u7684 Chrome / Edge / Firefox / Safari 16.4+
                \u83b7\u5f97\u63a8\u9001\u4f53\u9a8c\u3002\u4f60\u4ecd\u53ef\u63a5\u6536\u7ad9\u5185\u901a\u77e5\u3002
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
