import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'driver' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(form)
      navigate('/login')
    } catch (e) {
      setError(e?.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white p-6 rounded border">
        <h1 className="text-xl font-semibold mb-4">Create account</h1>
        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
        <label className="block text-sm mb-1">Name</label>
        <input name="name" className="w-full border rounded px-3 py-2 mb-3" value={form.name} onChange={handleChange} required />
        <label className="block text-sm mb-1">Username</label>
        <input name="username" className="w-full border rounded px-3 py-2 mb-3" value={form.username} onChange={handleChange} required />
        <label className="block text-sm mb-1">Password</label>
        <input name="password" type="password" className="w-full border rounded px-3 py-2 mb-3" value={form.password} onChange={handleChange} required />
        <label className="block text-sm mb-1">Role</label>
        <select name="role" className="w-full border rounded px-3 py-2 mb-4" value={form.role} onChange={handleChange}>
          <option value="driver">Driver</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
        <button disabled={loading} className="w-full bg-primary-600 hover:bg-primary-700 text-white rounded py-2">
          {loading ? 'Creating…' : 'Register'}
        </button>
        <div className="text-sm text-gray-600 mt-3">
          Have an account? <Link className="text-primary-700" to="/login">Login</Link>
        </div>
      </form>
    </div>
  )
}


