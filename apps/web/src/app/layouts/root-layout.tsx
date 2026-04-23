import { ThemeProvider } from "@/app/providers/theme-provider"

export function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="system" storageKey="meetai-theme">
      {children}
    </ThemeProvider>
  )
}
