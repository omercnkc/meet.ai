// Mock data shaped after the real Firestore schema:
// meetings/{meetingId} → { participantIds: string[], ... }
// tasks/{taskId}       → { meetingId: string, title: string, status: "open"|"done", ... }

const MOCK_TASKS = {
  "meeting-123": ["Frontend login sayfası tamamlanacak", "API entegrasyonu test edilecek", "PR açılacak"],
  "meeting-456": ["Tasarım revizyonu yapılacak"],
};

const MOCK_PARTICIPANTS = {
  "meeting-123": ["alice@example.com", "bob@example.com", "carol@example.com"],
  "meeting-456": ["dave@example.com"],
};

export async function getTodosByMeetingId(meetingId) {
  // Real implementation (Firebase Admin SDK):
  //   const snapshot = await db.collection("tasks")
  //     .where("meetingId", "==", meetingId)
  //     .get();
  //   return snapshot.docs.map(d => d.data().title);
  return MOCK_TASKS[meetingId] ?? [];
}

export async function getParticipantsByMeetingId(meetingId) {
  // Real implementation (Firebase Admin SDK):
  //   const meetingDoc = await db.collection("meetings").doc(meetingId).get();
  //   const { participantIds } = meetingDoc.data();
  //   const users = await Promise.all(participantIds.map(uid => admin.auth().getUser(uid)));
  //   return users.map(u => u.email).filter(Boolean);
  return MOCK_PARTICIPANTS[meetingId] ?? [];
}
