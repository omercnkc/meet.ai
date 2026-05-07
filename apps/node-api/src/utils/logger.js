import crypto from "crypto";

const DEBUG_ADMISSION = process.env.DEBUG_ADMISSION === 'true' || true; // Force true for testing if not set

const colors = {
  reset: "\x1b[0m",
  info: "\x1b[36m", // Cyan
  warn: "\x1b[33m", // Yellow
  error: "\x1b[31m", // Red
  event: "\x1b[35m", // Magenta
};

function formatLog(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level}] ${message}${metaStr}`;
}

export function logInfo(message, meta = {}) {
  if (!DEBUG_ADMISSION) return;
  console.log(`${colors.info}${formatLog('INFO', message, meta)}${colors.reset}`);
}

export function logWarn(message, meta = {}) {
  if (!DEBUG_ADMISSION) return;
  console.warn(`${colors.warn}${formatLog('WARN', message, meta)}${colors.reset}`);
}

export function logError(message, meta = {}) {
  console.error(`${colors.error}${formatLog('ERROR', message, meta)}${colors.reset}`);
}

export function logAdmissionEvent(eventType, meetingId, userId, requestId, extra = {}) {
  if (!DEBUG_ADMISSION) return;
  const meta = { meetingId, userId, requestId, eventType, ...extra };
  console.log(`${colors.event}${formatLog('ADMISSION_EVENT', eventType, meta)}${colors.reset}`);
}
