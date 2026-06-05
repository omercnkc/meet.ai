import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, Timestamp, doc, updateDoc } from "firebase/firestore"
import { db } from "../config"

export type SelectedAssignee = {
  userId: string
  name: string
  email?: string | null
}

export type Task = {
  id: string
  meetingId: string
  title: string
  assignedToUserId: string | null
  assignedToName?: string | null
  assignees?: SelectedAssignee[]
  createdByUserId: string
  status: "open" | "done"
  createdAt: Timestamp | null
}

export async function createTask(meetingId: string, title: string, createdByUserId: string, assignedToUserId: string | null = null) {
  const newTask = {
    meetingId,
    title,
    assignedToUserId,
    createdByUserId,
    status: "open",
    createdAt: serverTimestamp()
  }
  
  const docRef = await addDoc(collection(db, "tasks"), newTask)
  
  return { 
    id: docRef.id, 
    ...newTask 
  } as unknown as Task
}

export function subscribeToTasks(meetingId: string, onUpdate: (tasks: Task[]) => void) {
  const q = query(
    collection(db, "tasks"),
    where("meetingId", "==", meetingId)
  )
  
  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    })) as Task[]

    // Sort tasks client-side (newest first) to avoid composite index requirements
    tasks.sort((a, b) => {
      const timeA = a.createdAt?.toMillis() || 0;
      const timeB = b.createdAt?.toMillis() || 0;
      return timeB - timeA;
    });

    onUpdate(tasks)
  })
}

export async function updateTaskStatus(taskId: string, status: "open" | "done") {
  const taskRef = doc(db, "tasks", taskId)
  await updateDoc(taskRef, { status })
}

export function subscribeToOpenTasksForMeetings(meetingIds: string[], onUpdate: (tasks: Task[]) => void) {
  if (!meetingIds || meetingIds.length === 0) {
    onUpdate([])
    return () => {}
  }

  // Limit to at most 50 meetings (5 chunks of 10) to avoid excessive queries
  const chunks = []
  for (let i = 0; i < Math.min(meetingIds.length, 50); i += 10) {
    chunks.push(meetingIds.slice(i, i + 10))
  }

  const unsubscribes: Array<() => void> = []
  const tasksByChunk: Task[][] = new Array(chunks.length).fill([])

  chunks.forEach((chunk, index) => {
    const q = query(
      collection(db, "tasks"),
      where("meetingId", "in", chunk),
      where("status", "==", "open")
    )

    const unsub = onSnapshot(q, (snapshot) => {
      tasksByChunk[index] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Task[]

      const allTasks = tasksByChunk.flat()
      allTasks.sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || 0
        const timeB = b.createdAt?.toMillis() || 0
        return timeB - timeA
      })

      onUpdate(allTasks)
    })

    unsubscribes.push(unsub)
  })

  return () => {
    unsubscribes.forEach((unsub) => unsub())
  }
}

export function subscribeToDoneTasksForMeetings(meetingIds: string[], onUpdate: (tasks: Task[]) => void) {
  if (!meetingIds || meetingIds.length === 0) {
    onUpdate([])
    return () => {}
  }

  // Limit to at most 50 meetings (5 chunks of 10) to avoid excessive queries
  const chunks = []
  for (let i = 0; i < Math.min(meetingIds.length, 50); i += 10) {
    chunks.push(meetingIds.slice(i, i + 10))
  }

  const unsubscribes: Array<() => void> = []
  const tasksByChunk: Task[][] = new Array(chunks.length).fill([])

  chunks.forEach((chunk, index) => {
    const q = query(
      collection(db, "tasks"),
      where("meetingId", "in", chunk),
      where("status", "==", "done")
    )

    const unsub = onSnapshot(q, (snapshot) => {
      tasksByChunk[index] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Task[]

      const allTasks = tasksByChunk.flat()
      allTasks.sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || 0
        const timeB = b.createdAt?.toMillis() || 0
        return timeB - timeA
      })

      onUpdate(allTasks)
    })

    unsubscribes.push(unsub)
  })

  return () => {
    unsubscribes.forEach((unsub) => unsub())
  }
}

