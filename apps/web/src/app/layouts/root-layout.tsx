import { useEffect } from "react"
import { AuthProvider } from "../providers/auth-provider"
import { ThemeProvider } from "../providers/theme-provider"
import { useTranslation } from "react-i18next"

export function RootLayout({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation()

  useEffect(() => {
    document.documentElement.dir = i18n.dir()
    document.documentElement.lang = i18n.language
  }, [i18n.language, i18n.dir])

  return (
    <ThemeProvider defaultTheme="dark" storageKey="meet-ui-theme">
      <AuthProvider>
        {children}
      </AuthProvider>
    </ThemeProvider>
  )
}

