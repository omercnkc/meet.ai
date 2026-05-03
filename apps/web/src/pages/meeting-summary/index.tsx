import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Header } from "@/features/marketing/components/header"
import { useAuth } from "@/app/providers/auth-provider"
import { subscribeToMeeting, Meeting } from "@/shared/lib/firebase/services/meetings"
import { subscribeToTasks, Task } from "@/shared/lib/firebase/services/tasks"
import { generateTranscript, getTranscripts, TranscriptRecord } from "@/shared/lib/api/transcript-service"
import { AlertCircle, ArrowLeft, CheckCircle2, Circle, FileText, Loader2, MessageSquareText, Video } from "lucide-react"

export default function MeetingSummaryPage() {
  const { meetingId } = useParams<{ meetingId: string }>()
  const navigate = useNavigate()
  const { currentUser } = useAuth()

  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [transcripts, setTranscripts] = useState<TranscriptRecord[]>([])
  
  const [loadingMeeting, setLoadingMeeting] = useState(true)
  const [loadingTasks, setLoadingTasks] = useState(true)
  const [loadingTranscripts, setLoadingTranscripts] = useState(true)
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  // ─── Firebase Subscriptions ───
  useEffect(() => {
    if (!meetingId) return
    const unsubscribe = subscribeToMeeting(meetingId, (data) => {
      setMeeting(data)
      setLoadingMeeting(false)
    })
    return () => unsubscribe()
  }, [meetingId])

  useEffect(() => {
    if (!meetingId) return
    const unsubscribe = subscribeToTasks(meetingId, (data) => {
      setTasks(data)
      setLoadingTasks(false)
    })
    return () => unsubscribe()
  }, [meetingId])

  // ─── Load Transcripts ───
  useEffect(() => {
    async function loadTranscripts() {
      if (!meetingId || !currentUser) return
      try {
        const data = await getTranscripts(meetingId, currentUser)
        setTranscripts(data)
      } catch (err) {
        console.error("Failed to load transcripts:", err)
      } finally {
        setLoadingTranscripts(false)
      }
    }
    loadTranscripts()
  }, [meetingId, currentUser])

  // ─── Generate Transcript ───
  const handleGenerateTranscript = async () => {
    if (!meetingId || !currentUser) return
    setIsGenerating(true)
    setGenerateError(null)
    try {
      const newTranscript = await generateTranscript(meetingId, currentUser)
      setTranscripts((prev) => [newTranscript, ...prev])
    } catch (err: any) {
      console.error("Failed to generate transcript:", err)
      setGenerateError(err.message || "Failed to generate transcript")
    } finally {
      setIsGenerating(false)
    }
  }

  // ─── Render: Loading / Error ───
  if (loadingMeeting) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="mt-4 text-muted-foreground font-medium animate-pulse">Loading summary...</p>
      </div>
    )
  }

  if (!meeting) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground pt-16">
        <Header />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4 max-w-md w-full p-8 border border-border/40 bg-card rounded-2xl shadow-sm">
            <div className="mx-auto w-12 h-12 bg-destructive/10 text-destructive flex items-center justify-center rounded-full mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Meeting Not Found</h1>
            <p className="text-muted-foreground">The meeting might have been deleted or never existed.</p>
            <button
              onClick={() => navigate("/dashboard")}
              className="mt-4 px-5 py-2.5 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors w-full"
            >
              Return to Dashboard
            </button>
          </div>
        </main>
      </div>
    )
  }

  const latestTranscript = transcripts.length > 0 ? transcripts[0] : null

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground pt-16">
      <Header />
      
      <main className="flex-1 w-full max-w-7xl mx-auto p-6 md:p-8 space-y-8">
        {/* Top Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
              <button 
                onClick={() => navigate("/dashboard")}
                className="hover:text-foreground transition-colors flex items-center gap-1 font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Video className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">{meeting.title}</h1>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                meeting.status === "active" 
                  ? "bg-green-500/10 text-green-500 border-green-500/20" 
                  : "bg-secondary text-secondary-foreground border-border/50"
              }`}>
                {meeting.status === "active" ? "Active" : "Ended"}
              </span>
            </div>
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              <span>Created: {meeting.createdAt?.toDate().toLocaleString()}</span>
              {meeting.endedAt && (
                <>
                  <span>•</span>
                  <span>Ended: {meeting.endedAt.toDate().toLocaleString()}</span>
                </>
              )}
            </p>
          </div>
          
          {meeting.status === "active" && (
            <button
              onClick={() => navigate(`/meeting-room/${meeting.id}`)}
              className="px-5 py-2.5 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium transition-colors shadow-sm"
            >
              Join Live Meeting
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Column: Transcript & AI Q&A */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Transcript Section */}
            <section className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-border/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">Meeting Transcript</h2>
                </div>
                {!latestTranscript && (
                  <button
                    onClick={handleGenerateTranscript}
                    disabled={isGenerating}
                    className="flex items-center gap-2 px-4 py-2 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    {isGenerating ? "Generating..." : "Generate Transcript"}
                  </button>
                )}
              </div>
              <div className="p-6">
                {generateError && (
                  <div className="mb-4 p-4 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <div>
                      <p className="font-semibold">Generation failed</p>
                      <p className="text-destructive/80">{generateError}</p>
                    </div>
                  </div>
                )}
                
                {loadingTranscripts ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : latestTranscript ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">
                      {latestTranscript.fullText || "No content found in transcript."}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-12 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
                      <FileText className="w-6 h-6" />
                    </div>
                    <p className="text-muted-foreground font-medium">No transcript available</p>
                    <p className="text-sm text-muted-foreground/80 max-w-sm mx-auto">
                      Generate a transcript from the latest meeting recording using our AI transcription service.
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* AI Q&A Section */}
            <section className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-border/40 flex items-center gap-2">
                <MessageSquareText className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">AI Q&A</h2>
              </div>
              <div className="p-6 text-center py-12 space-y-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary/60">
                  <MessageSquareText className="w-6 h-6" />
                </div>
                <p className="font-medium">AI Q&A generation is the next backend task</p>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Soon you will be able to ask AI questions about the meeting transcript and get intelligent answers instantly.
                </p>
              </div>
            </section>

          </div>

          {/* Sidebar Column: Tasks */}
          <div className="space-y-8">
            <section className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden flex flex-col sticky top-24">
              <div className="p-6 border-b border-border/40 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Action Items</h2>
                <span className="ml-auto bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                  {tasks.length}
                </span>
              </div>
              <div className="p-0">
                {loadingTasks ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="text-center py-12 px-4 space-y-2">
                    <p className="text-muted-foreground font-medium text-sm">No action items found.</p>
                    <p className="text-xs text-muted-foreground/70">Tasks assigned during the meeting will appear here.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border/40 max-h-[500px] overflow-y-auto">
                    {tasks.map((task) => (
                      <li key={task.id} className="p-4 flex items-start gap-3 hover:bg-muted/30 transition-colors">
                        <div className="mt-0.5 shrink-0">
                          {task.status === "done" ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <Circle className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="space-y-1 min-w-0">
                          <p className={`text-sm font-medium break-words ${task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                            {task.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Added • {task.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>

        </div>
      </main>
    </div>
  )
}
