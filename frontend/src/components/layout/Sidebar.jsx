import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

const baseClasses = 'flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100 text-gray-700'
const active = ({ isActive }) => isActive ? baseClasses + ' bg-gray-100 font-medium' : baseClasses

export default function Sidebar() {
  const { user } = useAuth()
  const role = user?.role

  const driverLinks = [
    { to: '/driver', label: 'Dashboard' },
    { to: '/driver/maintenance/new', label: 'Maintenance Requests' },
    { to: '/driver/fuel/new', label: 'Fuel Requests' },
    { to: '/driver/perdiem/new', label: 'Per Diem Requests' },
    { to: '/driver/logs', label: 'Daily Logs' },
    { to: '/driver/requests', label: 'My Requests' }
  ]

  const managerLinks = [
    { to: '/manager', label: 'Dashboard' },
    { to: '/manager/maintenance/approvals', label: 'Maintenance Requests' },
    { to: '/manager/fuel/approvals', label: 'Fuel Requests' },
    { to: '/manager/perdiem/approvals', label: 'Per Diem Requests' },
    { to: '/manager/logs', label: 'Driver Logs' },
    { to: '/manager/reports', label: 'Reports' },
    { to: '/manager/vehicles', label: 'Vehicles' }
  ]

  const adminLinks = [
    { to: '/admin', label: 'Dashboard' },
    { to: '/admin/users', label: 'Manage Users' },
    { to: '/admin/vehicles', label: 'Manage Vehicles' },
    { to: '/admin/maintenance/approvals', label: 'Maintenance Requests' },
    { to: '/admin/fuel/approvals', label: 'Fuel Requests' },
    { to: '/admin/perdiem/approvals', label: 'Per Diem Requests' },
    { to: '/admin/logs', label: 'Driver Logs' },
    { to: '/admin/reports', label: 'Reports' }
  ]

  const links = role === 'driver' ? driverLinks : role === 'manager' ? managerLinks : adminLinks

  return (
    <aside className="w-64 border-r bg-white h-full p-4">
      <nav className="flex flex-col gap-1">
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} className={active} end>
            <span>{l.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}


