import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, Timestamp, doc } from "firebase/firestore"
import { db } from "../config"

export type Meeting = {
  id: string
  title: string
  hostId: string
  participantIds: string[]
  status: "active" | "ended" | "scheduled"
  createdAt: Timestamp | null
}

export async function createMeeting(hostId: string, title: string) {
  const newMeeting = {
    title,
    hostId,
    participantIds: [hostId],
    status: "active",
    createdAt: serverTimestamp()
  }
  
  // We don't include id in the document itself, we append it after document creation
  const docRef = await addDoc(collection(db, "meetings"), newMeeting)
  
  return { 
    id: docRef.id, 
    ...newMeeting 
  } as unknown as Meeting
}

export function subscribeToMeetings(userId: string, onUpdate: (meetings: Meeting[]) => void) {
  const q = query(
    collection(db, "meetings"),
    where("participantIds", "array-contains", userId),
    orderBy("createdAt", "desc")
  )
  
  return onSnapshot(q, (snapshot) => {
    const meetings = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    })) as Meeting[]
    onUpdate(meetings)
  })
}

export function subscribeToMeeting(meetingId: string, onUpdate: (meeting: Meeting | null) => void) {
  return onSnapshot(doc(db, "meetings", meetingId), (document) => {
    if (document.exists()) {
      onUpdate({ id: document.id, ...document.data() } as Meeting)
    } else {
      onUpdate(null)
    }
  })
}
