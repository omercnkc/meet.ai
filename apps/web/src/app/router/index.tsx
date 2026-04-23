import { createBrowserRouter } from "react-router-dom"
import LandingPage from "@/pages/landing"
import LoginPage from "@/pages/login"
import RegisterPage from "@/pages/register"
import DashboardPage from "@/pages/dashboard"
import MeetingRoomPage from "@/pages/meeting-room"
import TasksPage from "@/pages/tasks"

export const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/dashboard", element: <DashboardPage /> },
  { path: "/meeting-room", element: <MeetingRoomPage /> },
  { path: "/tasks", element: <TasksPage /> },
])
