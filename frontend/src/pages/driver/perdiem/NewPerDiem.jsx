import { useEffect, useState } from 'react'
import api from '../../../utils/api.js'

export default function NewPerDiem() {
  const [form, setForm] = useState({ vehicleId: '', purpose: '', destination: '', startDate: '', endDate: '', numberOfDays: '', note: '' })
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
        vehicleId: form.vehicleId || undefined,
        purpose: form.purpose,
        destination: form.destination,
        startDate: form.startDate,
        endDate: form.endDate,
        numberOfDays: Number(form.numberOfDays),
      }
      await api.post('/per-diem', payload)
      setMsg('Per diem request submitted')
      setForm({ vehicleId: '', purpose: '', destination: '', startDate: '', endDate: '', numberOfDays: '', note: '' })
    } catch (e) {
      setMsg(e?.response?.data?.message || 'Failed to submit')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Submit Per Diem Request</h2>
      {msg && <div className="mb-2 text-sm text-gray-600">{msg}</div>}
      <form onSubmit={submit} className="max-w-xl bg-white border rounded p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Vehicle (optional)</label>
            <select name="vehicleId" value={form.vehicleId} onChange={handleChange} className="w-full border rounded px-3 py-2">
              <option value="">No vehicle</option>
              {vehicles.map(v => <option key={v._id} value={v._id}>{v.plateNumber} - {v.model}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Purpose</label>
            <input name="purpose" value={form.purpose} onChange={handleChange} className="w-full border rounded px-3 py-2" required />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Destination</label>
            <input name="destination" value={form.destination} onChange={handleChange} className="w-full border rounded px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm mb-1">Days</label>
            <input name="numberOfDays" type="number" value={form.numberOfDays} onChange={handleChange} className="w-full border rounded px-3 py-2" required />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Start Date</label>
            <input name="startDate" type="date" value={form.startDate} onChange={handleChange} className="w-full border rounded px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm mb-1">End Date</label>
            <input name="endDate" type="date" value={form.endDate} onChange={handleChange} className="w-full border rounded px-3 py-2" required />
          </div>
        </div>
        <button disabled={loading} className="bg-primary-600 text-white rounded px-4 py-2">{loading ? 'Submitting…' : 'Submit'}</button>
      </form>
    </div>
  )
}


