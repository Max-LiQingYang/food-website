import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login as loginApi, register as registerApi } from '../api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import './LoginPage.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const toast = useToast()

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      toast.warning('请输入用户名和密码')
      return
    }

    setLoading(true)
    try {
      const res: any = await loginApi({ email: username.trim(), password })
      // 兼容两种响应格式：{data: {token, user}} 或 {token, user}
      const token = res.data?.token || res.token
      const user = res.data?.user || res.user || res
      login(token, { id: user?.id, username: user?.username, nickname: user?.nickname })
      toast.success('登录成功')
      navigate('/')
    } catch (err: any) {
      toast.error(err?.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      toast.warning('用户名和密码不能为空')
      return
    }
    if (password.length < 6) {
      toast.warning('密码至少 6 位')
      return
    }

    setLoading(true)
    try {
      await registerApi({
        username: username.trim(),
        password,
        email: email.trim() || undefined,
        nickname: nickname.trim() || undefined,
      })
      toast.success('注册成功，请登录')
      setMode('login')
      setEmail('')
      setNickname('')
    } catch (err: any) {
      toast.error(err?.message || '注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        {/* 标签页切换 */}
        <div className="login-tabs">
          <button
            className={`login-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => {
              setMode('login')
              setEmail('')
              setNickname('')
            }}
          >
            登录
          </button>
          <button
            className={`login-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => {
              setMode('register')
              setPassword('')
            }}
          >
            注册
          </button>
        </div>

        <h2 className="login-card__title">{mode === 'login' ? '欢迎回来' : '加入美食社区'}</h2>
        <p className="login-card__subtitle">
          {mode === 'login' ? '开始美食之旅' : '注册后即可收藏和分享食谱'}
        </p>

        <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="login-form">
          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="nickname">昵称（可选）</label>
              <input
                id="nickname"
                type="text"
                placeholder="给自己取个美食昵称"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username">{mode === 'login' ? '用户名 / 邮箱' : '用户名'}</label>
            <input
              id="username"
              type="text"
              placeholder={mode === 'login' ? '请输入用户名或邮箱' : '请输入用户名'}
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete={mode === 'login' ? 'username' : 'new-username'}
            />
          </div>

          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="email">邮箱（可选，用于登录）</label>
              <input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password">密码</label>
            <input
              id="password"
              type="password"
              placeholder={mode === 'register' ? '至少 6 位' : '请输入密码'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
          </button>
        </form>

        <p className="login-card__footer">
          {mode === 'login' ? (
            <>
              还没有账号？{' '}
              <button
                className="login-link-btn"
                onClick={() => {
                  setMode('register')
                  setPassword('')
                }}
              >
                立即注册
              </button>
            </>
          ) : (
            <>
              已有账号？{' '}
              <button
                className="login-link-btn"
                onClick={() => {
                  setMode('login')
                  setEmail('')
                  setNickname('')
                }}
              >
                去登录
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
