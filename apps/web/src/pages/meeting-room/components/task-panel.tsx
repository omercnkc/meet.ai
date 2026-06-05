import { useState, useEffect, useRef } from "react"
import { useLocalParticipant, useRemoteParticipants } from "@livekit/components-react"
import { subscribeToTasks, updateTaskStatus, Task } from "@/shared/lib/firebase/services/tasks"
import { subscribeToMessages, sendMessage, Message } from "@/shared/lib/firebase/services/messages"
import { useAuth } from "@/app/providers/auth-provider"
import { ListTodo, MessageSquare, Plus, CheckCircle2, Circle, Send, UserCircle, X } from "lucide-react"

type Participant = { identity: string; name: string; email: string | null }

function getApiBaseUrl(): string {
  const url = import.meta.env.VITE_API_BASE_URL
  if (url) return url.replace(/\/+$/, "")
  const endpoint: string = import.meta.env.VITE_LIVEKIT_TOKEN_ENDPOINT || ""
  try {
    return new URL(endpoint).origin
  } catch {
    const idx = endpoint.indexOf("/api")
    return idx > 0 ? endpoint.slice(0, idx) : endpoint
  }
}

function getEmailFromMetadata(meta?: string): string | null {
  if (!meta) return null
  try { return JSON.parse(meta)?.email || null } catch { return null }
}

