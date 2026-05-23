import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { getMe } from '../api'

interface User {
  id: string
  username: string
  nickname?: string
}

interface AuthContextValue {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (token: string, user: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, _setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    if (!token) {
      setInitializing(false)
      return
    }
    getMe()
      .then((data: any) => {
        setUser({ id: data.data.id, username: data.data.username, nickname: data.data.nickname })
      })
      .catch(() => {
        localStorage.removeItem('token')
        setUser(null)
      })
      .finally(() => setInitializing(false))
  }, [token])

  const login = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken)
    _setToken(newToken)
    setUser(newUser)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    _setToken(null)
    setUser(null)
  }, [])

  const value: AuthContextValue = {
    user,
    token,
    isAuthenticated: !!user,
    login,
    logout,
  }

  if (initializing) {
    return <div className="auth-loading" />
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
