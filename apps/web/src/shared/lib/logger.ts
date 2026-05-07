const DEBUG_ADMISSION = import.meta.env.VITE_DEBUG_ADMISSION === 'true' || true;

const colors = {
  reset: "color: inherit;",
  info: "color: #0ea5e9; font-weight: bold;", // Cyan
  warn: "color: #eab308; font-weight: bold;", // Yellow
  error: "color: #ef4444; font-weight: bold;", // Red
  event: "color: #d946ef; font-weight: bold;", // Magenta
};

function formatLog(level: string, message: string, meta: Record<string, any> = {}) {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level}] ${message}${metaStr}`;
}

export function logInfo(message: string, meta: Record<string, any> = {}) {
  if (!DEBUG_ADMISSION) return;
  console.log(`%c${formatLog('INFO', message, meta)}`, colors.info);
}

export function logWarn(message: string, meta: Record<string, any> = {}) {
  if (!DEBUG_ADMISSION) return;
  console.warn(`%c${formatLog('WARN', message, meta)}`, colors.warn);
}

export function logError(message: string, meta: Record<string, any> = {}) {
  console.error(`%c${formatLog('ERROR', message, meta)}`, colors.error);
}

export function logAdmissionEvent(eventType: string, meetingId: string, userId: string, extra: Record<string, any> = {}) {
  if (!DEBUG_ADMISSION) return;
  const meta = { meetingId, userId, eventType, ...extra };
  console.log(`%c${formatLog('ADMISSION_EVENT', eventType, meta)}`, colors.event);
}
