import { Outlet, Routes, Route } from 'react-router-dom'
import Sidebar from '../../components/layout/Sidebar.jsx'
import Navbar from '../../components/layout/Navbar.jsx'
import DriverDashboard from './DriverDashboard.jsx'
import NewMaintenance from './maintenance/NewMaintenance.jsx'
import NewFuel from './fuel/NewFuel.jsx'
import NewPerDiem from './perdiem/NewPerDiem.jsx'
import Logs from './logs/Logs.jsx'
import MyRequests from './requests/MyRequests.jsx'

export default function DriverLayout() {
  return (
    <div className="h-screen grid grid-rows-[auto,1fr]">
      <Navbar />
      <div className="grid grid-cols-[16rem,1fr]">
        <Sidebar />
        <main className="p-4 overflow-y-auto">
          <Routes>
            <Route index element={<DriverDashboard />} />
            <Route path="maintenance/new" element={<NewMaintenance />} />
            <Route path="fuel/new" element={<NewFuel />} />
            <Route path="perdiem/new" element={<NewPerDiem />} />
            <Route path="logs" element={<Logs />} />
            <Route path="requests" element={<MyRequests />} />
          </Routes>
          <Outlet />
        </main>
      </div>
    </div>
  )
}






