import useFetch from '../../hooks/useFetch.js'
import { StatCard } from '../../components/ui/Cards.jsx'

export default function DriverDashboard() {
  const { data } = useFetch('/logs/my/summary', {}, [])
  const summary = data || { pending: 0, approved: 0, expenses: 0, activeVehicles: 0 }
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Driver Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Pending Requests" value={summary.pending} />
        <StatCard title="Approved Requests" value={summary.approved} />
        <StatCard title="My Expenses" value={`$${summary.expenses}`} />
        <StatCard title="Active Vehicles" value={summary.activeVehicles} />
      </div>
    </div>
  )
}






