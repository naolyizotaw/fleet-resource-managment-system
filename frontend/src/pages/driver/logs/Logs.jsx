import { useEffect, useState } from 'react'
import api from '../../../utils/api.js'
import Table from '../../../components/ui/Table.jsx'

export default function Logs() {
  const [form, setForm] = useState({ date: '', odometer: '', notes: '' })
  const [rows, setRows] = useState([])

  const fetchLogs = async () => {
    const { data } = await api.get('/logs/my')
    setRows(data || [])
  }

  useEffect(() => { fetchLogs() }, [])

  const submit = async (e) => {
    e.preventDefault()
    await api.post('/logs', form)
    setForm({ date: '', odometer: '', notes: '' })
    fetchLogs()
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Daily Logs</h2>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white border rounded p-4">
        <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="border rounded px-3 py-2" required />
        <input type="number" placeholder="Odometer" value={form.odometer} onChange={(e) => setForm({ ...form, odometer: e.target.value })} className="border rounded px-3 py-2" required />
        <input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="border rounded px-3 py-2" />
        <button className="bg-primary-600 text-white rounded px-4 py-2">Add Log</button>
      </form>
      <Table
        columns={[
          { key: 'date', header: 'Date' },
          { key: 'odometer', header: 'Odometer' },
          { key: 'notes', header: 'Notes' },
        ]}
        data={rows}
      />
    </div>
  )
}






