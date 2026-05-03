import { useState, useEffect, useRef } from "react"
import { subscribeToTasks, createTask, updateTaskStatus, Task } from "@/shared/lib/firebase/services/tasks"
import { subscribeToMessages, sendMessage, Message } from "@/shared/lib/firebase/services/messages"
import { useAuth } from "@/app/providers/auth-provider"
import { generateTranscript, getTranscripts, TranscriptRecord } from "@/shared/lib/api/transcript-service"
import { ListTodo, MessageSquare, FileText, Plus, CheckCircle2, Circle, Send, Sparkles, Loader2, AlertCircle, Copy, Check } from "lucide-react"

export function TaskPanel({ meetingId }: { meetingId: string }) {
  const { currentUser } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<"tasks" | "chat" | "transcript">("tasks")

  // Chat state
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessageText, setNewMessageText] = useState("")
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Transcript state
  const [transcriptLoading, setTranscriptLoading] = useState(false)
  const [transcriptGenerating, setTranscriptGenerating] = useState(false)
  const [transcripts, setTranscripts] = useState<TranscriptRecord[]>([])
  const [transcriptError, setTranscriptError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const unsubscribeTasks = subscribeToTasks(meetingId, (data) => setTasks(data))
    const unsubscribeMessages = subscribeToMessages(meetingId, (data) => setMessages(data))
    
    return () => {
      unsubscribeTasks()
      unsubscribeMessages()
    }
  }, [meetingId])

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  // Fetch existing transcripts when tab opens
  useEffect(() => {
    if (activeTab === "transcript" && currentUser && transcripts.length === 0 && !transcriptLoading) {
      fetchTranscripts()
    }
  }, [activeTab])

  const fetchTranscripts = async () => {
    if (!currentUser) return
    setTranscriptLoading(true)
    setTranscriptError(null)
    try {
      const data = await getTranscripts(meetingId, currentUser)
      setTranscripts(data)
    } catch (err: any) {
      // If no transcripts found, that's OK — don't show error
      if (!err?.message?.includes("404")) {
        setTranscriptError(err?.message || "Failed to fetch transcripts.")
      }
    } finally {
      setTranscriptLoading(false)
    }
  }

  const handleGenerateTranscript = async () => {
    if (!currentUser) return
    setTranscriptGenerating(true)
    setTranscriptError(null)
    try {
      const result = await generateTranscript(meetingId, currentUser)
      // Prepend the new transcript
      setTranscripts((prev) => [result, ...prev])
    } catch (err: any) {
      setTranscriptError(err?.message || "Transcript generation failed.")
    } finally {
      setTranscriptGenerating(false)
    }
  }

  const handleCopyTranscript = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim() || !currentUser) return

    setIsSubmitting(true)
    try {
      await createTask(meetingId, newTaskTitle.trim(), currentUser.uid)
      setNewTaskTitle("")
    } catch (error) {
      console.error("Failed to add task", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === "open" ? "done" : "open"
    try {
      await updateTaskStatus(task.id, newStatus)
    } catch (error) {
      console.error("Failed to update task", error)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessageText.trim() || !currentUser) return

    setIsSendingMessage(true)
    try {
      await sendMessage(meetingId, newMessageText.trim(), currentUser.uid, currentUser.displayName || currentUser.email?.split("@")[0] || "User")
      setNewMessageText("")
    } catch (error) {
      console.error("Failed to send message", error)
    } finally {
      setIsSendingMessage(false)
    }
  }

  const latestTranscript = transcripts.find((t) => t.status === "completed" && t.fullText)

  return (
    <aside className="w-80 border-l border-border/40 bg-card hidden lg:flex flex-col shrink-0">
      <div className="flex border-b border-border/40 shrink-0">
        <button 
          onClick={() => setActiveTab("tasks")}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "tasks" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:bg-muted/50"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <ListTodo className="w-4 h-4" /> Tasks
          </div>
        </button>
        <button 
          onClick={() => setActiveTab("chat")}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "chat" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:bg-muted/50"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <MessageSquare className="w-4 h-4" /> Chat
          </div>
        </button>
        <button 
          onClick={() => setActiveTab("transcript")}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "transcript" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:bg-muted/50"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <FileText className="w-4 h-4" /> Transcript
          </div>
        </button>
      </div>
      
      {activeTab === "tasks" ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Task List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {tasks.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <ListTodo className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <h3 className="font-medium">No tasks yet</h3>
                <p className="text-sm text-muted-foreground mt-1">Add tasks manually, or AI will extract them automatically.</p>
              </div>
            ) : (
              tasks.map(task => (
                <div 
                  key={task.id} 
                  className={`flex gap-3 p-3 rounded-lg border transition-colors ${
                    task.status === "done" ? "bg-muted/30 border-transparent opacity-60" : "bg-card border-border/60 shadow-sm"
                  }`}
                >
                  <button 
                    onClick={() => toggleTaskStatus(task)}
                    className="shrink-0 mt-0.5 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                  >
                    {task.status === "done" ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>
                  <div className="flex-1 space-y-1">
                    <p className={`text-sm font-medium ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                      {task.title}
                    </p>
                    {task.assignedToUserId && (
                      <p className="text-xs text-muted-foreground">
                        Assigned to: {task.assignedToUserId === currentUser?.uid ? "You" : task.assignedToUserId}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add Task Input */}
          <div className="p-4 border-t border-border/40 shrink-0 bg-background/50">
            <form onSubmit={handleAddTask} className="flex gap-2">
              <input
                type="text"
                placeholder="Add a task..."
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                disabled={isSubmitting}
              />
              <button 
                type="submit" 
                disabled={!newTaskTitle.trim() || isSubmitting}
                className="h-9 w-9 shrink-0 flex items-center justify-center rounded-md bg-primary text-primary-foreground shadow hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      ) : activeTab === "chat" ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <MessageSquare className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <h3 className="font-medium">No messages yet</h3>
                <p className="text-sm text-muted-foreground mt-1">Start the conversation!</p>
              </div>
            ) : (
              messages.map(msg => {
                const isMe = msg.senderId === currentUser?.uid
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    <span className="text-[10px] text-muted-foreground mb-1 px-1">
                      {isMe ? "You" : msg.senderName}
                    </span>
                    <div className={`px-3 py-2 rounded-2xl max-w-[85%] text-sm ${
                      isMe 
                        ? "bg-primary text-primary-foreground rounded-br-sm" 
                        : "bg-muted text-foreground rounded-bl-sm"
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Send Message Input */}
          <div className="p-4 border-t border-border/40 shrink-0 bg-background/50">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                placeholder="Type a message..."
                className="flex h-9 w-full rounded-full border border-input bg-background px-4 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                disabled={isSendingMessage}
              />
              <button 
                type="submit" 
                disabled={!newMessageText.trim() || isSendingMessage}
                className="h-9 w-9 shrink-0 flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* ── Transcript Tab ── */
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Transcript Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {transcriptLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                <p className="text-sm text-muted-foreground">Loading transcripts...</p>
              </div>
            ) : transcriptGenerating ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <div className="relative mb-4">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-primary animate-pulse" />
                  </div>
                  <div className="absolute inset-0 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                </div>
                <h3 className="font-medium text-sm">Generating transcript...</h3>
                <p className="text-xs text-muted-foreground mt-1.5 max-w-[200px]">
                  Audio is being processed by AI. This may take a moment.
                </p>
              </div>
            ) : transcriptError ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-destructive">Transcript Error</p>
                    <p className="text-xs text-destructive/80">{transcriptError}</p>
                  </div>
                </div>
                <button
                  onClick={handleGenerateTranscript}
                  disabled={transcriptGenerating}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  Retry Generate Transcript
                </button>
                {latestTranscript && (
                  <TranscriptCard
                    transcript={latestTranscript}
                    copied={copied}
                    onCopy={handleCopyTranscript}
                  />
                )}
              </div>
            ) : latestTranscript ? (
              <div className="space-y-3">
                <TranscriptCard
                  transcript={latestTranscript}
                  copied={copied}
                  onCopy={handleCopyTranscript}
                />
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <FileText className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <h3 className="font-medium">No transcript yet</h3>
                <p className="text-sm text-muted-foreground mt-1">Record audio first, then generate a transcript using AI.</p>
              </div>
            )}
          </div>

          {/* Generate Button */}
          <div className="p-4 border-t border-border/40 shrink-0 bg-background/50">
            <button
              onClick={handleGenerateTranscript}
              disabled={transcriptGenerating || transcriptLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-all disabled:opacity-50 shadow-sm"
            >
              {transcriptGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Transcript
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}

/**
 * Reusable card to display a transcript.
 */
function TranscriptCard({
  transcript,
  copied,
  onCopy,
}: {
  transcript: TranscriptRecord
  copied: boolean
  onCopy: (text: string) => void
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs font-medium text-muted-foreground">
            {transcript.language?.toUpperCase() || "TR"} • {
              new Date(transcript.createdAt).toLocaleString("tr-TR", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })
            }
          </span>
        </div>
        <button
          onClick={() => onCopy(transcript.fullText || "")}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:bg-muted transition-colors"
          title="Copy transcript"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-green-500" />
              <span className="text-green-500">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              Copy
            </>
          )}
        </button>
      </div>
      {/* Body */}
      <div className="p-3 max-h-[400px] overflow-y-auto">
        <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
          {transcript.fullText}
        </p>
      </div>
    </div>
  )
}
