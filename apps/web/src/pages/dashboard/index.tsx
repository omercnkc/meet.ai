import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Header } from "@/features/marketing/components/header"
import { useAuth } from "@/app/providers/auth-provider"
import { createMeeting, subscribeToMeetings, Meeting } from "@/shared/lib/firebase/services/meetings"
import { subscribeToOpenTasksForMeetings, subscribeToDoneTasksForMeetings, Task } from "@/shared/lib/firebase/services/tasks"
import { Calendar, Video, CheckSquare, CheckCircle2, FileText, Plus, LogOut, Circle } from "lucide-react"

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

  const [openTasks, setOpenTasks] = useState<Task[]>([])
  const [doneTasks, setDoneTasks] = useState<Task[]>([])
  
  const endedMeetingIds = useMemo(() => meetings.filter(m => m.status === "ended").map(m => m.id), [meetings])
  const endedMeetingsKey = endedMeetingIds.join(',')

  useEffect(() => {
    if (endedMeetingIds.length === 0) {
      setOpenTasks([])
      return
    }
    const unsubscribe = subscribeToOpenTasksForMeetings(endedMeetingIds, (tasks) => {
      setOpenTasks(tasks)
    })
    return () => unsubscribe()
  }, [endedMeetingsKey])

  useEffect(() => {
    if (endedMeetingIds.length === 0) {
      setDoneTasks([])
      return
    }
    const unsubscribe = subscribeToDoneTasksForMeetings(endedMeetingIds, (tasks) => {
      setDoneTasks(tasks)
    })
    return () => unsubscribe()
  }, [endedMeetingsKey])

  const getMeetingInfo = (meetingId: string) => {
    return meetings.find(m => m.id === meetingId)
  }

  const handleCreateMeeting = async () => {
    if (!currentUser) return
    setIsCreating(true)
    try {
      const userName = currentUser.displayName || currentUser.email?.split('@')[0] || 'User'
      const meeting = await createMeeting(currentUser.uid, `${userName}'s Meeting`)
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
                      onClick={() => navigate(m.status === "ended" ? `/meetings/${m.id}/summary` : `/meeting-room/${m.id}`)}
                      className="flex justify-between items-center p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="space-y-1">
                        <p className={`font-medium ${m.status === "ended" ? "text-muted-foreground" : "text-foreground"}`}>
                          {m.title === "User's Meeting" ? `${currentUser?.displayName || currentUser?.email?.split('@')[0]}'s Meeting` : m.title}
                        </p>
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
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                        m.status === "active" 
                          ? "bg-green-500/10 text-green-500 border-green-500/20" 
                          : "bg-secondary text-secondary-foreground border-border/50"
                      }`}>
                        {m.status === "active" ? "Active" : "Ended"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {/* Tasks Card */}
            <div className="rounded-xl border border-border/60 bg-card shadow-sm p-6 flex flex-col max-h-[400px]">
              <div className="flex items-center gap-2 mb-4 shrink-0">
                <CheckSquare className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Open tasks from previous meetings</h2>
              </div>
              <div className="flex-1 overflow-y-auto pr-2">
                {openTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <p className="text-sm text-muted-foreground">No open tasks from previous meetings.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {openTasks.map(task => {
                      const mInfo = getMeetingInfo(task.meetingId)
                      const dateObj = mInfo?.endedAt || mInfo?.createdAt
                      const dateStr = dateObj ? dateObj.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "Unknown date"
                      
                      return (
                        <div key={task.id} className="flex gap-3 p-3 rounded-lg border border-border/60 bg-background shadow-sm hover:bg-muted/30 transition-colors">
                          <Circle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <div className="space-y-1 min-w-0">
                            <p className="text-sm font-medium text-foreground break-words">{task.title}</p>
                            <div className="text-xs text-muted-foreground space-y-0.5">
                              <p>Meeting: <span className="text-foreground/80 font-medium truncate">{mInfo?.title || "Unknown"}</span></p>
                              <p>Date: {dateStr}</p>
                              {task.assignedToUserId && (
                                <p>Assigned to: {task.assignedToUserId === currentUser?.uid ? "You" : task.assignedToUserId}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Completed Tasks Card */}
            <div className="rounded-xl border border-border/60 bg-card shadow-sm p-6 flex flex-col max-h-[400px]">
              <div className="flex items-center gap-2 mb-4 shrink-0">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <h2 className="text-xl font-semibold">Completed tasks</h2>
              </div>
              <div className="flex-1 overflow-y-auto pr-2">
                {doneTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <p className="text-sm text-muted-foreground">No completed tasks yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {doneTasks.map(task => {
                      const mInfo = getMeetingInfo(task.meetingId)
                      const dateObj = mInfo?.endedAt || mInfo?.createdAt
                      const dateStr = dateObj ? dateObj.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "Unknown date"
                      
                      return (
                        <div key={task.id} className="flex gap-3 p-3 rounded-lg border border-border/60 bg-background shadow-sm hover:bg-muted/30 transition-colors opacity-80">
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                          <div className="space-y-1 min-w-0">
                            <p className="text-sm font-medium text-foreground break-words line-through">{task.title}</p>
                            <div className="text-xs text-muted-foreground space-y-0.5">
                              <p>Meeting: <span className="text-foreground/80 font-medium truncate">{mInfo?.title || "Unknown"}</span></p>
                              <p>Date: {dateStr}</p>
                              {task.assignedToUserId && (
                                <p>Assigned to: {task.assignedToUserId === currentUser?.uid ? "You" : task.assignedToUserId}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
