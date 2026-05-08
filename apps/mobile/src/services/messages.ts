/**
 * Messages Service — Firestore-based chat management.
 */

import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

export interface Message {
  id: string;
  meetingId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: Timestamp;
}

export function subscribeToMessages(
  meetingId: string, 
  callback: (messages: Message[]) => void,
  onError?: (error: Error) => void
) {
  const q = query(
    collection(db, "messages"),
    where("meetingId", "==", meetingId),
    orderBy("createdAt", "asc")
  );

  let fallbackUnsubscribe: (() => void) | null = null;

  try {
    const mainUnsubscribe = onSnapshot(
      q, 
      (snapshot) => {
        const messages = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Message));
        callback(messages);
      },
      (error: any) => {
        if (error?.code === "failed-precondition") {
          console.warn("[subscribeToMessages] Missing index for messages. Falling back to local sorting.");
          const fallbackQ = query(collection(db, "messages"), where("meetingId", "==", meetingId));
          fallbackUnsubscribe = onSnapshot(fallbackQ, (fallbackSnapshot) => {
             const fallbackMessages = fallbackSnapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Message));
             fallbackMessages.sort((a, b) => {
               const timeA = a.createdAt?.toMillis?.() || 0;
               const timeB = b.createdAt?.toMillis?.() || 0;
               return timeA - timeB; // ascending
             });
             callback(fallbackMessages);
          }, (fallbackErr) => {
             console.warn("[subscribeToMessages] Fallback error:", fallbackErr.message);
             onError?.(fallbackErr);
          });
        } else {
          console.warn("[subscribeToMessages] Snapshot error:", error.message);
          onError?.(error);
        }
      }
    );
    return () => {
      mainUnsubscribe();
      if (fallbackUnsubscribe) fallbackUnsubscribe();
    };
  } catch (error: any) {
    console.warn("[subscribeToMessages] Synchronous error:", error.message);
    onError?.(error);
    return () => {};
  }
}

export async function sendMessage(
  meetingId: string,
  text: string,
  senderId: string,
  senderName: string = "User"
) {
  await addDoc(collection(db, "messages"), {
    meetingId,
    senderId,
    senderName,
    text,
    createdAt: Timestamp.now(),
  });
}
