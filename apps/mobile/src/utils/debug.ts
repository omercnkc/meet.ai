import { auth, db } from "../config/firebase"
import { ENV } from "../config/env"
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore"
import { apiClient } from "../services/api-client"

export async function debugDataSourceConsistency(meetingId?: string) {
  console.log("=== MOBILE DATA SOURCE CONSISTENCY DEBUG ===")
  console.log("Platform: React Native (Mobile)")
  console.log("Environment: Development (Expo)")
  console.log("Firebase App Name: ", auth.app.name)
  console.log("Firebase ProjectId: ", auth.app.options.projectId)
  console.log("Auth User UID: ", auth.currentUser?.uid || "None")
  // Mobile doesn't use Supabase client directly, but we log ENV
  console.log("API Base URL: ", ENV.API_BASE_URL)

  try {
    // 1. Fetch 5 latest meetings
    const meetingsQ = query(collection(db, "meetings"), orderBy("createdAt", "desc"), limit(5))
    const mSnap = await getDocs(meetingsQ)
    const meetings = mSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    console.log("Latest 5 Meetings: ", JSON.stringify(meetings, null, 2))

    // 2. Fetch 5 latest tasks
    const tasksQ = query(collection(db, "tasks"), orderBy("createdAt", "desc"), limit(5))
    const tSnap = await getDocs(tasksQ)
    const tasks = tSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    console.log("Latest 5 Tasks: ", JSON.stringify(tasks, null, 2))

    // 3. Transcript for a specific meeting
    if (meetingId && auth.currentUser) {
      try {
        const transcripts = await apiClient.get(`/api/transcripts/${meetingId}`);
        console.log(`Transcripts for meeting ${meetingId}:`, JSON.stringify(transcripts, null, 2))
      } catch (err: any) {
        console.log(`Transcripts fetch failed:`, err.message)
      }
    }
  } catch (err) {
    console.error("Debug script failed: ", err)
  }
  console.log("=========================================")
}

// In React Native, expose to global object for testing from App.tsx or debugger
(global as any).debugDataSourceConsistency = debugDataSourceConsistency;
