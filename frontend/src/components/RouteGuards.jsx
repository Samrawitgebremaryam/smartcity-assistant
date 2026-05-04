import { Navigate } from 'react-router-dom'

import { useAuth } from '../auth/AuthContext'
import LoadingScreen from './LoadingScreen'

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return children
}

export function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (user) return <Navigate to="/chat" replace />
  return children
}
