import { ThemeProvider } from "@/app/providers/theme-provider"
import { AuthProvider } from "@/app/providers/auth-provider"
import { I18nProvider } from "@/shared/lib/i18n"

export function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <ThemeProvider defaultTheme="system" storageKey="meetai-theme">
        <AuthProvider>
          {children}
        </AuthProvider>
      </ThemeProvider>
    </I18nProvider>
  )
}
