import { Link } from 'react-router-dom';
import useFetch from '../../../hooks/useFetch.js'
import Table from '../../../components/ui/Table.jsx'

export default function MyRequests() {
  const maint = useFetch('/maintenance/my')
  const fuel = useFetch('/fuel/my')
  const perdiem = useFetch('/per-diem/my')
  const logs = useFetch('/logs/my')

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">My Requests</h2>
        <Link to="/driver/maintenance/new" className="bg-primary-600 text-white rounded px-4 py-2">
          New Maintenance Request
        </Link>
      </div>

      <section className="space-y-2">
        <h3 className="font-medium">Maintenance</h3>
        <Table 
          columns={[
            { key: 'vehicleId.plateNumber', header: 'Vehicle' },
            { key: 'category', header: 'Category' },
            { key: 'description', header: 'Description' },
            { key: 'status', header: 'Status' },
            { key: 'cost', header: 'Cost' },
            { key: 'requestedDate', header: 'Requested Date', render: (item) => new Date(item.requestedDate).toLocaleDateString() },
          ]} 
          data={maint.data || []} 
        />
      </section>

      <section className="space-y-2">
        <h3 className="font-medium">Fuel</h3>
        <Table 
          columns={[
            { key: 'vehicleId.plateNumber', header: 'Vehicle' },
            { key: 'fuelType', header: 'Fuel Type' },
            { key: 'quantity', header: 'Quantity' },
            { key: 'purpose', header: 'Purpose' },
            { key: 'status', header: 'Status' },
            { key: 'cost', header: 'Cost' },
          ]} 
          data={fuel.data || []} 
        />
      </section>

      <section className="space-y-2">
        <h3 className="font-medium">Per Diem</h3>
        <Table 
          columns={[
            { key: 'destination', header: 'Destination' },
            { key: 'purpose', header: 'Purpose' },
            { key: 'numberOfDays', header: 'Days' },
            { key: 'status', header: 'Status' },
            { key: 'startDate', header: 'Start Date', render: (item) => new Date(item.startDate).toLocaleDateString() },
            { key: 'endDate', header: 'End Date', render: (item) => new Date(item.endDate).toLocaleDateString() },
          ]} 
          data={perdiem.data || []} 
        />
      </section>

      <section className="space-y-2">
        <h3 className="font-medium">Logs</h3>
        <Table columns={[{ key: 'vehicleId', header: 'Vehicle' }, { key: 'startKm', header: 'Start Km' }, { key: 'endKm', header: 'End Km' }]} data={logs.data || []} />
      </section>
    </div>
  )
}


