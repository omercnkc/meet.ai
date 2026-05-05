import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Header } from "@/features/marketing/components/header"
import { useAuth } from "@/app/providers/auth-provider"
import { subscribeToMeeting, Meeting } from "@/shared/lib/firebase/services/meetings"
import { subscribeToTasks, Task } from "@/shared/lib/firebase/services/tasks"
import { generateTranscript, getTranscripts, TranscriptRecord } from "@/shared/lib/api/transcript-service"
import { askMeetingQuestion, getAiMessages, AiMessage } from "@/shared/lib/api/ai-service"
import { AlertCircle, ArrowLeft, Bot, CheckCircle2, Circle, FileText, Loader2, MessageSquareText, Send, Sparkles, Video } from "lucide-react"

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

  // ─── AI Q&A State ───
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([])
  const [loadingAiMessages, setLoadingAiMessages] = useState(true)
  const [aiQuestion, setAiQuestion] = useState("")
  const [isAskingAi, setIsAskingAi] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

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

  // ─── Load AI Messages ───
  useEffect(() => {
    async function loadAiMessages() {
      if (!meetingId || !currentUser) return
      try {
        const data = await getAiMessages(meetingId, currentUser)
        setAiMessages(data)
      } catch (err) {
        console.error("Failed to load AI messages:", err)
      } finally {
        setLoadingAiMessages(false)
      }
    }
    loadAiMessages()
  }, [meetingId, currentUser])

  // ─── Auto-scroll chat ───
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [aiMessages, isAskingAi])

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

  // ─── Ask AI Question ───
  const handleAskQuestion = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const trimmed = aiQuestion.trim()
    if (!trimmed || !meetingId || !currentUser || isAskingAi) return

    setAiQuestion("")
    setAiError(null)
    setIsAskingAi(true)

    try {
      const result = await askMeetingQuestion(meetingId, trimmed, currentUser)
      setAiMessages((prev) => [...prev, result])
    } catch (err: any) {
      console.error("AI Q&A failed:", err)
      setAiError(err.message || "Failed to get an answer")
    } finally {
      setIsAskingAi(false)
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
  const hasTranscript = !!latestTranscript?.fullText

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
            <section id="ai-qa-section" className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-border/40 flex items-center gap-2">
                <div className="relative">
                  <MessageSquareText className="w-5 h-5 text-primary" />
                  <Sparkles className="w-3 h-3 text-primary absolute -top-1 -right-1.5" />
                </div>
                <h2 className="text-xl font-semibold">AI Q&A</h2>
                {aiMessages.length > 0 && (
                  <span className="ml-auto bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                    {aiMessages.length} {aiMessages.length === 1 ? "message" : "messages"}
                  </span>
                )}
              </div>

              {/* Chat Area */}
              <div className="flex flex-col" style={{ minHeight: "320px", maxHeight: "520px" }}>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {loadingAiMessages ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : !hasTranscript ? (
                    /* No transcript — show disabled state */
                    <div className="flex flex-col items-center justify-center py-12 space-y-3 text-center">
                      <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground/50">
                        <MessageSquareText className="w-7 h-7" />
                      </div>
                      <p className="font-medium text-muted-foreground">Transcript required</p>
                      <p className="text-sm text-muted-foreground/70 max-w-sm">
                        Generate a meeting transcript first, then you can ask AI questions about it.
                      </p>
                    </div>
                  ) : aiMessages.length === 0 && !isAskingAi ? (
                    /* Empty state — prompt to start asking */
                    <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary">
                          <Bot className="w-7 h-7" />
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-green-500 rounded-full border-2 border-card flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-white" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <p className="font-semibold text-foreground">AI Assistant Ready</p>
                        <p className="text-sm text-muted-foreground max-w-md">
                          Ask me anything about this meeting — key decisions, action items, specific topics, or what was discussed. I'll answer based on the transcript.
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-center gap-2 mt-2">
                        {[
                          "What were the key decisions?",
                          "Summarize the meeting",
                          "What action items were assigned?",
                        ].map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => {
                              setAiQuestion(suggestion)
                            }}
                            className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary/5 text-primary hover:bg-primary/10 border border-primary/10 transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Chat messages */
                    <>
                      {aiMessages.map((msg, idx) => (
                        <div key={msg.id || idx} className="space-y-3">
                          {/* User question */}
                          <div className="flex justify-end">
                            <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-br-md bg-primary text-primary-foreground text-sm leading-relaxed shadow-sm">
                              {msg.question}
                            </div>
                          </div>
                          {/* AI answer */}
                          <div className="flex justify-start gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 mt-0.5">
                              <Bot className="w-4 h-4 text-primary" />
                            </div>
                            <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-bl-md bg-muted/60 text-foreground text-sm leading-relaxed">
                              <p className="whitespace-pre-wrap">{msg.answer}</p>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Loading indicator while asking */}
                      {isAskingAi && (
                        <div className="flex justify-start gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 mt-0.5">
                            <Bot className="w-4 h-4 text-primary" />
                          </div>
                          <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-muted/60">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                              <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                              <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Error */}
                {aiError && (
                  <div className="mx-4 mb-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-xs">Error</p>
                      <p className="text-destructive/80 text-xs">{aiError}</p>
                    </div>
                    <button
                      onClick={() => setAiError(null)}
                      className="ml-auto text-destructive/60 hover:text-destructive text-xs font-medium"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Input Area */}
                <div className="border-t border-border/40 p-4">
                  <form onSubmit={handleAskQuestion} className="flex items-center gap-2">
                    <input
                      id="ai-question-input"
                      type="text"
                      value={aiQuestion}
                      onChange={(e) => setAiQuestion(e.target.value)}
                      placeholder={hasTranscript ? "Ask a question about the meeting..." : "Generate a transcript first..."}
                      disabled={!hasTranscript || isAskingAi}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-muted/40 border border-border/60 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    />
                    <button
                      id="ai-ask-button"
                      type="submit"
                      disabled={!aiQuestion.trim() || !hasTranscript || isAskingAi}
                      className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow"
                    >
                      {isAskingAi ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </form>
                </div>
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
