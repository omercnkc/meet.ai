export async function triggerN8nWebhook({ meetingId, emails, todos }) {
  const url = process.env.N8N_URL;
  const secret = process.env.N8N_SECRET;

  if (!url || !secret) {
    throw new Error("N8N_URL or N8N_SECRET environment variable is not set");
  }

  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${secret}`,
    },
    body: JSON.stringify({
      meetingId,
      emails,
      todos,
    }),
  });
}
