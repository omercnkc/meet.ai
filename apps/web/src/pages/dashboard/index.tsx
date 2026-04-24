import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Header } from "@/features/marketing/components/header"
import { useAuth } from "@/app/providers/auth-provider"
import { createMeeting, subscribeToMeetings, Meeting } from "@/shared/lib/firebase/services/meetings"
import { Calendar, Video, CheckSquare, FileText, Plus, LogOut } from "lucide-react"

export default function DashboardPage() {
  const { currentUser, signOut } = useAuth()
  const navigate = useNavigate()
  
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (!currentUser) return
    const unsubscribe = subscribeToMeetings(currentUser.uid, (data) => {
      setMeetings(data)
    })
    return () => unsubscribe()
  }, [currentUser])

  const handleCreateMeeting = async () => {
    if (!currentUser) return
    setIsCreating(true)
    try {
      const meeting = await createMeeting(currentUser.uid, `${currentUser.displayName || 'User'}'s Meeting`)
      navigate(`/meeting-room/${meeting.id}`)
    } catch (error) {
      console.error("Failed to create meeting", error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground pt-16">
      <Header />
      <main className="flex-1 w-full max-w-7xl mx-auto p-6 md:p-8 space-y-8">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back, {currentUser?.displayName || currentUser?.email?.split('@')[0]}
            </h1>
            <p className="text-muted-foreground">Ready for your next productive meeting?</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleCreateMeeting}
              disabled={isCreating}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Video className="w-4 h-4" />
              {isCreating ? "Starting..." : "Start Meeting"}
            </button>
            <button 
              onClick={async () => { await signOut(); navigate('/login') }}
              className="flex items-center justify-center p-2.5 rounded-lg border border-border bg-card hover:bg-accent text-muted-foreground transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Meetings Card */}
          <div className="col-span-1 md:col-span-2 rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-border/40 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Recent Meetings</h2>
            </div>
            <div className="p-0 flex-1">
              {meetings.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center px-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <Video className="w-5 h-5 text-primary/60" />
                  </div>
                  <h3 className="font-medium text-foreground">No meetings yet</h3>
                  <p className="text-sm text-muted-foreground mt-1 mb-4">You haven't hosted or joined any meetings.</p>
                  <button 
                    onClick={handleCreateMeeting}
                    className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium"
                  >
                    <Plus className="w-4 h-4" /> Start your first meeting
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {meetings.map(m => (
                    <div 
                      key={m.id} 
                      onClick={() => navigate(`/meeting-room/${m.id}`)}
                      className="flex justify-between items-center p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="space-y-1">
                        <p className="font-medium">{m.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.createdAt ? (
                            <>
                              {m.createdAt.toDate().toLocaleDateString()} at {m.createdAt.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </>
                          ) : (
                            "Just now"
                          )}
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/20">
                        {m.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {/* Tasks Card */}
            <div className="rounded-xl border border-border/60 bg-card shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckSquare className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Action Items</h2>
              </div>
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <p className="text-sm text-muted-foreground">No pending tasks.</p>
                <p className="text-xs text-muted-foreground/70 mt-1">AI will automatically assign tasks during meetings.</p>
              </div>
            </div>

            {/* Transcripts Card */}
            <div className="rounded-xl border border-border/60 bg-card shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Recent Transcripts</h2>
              </div>
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <p className="text-sm text-muted-foreground">No transcripts yet.</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Transcripts will appear after a meeting ends.</p>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
