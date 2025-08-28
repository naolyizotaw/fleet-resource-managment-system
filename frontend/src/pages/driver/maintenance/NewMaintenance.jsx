import { useEffect, useState } from 'react'
import api from '../../../utils/api.js'

export default function NewMaintenance() {
  const [form, setForm] = useState({ vehicleId: '', category: 'Engine', description: '', cost: '', remarks: '' })
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [vehicles, setVehicles] = useState([])

  useEffect(() => {
    api.get('/vehicles')
      .then(({ data }) => setVehicles(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })
  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMsg('')
    try {
      const payload = { 
        vehicleId: form.vehicleId, 
        category: form.category, 
        description: form.description, 
        cost: form.cost ? Number(form.cost) : undefined,
        remarks: form.remarks
      }
      await api.post('/maintenance', payload)
      setMsg('Request submitted')
      setForm({ vehicleId: '', category: 'Engine', description: '', cost: '', remarks: '' })
    } catch (e) {
      setMsg(e?.response?.data?.message || 'Failed to submit')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Submit Maintenance Request</h2>
      {msg && <div className="mb-2 text-sm text-gray-600">{msg}</div>}
      <form onSubmit={submit} className="max-w-xl bg-white border rounded p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Vehicle</label>
            <select name="vehicleId" value={form.vehicleId} onChange={handleChange} className="w-full border rounded px-3 py-2" required>
              <option value="">Select vehicle</option>
              {vehicles.map(v => <option key={v._id} value={v._id}>{v.plateNumber} - {v.model}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Category</label>
            <select name="category" value={form.category} onChange={handleChange} className="w-full border rounded px-3 py-2">
              <option>Engine</option>
              <option>Tires & Wheels</option>
              <option>Brakes</option>
              <option>Electrical</option>
              <option>Cargo</option>
              <option>Machinery</option>
              <option>Other</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">Description</label>
          <textarea name="description" value={form.description} onChange={handleChange} className="w-full border rounded px-3 py-2" required />
        </div>
        <div>
          <label className="block text-sm mb-1">Estimated Cost</label>
          <input name="cost" type="number" value={form.cost} onChange={handleChange} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm mb-1">Remarks</label>
          <textarea name="remarks" value={form.remarks} onChange={handleChange} className="w-full border rounded px-3 py-2" />
        </div>
        <button disabled={loading} className="bg-primary-600 text-white rounded px-4 py-2">{loading ? 'Submitting…' : 'Submit'}</button>
      </form>
    </div>
  )
}


