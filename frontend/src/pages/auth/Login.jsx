import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

export default function Login() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
    } catch (e) {
      setError(e?.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white p-6 rounded border">
        <h1 className="text-xl font-semibold mb-4">Sign in</h1>
        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
        <label className="block text-sm mb-1">Username</label>
        <input className="w-full border rounded px-3 py-2 mb-3" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <label className="block text-sm mb-1">Password</label>
        <input className="w-full border rounded px-3 py-2 mb-4" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button disabled={loading} className="w-full bg-primary-600 hover:bg-primary-700 text-white rounded py-2">
          {loading ? 'Signing in…' : 'Login'}
        </button>
        <div className="text-sm text-gray-600 mt-3">
          No account? <Link className="text-primary-700" to="/register">Register</Link>
        </div>
      </form>
    </div>
  )
}


