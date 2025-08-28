import axios from 'axios'
import { getStoredAuth, clearStoredAuth } from './token.js'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:7001/api',
  withCredentials: false
})

api.interceptors.request.use((config) => {
  const stored = getStoredAuth()
  if (stored?.token) {
    config.headers.Authorization = `Bearer ${stored.token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status
    if (status === 401) {
      clearStoredAuth()
      // window.location.href = '/login' // optional redirect
    }
    return Promise.reject(err)
  }
)

export default api


