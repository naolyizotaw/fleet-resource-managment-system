import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStoredAuth, setStoredAuth, clearStoredAuth } from '../utils/token.js'
import { jwtDecode } from 'jwt-decode'
import api from '../utils/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = getStoredAuth()
    if (stored?.token) {
      setToken(stored.token)
      setUser(stored.user)
      api.defaults.headers.common.Authorization = `Bearer ${stored.token}`
    }
    setLoading(false)
  }, [])

  const login = async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password })
    const decoded = data?.token ? jwtDecode(data.token) : null
    const userInfo = decoded ? { id: decoded.id, role: decoded.role, username: decoded.username } : null
    const auth = { token: data?.token, user: userInfo }
    setStoredAuth(auth)
    setToken(auth.token)
    setUser(auth.user)
    api.defaults.headers.common.Authorization = `Bearer ${auth.token}`
    const role = auth.user?.role
    if (role === 'driver' || role === 'user') navigate('/driver')
    else if (role === 'manager') navigate('/manager')
    else if (role === 'admin') navigate('/admin')
    else navigate('/')
  }

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload)
    return data
  }

  const logout = () => {
    clearStoredAuth()
    setUser(null)
    setToken(null)
    delete api.defaults.headers.common.Authorization
    navigate('/login')
  }

  const value = useMemo(() => ({ user, token, login, register, logout, loading }), [user, token, loading])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}


