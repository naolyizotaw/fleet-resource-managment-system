import useFetch from '../../../hooks/useFetch.js'
import Table from '../../../components/ui/Table.jsx'

export default function Vehicles() {
  const { data } = useFetch('/vehicles')
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Vehicles</h2>
      <Table
        columns={[
          { key: 'plateNumber', header: 'Plate' },
          { key: 'model', header: 'Model' },
          { key: 'status', header: 'Status' },
          { key: 'assignedTo', header: 'Driver', render: (_, r) => r.assignedTo?.name || '—' },
        ]}
        data={data || []}
      />
    </div>
  )
}






