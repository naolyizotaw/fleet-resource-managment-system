import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  const effectiveRole = user.role === 'user' ? 'driver' : user.role
  if (allowedRoles && !allowedRoles.includes(effectiveRole)) {
    const redirect = effectiveRole === 'driver' ? '/driver' : effectiveRole === 'manager' ? '/manager' : '/admin'
    return <Navigate to={redirect} replace />
  }
  return children
}


