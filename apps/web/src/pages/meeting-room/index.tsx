import { Header } from "@/features/marketing/components/header"

export default function MeetingRoomPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-lg w-full">
          <div className="p-4 rounded-full bg-primary/10 w-16 h-16 mx-auto flex items-center justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Active Meeting Room</h1>
          <p className="text-muted-foreground text-base">
            Your real-time meeting environment with live transcription, AI assistance, and automatic task extraction.
          </p>
          <div className="pt-4 flex gap-4 justify-center">
            <button className="px-5 py-2.5 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors">
              End Meeting
            </button>
            <button className="px-5 py-2.5 rounded-lg border border-input bg-background font-medium hover:bg-accent hover:text-accent-foreground transition-colors">
              Share Invite
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
