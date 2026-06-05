import "dotenv/config";
import express from "express";
import meetingRoutes from "./routes/meetings.js";
import admissionRoutes from "./routes/admission.js";
import hostControlRoutes from "./routes/host-controls.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.json());

app.use("/api/meetings", meetingRoutes);
app.use("/api/admission", admissionRoutes);
app.use("/api/host-controls", hostControlRoutes);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`Node API running on http://localhost:${PORT}`);
});
