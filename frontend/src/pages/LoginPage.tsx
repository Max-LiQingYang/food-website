import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login as loginApi } from '../api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import './LoginPage.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const toast = useToast()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      toast.warning('请输入用户名和密码')
      return
    }

    setLoading(true)
    try {
      const res: any = await loginApi({ username: username.trim(), password })
      login(res.token, { id: res.user?.id || res.id, username: res.user?.username || res.username })
      toast.success('登录成功')
      navigate('/')
    } catch (err: any) {
      toast.error(err?.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h2 className="login-card__title">登录</h2>
        <p className="login-card__subtitle">欢迎回来，开始美食之旅</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">用户名</label>
            <input
              id="username"
              type="text"
              placeholder="请输入用户名"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">密码</label>
            <input
              id="password"
              type="password"
              placeholder="请输入密码"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="login-submit"
            disabled={loading}
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <p className="login-card__footer">
          还没有账号？
          {/* @ts-expect-error TS2786 — TS 5.9 + @types/react 18 vs parent @types/react 19 mismatch */}
          <Link to="/register">立即注册</Link>
        </p>
      </div>
    </div>
  )
}