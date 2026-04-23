import { Header } from "@/features/marketing/components/header"

export default function DashboardPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-md w-full">
          <div className="p-4 rounded-full bg-primary/10 w-16 h-16 mx-auto flex items-center justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard Central</h1>
          <p className="text-muted-foreground text-base">
            Your centralized workspace for managing meetings, tasks, and team productivity in one place.
          </p>
          <div className="pt-4 flex gap-4 justify-center">
            <button className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
              New Meeting
            </button>
            <button className="px-5 py-2.5 rounded-lg border border-input bg-background font-medium hover:bg-accent hover:text-accent-foreground transition-colors">
              View Analytics
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