export function TaskPanel({ meetingId }: { meetingId: string }) {
  const { currentUser } = useAuth()
  const { localParticipant } = useLocalParticipant()
  const remoteParticipants = useRemoteParticipants()

  const [tasks, setTasks] = useState<Task[]>([])
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<"tasks" | "chat">("tasks")

  // Assignee @mention state
  const [selectedAssignees, setSelectedAssignees] = useState<Participant[]>([])
  const [showMentionPicker, setShowMentionPicker] = useState(false)
  const [mentionSearchQuery, setMentionSearchQuery] = useState("")
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0)

  // Reset active suggestion index when picker opens or query changes
  useEffect(() => {
    setActiveSuggestionIndex(0)
  }, [showMentionPicker, mentionSearchQuery])

  // Chat state
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessageText, setNewMessageText] = useState("")
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Build participants list from LiveKit room
  const meetingParticipants: Participant[] = [
    ...(localParticipant
      ? [{ identity: localParticipant.identity, name: localParticipant.name || localParticipant.identity, email: currentUser?.email || null }]
      : []),
    ...remoteParticipants.map(p => ({
      identity: p.identity,
      name: p.name || p.identity,
      email: getEmailFromMetadata(p.metadata),
    })),
  ]

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

  const handleTaskTitleChange = (value: string) => {
    setNewTaskTitle(value)
    const match = value.match(/@(\w*)$/)
    if (match) {
      setShowMentionPicker(true)
      setMentionSearchQuery(match[1])
    } else {
      setShowMentionPicker(false)
      setMentionSearchQuery("")
    }
  }

  const handleSelectAssignee = (p: Participant) => {
    if (selectedAssignees.some(a => a.identity === p.identity)) return
    setSelectedAssignees(prev => [...prev, p])
    setNewTaskTitle(prev => prev.replace(/@\w*$/, `@${p.name} `))
    setShowMentionPicker(false)
    setMentionSearchQuery("")
  }

  const handleRemoveAssignee = (identity: string) => {
    setSelectedAssignees(prev => prev.filter(a => a.identity !== identity))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showMentionPicker || filteredParticipants.length === 0) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveSuggestionIndex((prev) => (prev + 1) % filteredParticipants.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveSuggestionIndex((prev) => (prev - 1 + filteredParticipants.length) % filteredParticipants.length)
    } else if (e.key === "Tab" || e.key === "Enter") {
      e.preventDefault()
      const selectedParticipant = filteredParticipants[activeSuggestionIndex]
      if (selectedParticipant) {
        handleSelectAssignee(selectedParticipant)
      }
    } else if (e.key === "Escape") {
      e.preventDefault()
      setShowMentionPicker(false)
    }
  }

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim() || !currentUser) return

    // Clean up empty/dangling @ tags at the end of the text
    let cleanedTitle = newTaskTitle.trim()
    cleanedTitle = cleanedTitle.replace(/@\w*$/, "").trim()

    // Do not submit if the cleaned title is empty
    if (!cleanedTitle) return

    setIsSubmitting(true)
    try {
      const idToken = await currentUser.getIdToken()
      const baseUrl = getApiBaseUrl()

      const response = await fetch(`${baseUrl}/api/tasks`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meetingId,
          title: cleanedTitle,
          selectedAssignees: selectedAssignees.map(a => ({
            userId: a.identity,
            name: a.name,
            email: a.email,
          })),
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.detail || `Failed to create task (${response.status})`)
      }

      setNewTaskTitle("")
      setSelectedAssignees([])
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

  const getAssigneeLabel = (task: Task): string | null => {
    if (task.assignees && task.assignees.length > 0) {
      return task.assignees.map(a => a.userId === currentUser?.uid ? "You" : a.name).join(", ")
    }
    if (task.assignedToName) return task.assignedToUserId === currentUser?.uid ? "You" : task.assignedToName
    if (task.assignedToUserId) return task.assignedToUserId === currentUser?.uid ? "You" : task.assignedToUserId
    return null
  }

  const filteredParticipants = meetingParticipants.filter(p =>
    p.name.toLowerCase().includes(mentionSearchQuery.toLowerCase())
  )

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
              tasks.map(task => {
                const assigneeLabel = getAssigneeLabel(task)
                return (
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
                      {assigneeLabel && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <UserCircle className="w-3 h-3" />
                          {assigneeLabel}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Add Task Input */}
          <div className="p-4 border-t border-border/40 shrink-0 bg-background/50">
            <form onSubmit={handleAddTask} className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add a task... (type @ to assign)"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={newTaskTitle}
                  onChange={(e) => handleTaskTitleChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isSubmitting}
                />
                <button
                  type="submit"
                  disabled={!newTaskTitle.trim() || isSubmitting}
                  className="h-9 w-9 shrink-0 flex items-center justify-center rounded-md bg-primary text-primary-foreground shadow hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Selected Assignee Chips */}
              {selectedAssignees.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedAssignees.map(assignee => (
                    <span
                      key={assignee.identity}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/15 text-primary border border-primary/30"
                    >
                      <UserCircle className="w-3 h-3" />
                      {assignee.name}
                      <button
                        type="button"
                        onClick={() => handleRemoveAssignee(assignee.identity)}
                        className="ml-0.5 hover:opacity-60 focus:outline-none"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* @mention Picker */}
              {showMentionPicker && (
                <div className="border border-border rounded-lg max-h-40 overflow-y-auto bg-card shadow-sm">
                  {filteredParticipants.length === 0 ? (
                    <div className="p-3 text-xs text-muted-foreground text-center italic">No participants found</div>
                  ) : (
                    filteredParticipants.map((p, index) => (
                      <button
                        key={p.identity}
                        type="button"
                        onClick={() => handleSelectAssignee(p)}
                        onMouseEnter={() => setActiveSuggestionIndex(index)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm border-b border-border/40 last:border-0 text-left transition-colors ${
                          index === activeSuggestionIndex
                            ? "bg-muted font-medium text-foreground"
                            : "hover:bg-muted/30 text-foreground"
                        }`}
                      >
                        <UserCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-foreground flex-1">
                          {p.name}
                          {p.email && p.email !== p.name && (
                            <span className="text-muted-foreground text-xs ml-1">({p.email})</span>
                          )}
                        </span>
                        {p.identity === localParticipant?.identity && (
                          <span className="text-xs text-muted-foreground">(you)</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
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
      ) : null}
    </aside>
  )
}
