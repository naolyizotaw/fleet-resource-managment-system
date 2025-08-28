import { Outlet, Routes, Route } from 'react-router-dom'
import Sidebar from '../../components/layout/Sidebar.jsx'
import Navbar from '../../components/layout/Navbar.jsx'
import ManagerDashboard from './ManagerDashboard.jsx'
import Approvals from './approvals/Approvals.jsx'
import LogsView from './logs/LogsView.jsx'
import Reports from './reports/Reports.jsx'
import Vehicles from './vehicles/Vehicles.jsx'
import NewMaintenance from '../driver/maintenance/NewMaintenance.jsx'

export default function ManagerLayout() {
  return (
    <div className="h-screen grid grid-rows-[auto,1fr]">
      <Navbar />
      <div className="grid grid-cols-[16rem,1fr]">
        <Sidebar />
        <main className="p-4 overflow-y-auto">
          <Routes>
            <Route index element={<ManagerDashboard />} />
            <Route path="maintenance/" element={<Approvals type="maintenance" />} />
            <Route path="fuel/" element={<Approvals type="fuel" />} />
            <Route path="perdiem/" element={<Approvals type="perdiem" />} />
            <Route path="maintenance/new" element={<NewMaintenance />} />
            <Route path="logs" element={<LogsView />} />
            <Route path="reports" element={<Reports />} />
            <Route path="vehicles" element={<Vehicles />} />
          </Routes>
          <Outlet />
        </main>
      </div>
    </div>
  )
}






