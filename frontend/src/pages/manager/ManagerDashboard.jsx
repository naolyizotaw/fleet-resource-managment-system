import useFetch from '../../hooks/useFetch.js'
import { StatCard } from '../../components/ui/Cards.jsx'
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar } from 'recharts'

export default function ManagerDashboard() {
  const { data: summary } = useFetch('/reports/summary')
  const { data: fuelByVehicle } = useFetch('/reports/fuel-by-vehicle')
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Manager Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Pending Requests" value={summary?.pending || 0} />
        <StatCard title="Approved Requests" value={summary?.approved || 0} />
        <StatCard title="Expenses (Month)" value={`$${summary?.expenses || 0}`} />
        <StatCard title="Active Vehicles" value={summary?.activeVehicles || 0} />
      </div>
      <div className="bg-white border rounded p-4">
        <h3 className="font-medium mb-2">Fuel Consumption by Vehicle</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fuelByVehicle || []}>
              <XAxis dataKey="vehicle" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="liters" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}






