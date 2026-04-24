import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import { db } from "../config"

export async function createUserProfile(uid: string, email: string, displayName: string) {
  const userRef = doc(db, "users", uid)
  await setDoc(userRef, {
    uid,
    email,
    displayName: displayName || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true })
}
