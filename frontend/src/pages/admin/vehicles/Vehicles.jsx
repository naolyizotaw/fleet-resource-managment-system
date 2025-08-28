import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom';
import api from '../../../utils/api.js'
import Table from '../../../components/ui/Table.jsx'

export default function Vehicles() {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState({
    plateNumber: '',
    type: 'Automobile',
    model: '',
    manufacturer: '',
    year: '',
    fuelType: 'Petrol',
    currentKm: '',
    assignedDriver: '',
    status: 'active'
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('') // 'success' | 'error'
  const [users, setUsers] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  const fetchVehicles = async () => {
    try {
      const { data } = await api.get('/vehicles')
      setRows(data || [])
    } catch (e) {
      setMessage(e?.response?.data?.message || 'Failed to load vehicles')
    }
  }
  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/users')
      setUsers(Array.isArray(data) ? data : [])
    } catch (e) {
      // If manager hits this (admin-only route), ignore silently
    }
  }
  useEffect(() => { fetchVehicles(); fetchUsers() }, [])

  const createVehicle = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      // basic client validations to prevent common 400s
      if (!form.plateNumber || !form.model || !form.fuelType || form.currentKm === '') {
        throw new Error('plateNumber, model, fuelType and currentKm are required')
      }
      const isValidObjectId = (v) => /^[a-fA-F0-9]{24}$/.test(v || '')
      const payload = {
        plateNumber: form.plateNumber,
        type: form.type || undefined,
        model: form.model,
        manufacturer: form.manufacturer || undefined,
        year: form.year ? Number(form.year) : undefined,
        fuelType: form.fuelType,
        currentKm: Number(form.currentKm),
        assignedDriver: isValidObjectId(form.assignedDriver) ? form.assignedDriver : undefined,
        status: form.status,
      }
      await api.post('/vehicles', payload)
      setMessage('Vehicle created')
      setMessageType('success')
      setForm({
        plateNumber: '',
        type: 'Automobile',
        model: '',
        manufacturer: '',
        year: '',
        fuelType: 'Petrol',
        currentKm: '',
        assignedDriver: '',
        status: 'active'
      })
      fetchVehicles()
    } catch (e) {
      const msg = e?.response?.data?.message || 'Create failed'
      setMessage(msg)
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }
  const remove = async (id) => {
    setMessage('')
    try {
      await api.delete(`/vehicles/${id}`)
      setMessage('Vehicle deleted')
      setMessageType('success')
      fetchVehicles()
    } catch (e) {
      setMessage(e?.response?.data?.message || 'Delete failed')
      setMessageType('error')
    }
  }

  const [editingId, setEditingId] = useState('')
  const startEdit = (v) => {
    setEditingId(v._id)
    setForm({
      plateNumber: v.plateNumber || '',
      type: v.type || 'Automobile',
      model: v.model || '',
      manufacturer: v.manufacturer || '',
      year: v.year || '',
      fuelType: v.fuelType || 'Petrol',
      currentKm: v.currentKm ?? '',
      assignedDriver: (v.assignedDriver && v.assignedDriver._id) || '',
      status: v.status || 'active'
    })
    setShowEditModal(true)
  }
  const cancelEdit = () => { setEditingId(''); setShowEditModal(false); setForm({ ...form, plateNumber: '', model: '', manufacturer: '', year: '', currentKm: '', assignedDriver: '', type: 'Automobile', fuelType: 'Petrol', status: 'active' }) }
  const saveEdit = async () => {
    try {
      const payload = {
        plateNumber: form.plateNumber,
        type: form.type || undefined,
        model: form.model,
        manufacturer: form.manufacturer || undefined,
        year: form.year ? Number(form.year) : undefined,
        fuelType: form.fuelType,
        currentKm: Number(form.currentKm),
        assignedDriver: /^[a-fA-F0-9]{24}$/.test(form.assignedDriver || '') ? form.assignedDriver : undefined,
        status: form.status,
      }
      await api.put(`/vehicles/${editingId}`, payload)
      setMessage('Vehicle updated')
      setMessageType('success')
      setEditingId('')
      setShowEditModal(false)
      fetchVehicles()
    } catch (e) {
      setMessage(e?.response?.data?.message || 'Update failed')
      setMessageType('error')
    }
  }

  return (
    <div className="space-y-4 relative">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Manage Vehicles</h2>
        <div>
          {!editingId && (
            <button onClick={() => { setShowCreateModal(true); setMessage(''); setMessageType(''); }} className="bg-primary-600 text-white rounded px-4 py-2">Add New Vehicle</button>
          )}
        </div>
      </div>
      {message && (
        <div className={
          "text-sm mb-1 " + (messageType === 'success' ? 'text-green-700' : messageType === 'error' ? 'text-red-700' : 'text-gray-700')
        }>
          {message}
        </div>
      )}

      {showEditModal && editingId && (
        <div className="fixed inset-0 bg-black/50 grid place-items-center z-50">
          <div className="bg-white w-full max-w-4xl rounded shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit Vehicle</h3>
              <button onClick={cancelEdit} className="text-gray-500">✕</button>
            </div>
            <form onSubmit={(e) => e.preventDefault()} className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <input placeholder="Plate Number" value={form.plateNumber} onChange={(e) => setForm({ ...form, plateNumber: e.target.value })} className="border rounded px-3 py-2" required />
              <input placeholder="Model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className="border rounded px-3 py-2" required />
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="border rounded px-3 py-2">
                <option>Automobile</option>
                <option>Light Duty</option>
                <option>Heavy Duty</option>
                <option>Machinery</option>
                <option>Other</option>
              </select>
              <input placeholder="Manufacturer" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} className="border rounded px-3 py-2" />
              <input placeholder="Year" type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} className="border rounded px-3 py-2" />
              <select value={form.fuelType} onChange={(e) => setForm({ ...form, fuelType: e.target.value })} className="border rounded px-3 py-2" required>
                <option>Petrol</option>
                <option>Diesel</option>
                <option>Electric</option>
                <option>Hybrid</option>
              </select>
              <input placeholder="Current Km" type="number" value={form.currentKm} onChange={(e) => setForm({ ...form, currentKm: e.target.value })} className="border rounded px-3 py-2" required />
              <select value={form.assignedDriver} onChange={(e) => setForm({ ...form, assignedDriver: e.target.value })} className="border rounded px-3 py-2">
                <option value="">Assign Driver (optional)</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>{u.username} ({u.role})</option>
                ))}
              </select>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="border rounded px-3 py-2">
                <option value="active">active</option>
                <option value="under_maintenance">under_maintenance</option>
                <option value="inactive">inactive</option>
              </select>
              <div className="md:col-span-6 flex gap-2 justify-end mt-2">
                <button type="button" onClick={cancelEdit} className="border rounded px-4 py-2">Cancel</button>
                <button type="button" onClick={saveEdit} className="bg-primary-600 text-white rounded px-4 py-2">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreateModal && !editingId && (
        <div className="fixed inset-0 bg-black/50 grid place-items-center z-50">
          <div className="bg-white w-full max-w-4xl rounded shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add New Vehicle</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-500">✕</button>
            </div>
            {message && (
              <div className={
                "text-sm mb-3 " + (messageType === 'success' ? 'text-green-700' : messageType === 'error' ? 'text-red-700' : 'text-gray-700')
              }>
                {message}
              </div>
            )}
            <form onSubmit={(e) => { e.preventDefault(); createVehicle(e); }} className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <input placeholder="Plate Number" value={form.plateNumber} onChange={(e) => setForm({ ...form, plateNumber: e.target.value })} className="border rounded px-3 py-2" required />
              <input placeholder="Model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className="border rounded px-3 py-2" required />
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="border rounded px-3 py-2">
                <option>Automobile</option>
                <option>Light Duty</option>
                <option>Heavy Duty</option>
                <option>Machinery</option>
                <option>Other</option>
              </select>
              <input placeholder="Manufacturer" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} className="border rounded px-3 py-2" />
              <input placeholder="Year" type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} className="border rounded px-3 py-2" />
              <select value={form.fuelType} onChange={(e) => setForm({ ...form, fuelType: e.target.value })} className="border rounded px-3 py-2" required>
                <option>Petrol</option>
                <option>Diesel</option>
                <option>Electric</option>
                <option>Hybrid</option>
              </select>
              <input placeholder="Current Km" type="number" value={form.currentKm} onChange={(e) => setForm({ ...form, currentKm: e.target.value })} className="border rounded px-3 py-2" required />
              <select value={form.assignedDriver} onChange={(e) => setForm({ ...form, assignedDriver: e.target.value })} className="border rounded px-3 py-2">
                <option value="">Assign Driver (optional)</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>{u.username} ({u.role})</option>
                ))}
              </select>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="border rounded px-3 py-2">
                <option value="active">active</option>
                <option value="under_maintenance">under_maintenance</option>
                <option value="inactive">inactive</option>
              </select>
              <div className="md:col-span-6 flex gap-2 justify-end mt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="border rounded px-4 py-2">Cancel</button>
                <button disabled={loading} onClick={createVehicle} className="bg-primary-600 text-white rounded px-4 py-2">{loading ? 'Creating…' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Table
        columns={[
          { key: 'plateNumber', header: 'Plate' },
          { key: 'model', header: 'Model' },
          { key: 'fuelType', header: 'Fuel' },
          { key: 'currentKm', header: 'Km' },
          { key: 'status', header: 'Status' },
          { key: 'assignedDriver', header: 'Assigned Driver', render: (v) => (v && (v.username || v.name)) || '—' },
          { key: 'actions', header: 'Actions', render: (_, r) => (
            <div className="flex gap-2">
              <button onClick={() => startEdit(r)} className="px-2 py-1 text-xs border rounded">Edit</button>
              <button onClick={() => remove(r._id)} className="px-2 py-1 text-xs bg-red-600 text-white rounded">Delete</button>
            </div>
          ) }
        ]}
        data={rows}
      />
    </div>
  )
}


