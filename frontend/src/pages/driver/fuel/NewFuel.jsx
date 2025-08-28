import { useEffect, useState } from 'react'
import api from '../../../utils/api.js'

export default function NewFuel() {
  const [form, setForm] = useState({ vehicleId: '', fuelType: 'petrol', quantity: '', currentKm: '', purpose: '' })
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
        fuelType: form.fuelType,
        quantity: Number(form.quantity),
        currentKm: Number(form.currentKm),
        purpose: form.purpose || undefined
      }
      await api.post('/fuel', payload)
      setMsg('Fuel request submitted')
      setForm({ vehicleId: '', fuelType: 'petrol', quantity: '', currentKm: '', purpose: '' })
    } catch (e) {
      setMsg(e?.response?.data?.message || 'Failed to submit')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Submit Fuel Request</h2>
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
            <label className="block text-sm mb-1">Fuel Type</label>
            <select name="fuelType" value={form.fuelType} onChange={handleChange} className="w-full border rounded px-3 py-2" required>
              <option value="petrol">petrol</option>
              <option value="diesel">diesel</option>
              <option value="electric">electric</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm mb-1">Quantity</label>
            <input name="quantity" type="number" value={form.quantity} onChange={handleChange} className="w-full border rounded px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm mb-1">Current Km</label>
            <input name="currentKm" type="number" value={form.currentKm} onChange={handleChange} className="w-full border rounded px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm mb-1">Purpose (optional)</label>
            <input name="purpose" value={form.purpose} onChange={handleChange} className="w-full border rounded px-3 py-2" />
          </div>
        </div>
        <button disabled={loading} className="bg-primary-600 text-white rounded px-4 py-2">{loading ? 'Submitting…' : 'Submit'}</button>
      </form>
    </div>
  )
}


