import useFetch from '../../../hooks/useFetch.js'
import Table from '../../../components/ui/Table.jsx'

export default function LogsView() {
  const { data } = useFetch('/logs')
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Driver Logs</h2>
      <Table
        columns={[
          { key: 'driver', header: 'Driver', render: (_, r) => r.driver?.name || '—' },
          { key: 'vehicleId', header: 'Vehicle' },
          { key: 'date', header: 'Date' },
          { key: 'odometer', header: 'Odometer' },
          { key: 'notes', header: 'Notes' },
        ]}
        data={data || []}
      />
    </div>
  )
}






