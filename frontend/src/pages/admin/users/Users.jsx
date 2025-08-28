import { useEffect, useState } from 'react'
import api from '../../../utils/api.js'
import Table from '../../../components/ui/Table.jsx'

export default function Users() {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'driver' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/users')
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      setMessage(e?.response?.data?.message || 'Failed to load users')
    }
  }
  useEffect(() => { fetchUsers() }, [])

  const createUser = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const payload = {
        username: form.username,
        password: form.password,
        role: form.role === 'driver' ? 'user' : form.role,
      }
      await api.post('/auth/register', payload)
      setMessage('User created')
      setForm({ name: '', username: '', password: '', role: 'driver' })
      fetchUsers()
    } catch (e) {
      const msg = e?.response?.data?.message || 'Create failed'
      setMessage(msg)
    } finally {
      setLoading(false)
    }
  }
  const remove = async (id) => {
    setMessage('')
    try {
      await api.delete(`/users/${id}`)
      fetchUsers()
    } catch (e) {
      setMessage(e?.response?.data?.message || 'Delete failed')
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Manage Users</h2>
      {message && <div className="text-sm text-gray-700">{message}</div>}
      <form onSubmit={createUser} className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-white border rounded p-4">
        <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border rounded px-3 py-2" required />
        <input placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="border rounded px-3 py-2" required />
        <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="border rounded px-3 py-2" required />
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="border rounded px-3 py-2">
          <option value="driver">Driver</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
        <button disabled={loading} className="bg-primary-600 text-white rounded px-4 py-2">{loading ? 'Creating…' : 'Create'}</button>
      </form>

      <Table
        columns={[
          { key: 'username', header: 'Username' },
          { key: '_id', header: 'ID' },
          { key: 'role', header: 'Role' },
          { key: 'actions', header: 'Actions', render: (_, r) => (
            <button onClick={() => remove(r._id)} className="px-2 py-1 text-xs bg-red-600 text-white rounded">Delete</button>
          ) }
        ]}
        data={rows}
      />
    </div>
  )
}


