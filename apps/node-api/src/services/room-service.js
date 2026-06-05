import { RoomServiceClient } from "livekit-server-sdk";

export const roomService = new RoomServiceClient(
  process.env.LIVEKIT_URL || "ws://localhost:7880",
  process.env.LIVEKIT_API_KEY || "devkey",
  process.env.LIVEKIT_API_SECRET || "secret"
);
