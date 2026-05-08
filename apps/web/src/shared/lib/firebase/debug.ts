import { auth, db } from "./config"
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore"

export async function debugDataSourceConsistency(meetingId?: string) {
  console.log("=== WEB DATA SOURCE CONSISTENCY DEBUG ===")
  console.log("Platform: Web")
  console.log("Environment: ", import.meta.env.MODE)
  console.log("Firebase App Name: ", auth.app.name)
  console.log("Firebase ProjectId: ", auth.app.options.projectId)
  console.log("Auth User UID: ", auth.currentUser?.uid || "None")
  console.log("Supabase URL: ", import.meta.env.VITE_SUPABASE_URL)
  console.log("API Base URL: ", import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_LIVEKIT_TOKEN_ENDPOINT?.replace(/\/api\/.*$/, ''))

  try {
    // 1. Fetch 5 latest meetings
    const meetingsQ = query(collection(db, "meetings"), orderBy("createdAt", "desc"), limit(5))
    const mSnap = await getDocs(meetingsQ)
    const meetings = mSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    console.log("Latest 5 Meetings: ", meetings)

    // 2. Fetch 5 latest tasks
    const tasksQ = query(collection(db, "tasks"), orderBy("createdAt", "desc"), limit(5))
    const tSnap = await getDocs(tasksQ)
    const tasks = tSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    console.log("Latest 5 Tasks: ", tasks)

    // 3. Transcript for a specific meeting
    if (meetingId && auth.currentUser) {
      const token = await auth.currentUser.getIdToken()
      const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_LIVEKIT_TOKEN_ENDPOINT?.replace(/\/api\/.*$/, '')
      const res = await fetch(`${baseUrl}/api/transcripts/${meetingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const transcripts = await res.json()
        console.log(`Transcripts for meeting ${meetingId}:`, transcripts)
      } else {
        console.log(`Transcripts fetch failed: ${res.status}`)
      }
    }
  } catch (err) {
    console.error("Debug script failed: ", err)
  }
  console.log("=========================================")
}

// Attach to window for easy execution from DevTools
if (typeof window !== "undefined") {
  (window as any).debugDataSourceConsistency = debugDataSourceConsistency;
}
