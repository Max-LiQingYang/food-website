'use strict'

/**
 * ErrorBoundary.tsx
 *
 * 全局错误边界 —— 捕获子组件渲染错误，优雅降级显示错误页面
 * 支持重试、返回首页、错误日志上报、焦点管理
 */

import React, { Component, type ReactNode, type ErrorInfo } from 'react'
import { Link } from 'react-router-dom'
import './ErrorBoundary.css'

interface ErrorBoundaryProps {
  children: ReactNode
  fallbackTitle?: string
  reportToServer?: boolean
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  errorRef: React.RefObject<HTMLDivElement | null>

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
    this.errorRef = React.createRef<HTMLDivElement>()
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error.message)
    console.error('[ErrorBoundary] Component stack:', info.componentStack)

    if (this.props.reportToServer) {
      this.reportError(error, info)
    }

    // 焦点移动到错误区域 for 屏幕阅读器
    setTimeout(() => {
      this.errorRef.current?.focus()
    }, 0)
  }

  private reportError(error: Error, info: ErrorInfo) {
    try {
      const body = JSON.stringify({
        message: error.message,
        stack: error.stack,
        componentStack: info.componentStack,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      })
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/report-error', body)
      } else {
        fetch('/api/report-error', { method: 'POST', body, keepalive: true }).catch(() => {})
      }
    } catch {
      // ignore
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary" ref={this.errorRef} tabIndex={-1} role="alert">
          <div className="error-boundary__card">
            <div className="error-boundary__icon">⚠️</div>
            <h1 className="error-boundary__title">
              {this.props.fallbackTitle || '页面出错了'}
            </h1>
            <p className="error-boundary__desc">
              看起来有一个错误阻止了页面正常显示。别担心，这不是你的问题。
            </p>
            {this.state.error && (
              <details className="error-boundary__details">
                <summary>错误详情</summary>
                <pre>{this.state.error.message}</pre>
                {this.state.error.stack && (
                  <pre className="error-boundary__stack">{this.state.error.stack}</pre>
                )}
              </details>
            )}
            <div className="error-boundary__actions">
              <button className="error-boundary__btn error-boundary__btn--retry" onClick={this.handleRetry}>
                🔄 重试
              </button>
              <Link to="/" className="error-boundary__btn error-boundary__btn--home">
                🏠 返回首页
              </Link>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}