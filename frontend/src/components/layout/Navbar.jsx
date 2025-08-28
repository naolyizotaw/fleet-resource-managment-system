import { useAuth } from '../../context/AuthContext.jsx'

export default function Navbar() {
  const { user, logout } = useAuth()
  return (
    <header className="h-14 border-b bg-white flex items-center justify-between px-4">
      <div className="font-semibold">Fleet Management</div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">{user?.name || user?.username} ({user?.role})</span>
        <button onClick={logout} className="px-3 py-1 text-sm bg-gray-800 text-white rounded">Logout</button>
      </div>
    </header>
  )
}


