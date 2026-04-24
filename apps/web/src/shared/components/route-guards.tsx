import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/app/providers/auth-provider"

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth()
  const location = useLocation()

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

export function PublicRoute({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth()
  const location = useLocation()

  if (currentUser) {
    const from = location.state?.from?.pathname || "/dashboard"
    return <Navigate to={from} replace />
  }

  return <>{children}</>
}
