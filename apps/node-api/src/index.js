import "dotenv/config";
import express from "express";
import meetingRoutes from "./routes/meetings.js";
import admissionRoutes from "./routes/admission.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.use("/api/meetings", meetingRoutes);
app.use("/api/admission", admissionRoutes);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`Node API running on http://localhost:${PORT}`);
});
