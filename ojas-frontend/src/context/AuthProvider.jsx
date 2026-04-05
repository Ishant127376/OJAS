import { useEffect, useMemo, useState } from 'react'
import { AuthContext } from './AuthContext'
import { getMe, loginUser, registerUser } from '../services/auth.service'

const STORAGE_TOKEN_KEY = 'ojas_token'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_TOKEN_KEY))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setUser(null)
        setLoading(false)
        return
      }

      try {
        const me = await getMe(token)
        setUser(me)
      } catch (error) {
        console.error('Failed to load current user:', error)
        localStorage.removeItem(STORAGE_TOKEN_KEY)
        setToken(null)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [token])

  const login = async (payload) => {
    const response = await loginUser(payload)
    localStorage.setItem(STORAGE_TOKEN_KEY, response.token)
    setToken(response.token)
    setUser(response.user)
    return response
  }

  const register = async (payload) => {
    const response = await registerUser(payload)
    localStorage.setItem(STORAGE_TOKEN_KEY, response.token)
    setToken(response.token)
    setUser(response.user)
    return response
  }

  const loginWithToken = async (incomingToken) => {
    console.log('[AuthProvider] loginWithToken called with:', incomingToken ? 'TOKEN_PROVIDED' : 'NO_TOKEN')
    const me = await getMe(incomingToken)
    console.log('[AuthProvider] getMe response:', me)
    localStorage.setItem(STORAGE_TOKEN_KEY, incomingToken)
    console.log('[AuthProvider] Token saved to localStorage')
    setToken(incomingToken)
    setUser(me)
    return me
  }

  const logout = () => {
    localStorage.removeItem(STORAGE_TOKEN_KEY)
    setToken(null)
    setUser(null)
  }

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isAuthenticated: Boolean(token && user),
      login,
      register,
      loginWithToken,
      logout,
    }),
    [token, user, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
