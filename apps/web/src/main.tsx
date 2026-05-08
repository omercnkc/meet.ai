import { StrictMode, Suspense } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider } from "react-router-dom"
import { RootLayout } from "./app/layouts/root-layout"
import { router } from "./app/router"
import "./shared/styles/globals.css"
import "./shared/lib/i18n" // Ensure i18n is initialized before rendering
import "./shared/lib/firebase/debug" // Attach debug script to window

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Suspense fallback={<div>Loading...</div>}>
      <RootLayout>
        <RouterProvider router={router} />
      </RootLayout>
    </Suspense>
  </StrictMode>,
)
