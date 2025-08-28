import { Link } from 'react-router-dom'
import useFetch from '../../../hooks/useFetch.js'
import api from '../../../utils/api.js'
import Table from '../../../components/ui/Table.jsx'

export default function Approvals({ type }) {
  const endpoint = type === 'maintenance' ? '/maintenance' : type === 'fuel' ? '/fuel' : '/per-diem'
  const { data, loading, setData } = useFetch(endpoint)

  const updateStatus = async (id, status) => {
    await api.patch(`${endpoint}/${id}`, { status })
    setData((prev) => prev.map((r) => (r._id === id ? { ...r, status } : r)))
  }

  const cols = [
    { key: 'driver', header: 'Driver', render: (_, r) => r.driver?.name || r.user?.name || '—' },
    { key: 'status', header: 'Status' },
    { key: 'createdAt', header: 'Created', render: (v) => (v ? new Date(v).toLocaleDateString() : '') },
    { key: 'actions', header: 'Actions', render: (_, r) => (
      <div className="flex gap-2">
        <button onClick={() => updateStatus(r._id, 'approved')} className="px-2 py-1 text-xs bg-green-600 text-white rounded">Approve</button>
        <button onClick={() => updateStatus(r._id, 'rejected')} className="px-2 py-1 text-xs bg-red-600 text-white rounded">Reject</button>
      </div>
    ) },
  ]

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold capitalize">{type} approvals</h2>
        {type === 'maintenance' && (
          <Link to="/manager/maintenance/new" className="bg-primary-600 text-white rounded px-4 py-2">
            New Maintenance Request
          </Link>
        )}
      </div>
      {loading ? 'Loading…' : <Table columns={cols} data={data || []} />}
    </div>
  )
}


