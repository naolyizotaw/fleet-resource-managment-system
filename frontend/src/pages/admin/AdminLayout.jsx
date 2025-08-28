import { Outlet, Routes, Route } from 'react-router-dom'
import Sidebar from '../../components/layout/Sidebar.jsx'
import Navbar from '../../components/layout/Navbar.jsx'
import AdminDashboard from './AdminDashboard.jsx'
import Approvals from '../manager/approvals/Approvals.jsx'
import LogsView from '../manager/logs/LogsView.jsx'
import Reports from '../manager/reports/Reports.jsx'
import Users from './users/Users.jsx'
import Vehicles from './vehicles/Vehicles.jsx'
import NewMaintenance from '../driver/maintenance/NewMaintenance.jsx'

export default function AdminLayout() {
  return (
    <div className="h-screen grid grid-rows-[auto,1fr]">
      <Navbar />
      <div className="grid grid-cols-[16rem,1fr]">
        <Sidebar />
        <main className="p-4 overflow-y-auto">
          <Routes>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<Users />} />
            <Route path="vehicles" element={<Vehicles />} />
            <Route path="maintenance/new" element={<NewMaintenance />} />
            <Route path="maintenance/approvals" element={<Approvals type="maintenance" />} />
            <Route path="fuel/approvals" element={<Approvals type="fuel" />} />
            <Route path="perdiem/approvals" element={<Approvals type="perdiem" />} />
            <Route path="logs" element={<LogsView />} />
            <Route path="reports" element={<Reports />} />
          </Routes>
          <Outlet />
        </main>
      </div>
    </div>
  )
}






