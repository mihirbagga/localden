import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import '../pages/admin/admin.css'

export default function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, loading, profile } = useAuth()
  const location = useLocation()

  if (loading || (isAuthenticated && !profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin admin-spinner" />
          <p className="font-display text-sm admin-muted">Loading admin…</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
