import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider } from "react-router-dom"
import { RootLayout } from "./app/layouts/root-layout"
import { router } from "./app/router"
import "./shared/styles/globals.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootLayout>
      <RouterProvider router={router} />
    </RootLayout>
  </StrictMode>,
)
