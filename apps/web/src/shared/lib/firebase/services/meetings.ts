import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, Timestamp, doc } from "firebase/firestore"
import { db } from "../config"

export type Meeting = {
  id: string
  userId: string
  title: string
  status: "active" | "ended" | "scheduled"
  createdAt: Timestamp | null
  endedAt?: Timestamp | null
}

export async function createMeeting(userId: string, title: string) {
  const newMeeting = {
    title,
    userId,
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
    where("userId", "==", userId)
  )

  return onSnapshot(q, (snapshot) => {
    const meetings = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    })) as Meeting[]

    // Sort meetings client-side (newest first) to avoid composite index requirements
    meetings.sort((a, b) => {
      const timeA = a.createdAt?.toMillis() || 0;
      const timeB = b.createdAt?.toMillis() || 0;
      return timeB - timeA;
    });

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

import { updateDoc } from "firebase/firestore"

export async function endMeeting(meetingId: string) {
  const meetingRef = doc(db, "meetings", meetingId)
  await updateDoc(meetingRef, {
    status: "ended",
    endedAt: serverTimestamp()
  })
}
