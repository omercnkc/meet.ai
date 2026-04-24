import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, Timestamp, doc, updateDoc } from "firebase/firestore"
import { db } from "../config"

export type Task = {
  id: string
  meetingId: string
  title: string
  assignedToUserId: string | null
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
    where("meetingId", "==", meetingId),
    orderBy("createdAt", "desc")
  )
  
  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    })) as Task[]
    onUpdate(tasks)
  })
}

export async function updateTaskStatus(taskId: string, status: "open" | "done") {
  const taskRef = doc(db, "tasks", taskId)
  await updateDoc(taskRef, { status })
}
