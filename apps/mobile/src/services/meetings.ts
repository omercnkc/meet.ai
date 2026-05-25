/**
 * Meetings Service — Firestore-based meeting management.
 */

import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "../config/firebase";

export interface Meeting {
  id: string;
  userId: string;
  title: string;
  status: "active" | "ended";
  createdAt: Timestamp;
  endedAt?: Timestamp;
}

export function subscribeToMeetings(
  userId: string,
  callback: (meetings: Meeting[]) => void,
  onError?: (error: Error) => void
) {
  console.log(`[subscribeToMeetings] Debug: Initiating query for user ${userId}`);
  console.log(`[subscribeToMeetings] Debug: Collection: meetings`);
  console.log(`[subscribeToMeetings] Debug: Filters: userId == ${userId}`);
  console.log(`[subscribeToMeetings] Debug: Ordering: createdAt DESC`);

  const q = query(
    collection(db, "meetings"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );

  let fallbackUnsubscribe: (() => void) | null = null;

  try {
    const mainUnsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const meetings = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Meeting));
        callback(meetings);
      },
      (error: any) => {
        if (error?.code === "failed-precondition") {
          // Prevent LogBox spamming by using console.warn instead of console.error
          console.warn(
            "[subscribeToMeetings] Missing Firestore index for meetings. Falling back to local sorting.",
            error.message
          );

          // Fallback query without the orderBy
          const fallbackQ = query(
            collection(db, "meetings"),
            where("userId", "==", userId)
          );

          fallbackUnsubscribe = onSnapshot(
            fallbackQ,
            (fallbackSnapshot) => {
              const meetings = fallbackSnapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Meeting));
              // Sort locally since the index is missing
              meetings.sort((a, b) => {
                const timeA = a.createdAt?.toMillis?.() || 0;
                const timeB = b.createdAt?.toMillis?.() || 0;
                return timeB - timeA;
              });
              callback(meetings);
            },
            (fallbackErr) => {
              console.warn("[subscribeToMeetings] Fallback error:", fallbackErr.message);
              onError?.(fallbackErr);
            }
          );
        } else {
          console.warn("[subscribeToMeetings] Snapshot error:", error.message);
          onError?.(error);
        }
      }
    );

    return () => {
      mainUnsubscribe();
      if (fallbackUnsubscribe) {
        fallbackUnsubscribe();
      }
    };
  } catch (error: any) {
    console.warn("[subscribeToMeetings] Synchronous query creation error:", error.message);
    onError?.(error);
    return () => {};
  }
}

export async function createMeeting(userId: string, title: string): Promise<Meeting> {
  const docRef = await addDoc(collection(db, "meetings"), {
    userId,
    title,
    status: "active",
    createdAt: Timestamp.now(),
  });
  return { id: docRef.id, userId, title, status: "active", createdAt: Timestamp.now() };
}

export async function endMeeting(meetingId: string) {
  const docRef = doc(db, "meetings", meetingId);
  await updateDoc(docRef, { status: "ended", endedAt: Timestamp.now() });
}

export async function getMeeting(meetingId: string): Promise<Meeting | null> {
  const docRef = doc(db, "meetings", meetingId);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() } as Meeting;
  }
  return null;
}

/**
 * Realtime subscription for a single meeting document.
 * Mirrors the web's `subscribeToMeeting` (onSnapshot) behaviour.
 * Returns an unsubscribe function.
 */
export function subscribeToMeeting(
  meetingId: string,
  callback: (meeting: Meeting | null) => void,
  onError?: (error: Error) => void
): () => void {
  const docRef = doc(db, "meetings", meetingId);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback({ id: snapshot.id, ...snapshot.data() } as Meeting);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.warn("[subscribeToMeeting] Snapshot error:", error.message);
      onError?.(error);
    }
  );
}
