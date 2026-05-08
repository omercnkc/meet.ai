/**
 * Tasks Service — Firestore-based task management.
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
} from "firebase/firestore";
import { db } from "../config/firebase";

export interface Task {
  id: string;
  meetingId: string;
  title: string;
  status: "open" | "done";
  createdAt: Timestamp;
  assignedToUserId?: string;
}

export function subscribeToTasks(
  meetingId: string, 
  callback: (tasks: Task[]) => void,
  onError?: (error: Error) => void
) {
  const q = query(
    collection(db, "tasks"),
    where("meetingId", "==", meetingId),
    orderBy("createdAt", "desc")
  );

  let fallbackUnsubscribe: (() => void) | null = null;

  try {
    const mainUnsubscribe = onSnapshot(
      q, 
      (snapshot) => {
        const tasks = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Task));
        callback(tasks);
      },
      (error: any) => {
        if (error?.code === "failed-precondition") {
          console.warn("[subscribeToTasks] Missing index for tasks. Falling back to local sorting.");
          const fallbackQ = query(collection(db, "tasks"), where("meetingId", "==", meetingId));
          fallbackUnsubscribe = onSnapshot(fallbackQ, (fallbackSnapshot) => {
             const fallbackTasks = fallbackSnapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Task));
             fallbackTasks.sort((a, b) => {
               const timeA = a.createdAt?.toMillis?.() || 0;
               const timeB = b.createdAt?.toMillis?.() || 0;
               return timeB - timeA; // descending
             });
             callback(fallbackTasks);
          }, (fallbackErr) => {
             console.warn("[subscribeToTasks] Fallback error:", fallbackErr.message);
             onError?.(fallbackErr);
          });
        } else {
          console.warn("[subscribeToTasks] Snapshot error:", error.message);
          onError?.(error);
        }
      }
    );
    return () => {
      mainUnsubscribe();
      if (fallbackUnsubscribe) fallbackUnsubscribe();
    };
  } catch (error: any) {
    console.warn("[subscribeToTasks] Synchronous error:", error.message);
    onError?.(error);
    return () => {};
  }
}

export async function createTask(meetingId: string, title: string, assignedToUserId?: string) {
  await addDoc(collection(db, "tasks"), {
    meetingId,
    title,
    status: "open",
    createdAt: Timestamp.now(),
    assignedToUserId,
  });
}

export async function updateTaskStatus(taskId: string, status: "open" | "done") {
  const docRef = doc(db, "tasks", taskId);
  await updateDoc(docRef, { status });
}

export function subscribeToOpenTasksForMeetings(meetingIds: string[], onUpdate: (tasks: Task[]) => void) {
  if (!meetingIds || meetingIds.length === 0) {
    onUpdate([]);
    return () => {};
  }

  const chunks = [];
  for (let i = 0; i < Math.min(meetingIds.length, 50); i += 10) {
    chunks.push(meetingIds.slice(i, i + 10));
  }

  const unsubscribes: Array<() => void> = [];
  const tasksByChunk: Task[][] = new Array(chunks.length).fill([]);

  chunks.forEach((chunk, index) => {
    const q = query(
      collection(db, "tasks"),
      where("meetingId", "in", chunk),
      where("status", "==", "open")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      tasksByChunk[index] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Task[];

      const allTasks = tasksByChunk.flat();
      allTasks.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });

      if (__DEV__) {
        console.log(`[subscribeToOpenTasksForMeetings] Loaded ${allTasks.length} open tasks`);
      }

      onUpdate(allTasks);
    }, (error) => {
      console.warn("[subscribeToOpenTasksForMeetings] Error:", error.message);
    });

    unsubscribes.push(unsub);
  });

  return () => {
    unsubscribes.forEach((unsub) => unsub());
  };
}

export function subscribeToDoneTasksForMeetings(meetingIds: string[], onUpdate: (tasks: Task[]) => void) {
  if (!meetingIds || meetingIds.length === 0) {
    onUpdate([]);
    return () => {};
  }

  const chunks = [];
  for (let i = 0; i < Math.min(meetingIds.length, 50); i += 10) {
    chunks.push(meetingIds.slice(i, i + 10));
  }

  const unsubscribes: Array<() => void> = [];
  const tasksByChunk: Task[][] = new Array(chunks.length).fill([]);

  chunks.forEach((chunk, index) => {
    const q = query(
      collection(db, "tasks"),
      where("meetingId", "in", chunk),
      where("status", "==", "done")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      tasksByChunk[index] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Task[];

      const allTasks = tasksByChunk.flat();
      allTasks.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });

      if (__DEV__) {
        console.log(`[subscribeToDoneTasksForMeetings] Loaded ${allTasks.length} done tasks`);
      }

      onUpdate(allTasks);
    }, (error) => {
      console.warn("[subscribeToDoneTasksForMeetings] Error:", error.message);
    });

    unsubscribes.push(unsub);
  });

  return () => {
    unsubscribes.forEach((unsub) => unsub());
  };
}
