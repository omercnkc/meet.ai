import { createBrowserRouter } from "react-router-dom"
import LandingPage from "@/pages/landing"
import LoginPage from "@/pages/login"
import RegisterPage from "@/pages/register"
import DashboardPage from "@/pages/dashboard"
import MeetingRoomPage from "@/pages/meeting-room"
import MeetingSummaryPage from "@/pages/meeting-summary"
import TasksPage from "@/pages/tasks"
import { ProtectedRoute, PublicRoute } from "@/shared/components/route-guards"

export const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  { path: "/login", element: <PublicRoute><LoginPage /></PublicRoute> },
  { path: "/register", element: <PublicRoute><RegisterPage /></PublicRoute> },
  { path: "/dashboard", element: <ProtectedRoute><DashboardPage /></ProtectedRoute> },
  { path: "/meeting-room/:meetingId", element: <ProtectedRoute><MeetingRoomPage /></ProtectedRoute> },
  { path: "/meetings/:meetingId/summary", element: <ProtectedRoute><MeetingSummaryPage /></ProtectedRoute> },
  { path: "/tasks", element: <ProtectedRoute><TasksPage /></ProtectedRoute> },
])
