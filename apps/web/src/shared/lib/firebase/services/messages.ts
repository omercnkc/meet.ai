import { collection, addDoc, query, where, onSnapshot, serverTimestamp, Timestamp } from "firebase/firestore"
import { db } from "../config"

export type Message = {
  id: string
  meetingId: string
  text: string
  senderId: string
  senderName?: string
  createdAt: Timestamp | null
}

export async function sendMessage(meetingId: string, text: string, senderId: string, senderName: string = "User") {
  const newMessage = {
    meetingId,
    text,
    senderId,
    senderName,
    createdAt: serverTimestamp()
  }
  
  const docRef = await addDoc(collection(db, "messages"), newMessage)
  
  return { 
    id: docRef.id, 
    ...newMessage 
  } as unknown as Message
}

export function subscribeToMessages(meetingId: string, onUpdate: (messages: Message[]) => void) {
  const q = query(
    collection(db, "messages"),
    where("meetingId", "==", meetingId)
  )
  
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    })) as Message[]

    // Sort client-side to avoid composite index requirement
    messages.sort((a, b) => {
      const timeA = a.createdAt?.toMillis() || 0;
      const timeB = b.createdAt?.toMillis() || 0;
      return timeA - timeB; // asc (oldest first)
    });

    onUpdate(messages)
  })
}
