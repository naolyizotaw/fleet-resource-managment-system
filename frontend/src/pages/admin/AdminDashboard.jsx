import useFetch from '../../hooks/useFetch.js'
import { StatCard } from '../../components/ui/Cards.jsx'
import { ResponsiveContainer, LineChart, XAxis, YAxis, Tooltip, Line } from 'recharts'

export default function AdminDashboard() {
  const { data: summary } = useFetch('/reports/summary')
  const { data: expensesTrend } = useFetch('/reports/expenses-trend')
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Admin Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Pending Requests" value={summary?.pending || 0} />
        <StatCard title="Approved Requests" value={summary?.approved || 0} />
        <StatCard title="Total Expenses" value={`$${summary?.totalExpenses || 0}`} />
        <StatCard title="Active Vehicles" value={summary?.activeVehicles || 0} />
      </div>
      <div className="bg-white border rounded p-4">
        <h3 className="font-medium mb-2">Expenses Trend</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={expensesTrend || []}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="amount" stroke="#1d4ed8" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}






