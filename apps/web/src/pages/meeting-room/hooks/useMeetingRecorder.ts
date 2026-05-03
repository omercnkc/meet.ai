/**
 * useMeetingRecorder
 *
 * Client-side meeting audio recording hook using the MediaRecorder API.
 *
 * MVP limitation:
 *   Records only the **local microphone** audio track.
 *   Mixed/remote audio capture requires LiveKit Egress (future work).
 *
 * State machine:
 *   idle → recording → stopping → uploading → uploaded
 *                                            → error
 */

import { useState, useRef, useCallback, useEffect } from "react"
import type { User } from "firebase/auth"
import { uploadRecording, type RecordingMetadata } from "@/shared/lib/api/recording-service"

// ── Types ───────────────────────────────────────────────────────────────

export type RecordingState =
  | "idle"
  | "recording"
  | "stopping"
  | "uploading"
  | "uploaded"
  | "error"

export interface MeetingRecorderReturn {
  /** Current recording state */
  state: RecordingState
  /** Human-readable error if state === 'error' */
  errorMessage: string | null
  /** Whether the browser supports MediaRecorder */
  isSupported: boolean
  /** Duration in seconds since recording started (updates every second) */
  elapsed: number
  /** Last successful upload result */
  lastUpload: RecordingMetadata | null
  /** Start recording the local microphone */
  startRecording: () => Promise<void>
  /** Stop recording and trigger upload */
  stopRecording: () => Promise<RecordingMetadata | null>
}

// Preferred MIME types in order of priority
const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/ogg",
  "audio/mp4",
]

function getPreferredMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm"
  for (const mime of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(mime)) return mime
  }
  return "audio/webm"
}

// ── Hook ────────────────────────────────────────────────────────────────

export function useMeetingRecorder(
  meetingId: string | undefined,
  user: User | null
): MeetingRecorderReturn {
  const [state, setState] = useState<RecordingState>("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [lastUpload, setLastUpload] = useState<RecordingMetadata | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)

  const isSupported =
    typeof window !== "undefined" && typeof window.MediaRecorder !== "undefined"

  // ── Cleanup helper ──
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    mediaRecorderRef.current = null
    chunksRef.current = []
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  // ── Start recording ──
  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setErrorMessage("MediaRecorder is not supported in this browser.")
      setState("error")
      return
    }
    if (!meetingId) {
      setErrorMessage("No meeting ID available.")
      setState("error")
      return
    }

    try {
      // Reset state
      setErrorMessage(null)
      setElapsed(0)
      chunksRef.current = []

      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = getPreferredMimeType()
      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      recorder.onerror = () => {
        setErrorMessage("Recording error occurred.")
        setState("error")
        cleanup()
      }

      recorder.start(1000) // collect data every second
      startTimeRef.current = Date.now()
      setState("recording")

      // Elapsed timer
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)
    } catch (err: any) {
      const msg =
        err?.name === "NotAllowedError"
          ? "Microphone access was denied."
          : `Could not start recording: ${err?.message || err}`
      setErrorMessage(msg)
      setState("error")
      cleanup()
    }
  }, [isSupported, meetingId, cleanup])

  // ── Stop recording and upload ──
  const stopRecording = useCallback(async (): Promise<RecordingMetadata | null> => {
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state === "inactive") {
      return null
    }

    setState("stopping")
    const durationSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000)

    // Wait for the recorder to flush remaining data
    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "audio/webm"
        const finalBlob = new Blob(chunksRef.current, { type: mimeType })
        resolve(finalBlob)
      }
      recorder.stop()
    })

    // Stop mic tracks and timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    mediaRecorderRef.current = null

    if (!user || !meetingId) {
      setErrorMessage("Cannot upload: missing user or meeting ID.")
      setState("error")
      return null
    }

    if (blob.size === 0) {
      setErrorMessage("Recording produced no audio data.")
      setState("error")
      return null
    }

    // Upload
    setState("uploading")
    try {
      const mimeType = blob.type || "audio/webm"
      const result = await uploadRecording({
        meetingId,
        blob,
        mimeType,
        durationSeconds,
        user,
      })
      setLastUpload(result)
      setState("uploaded")

      // Reset back to idle after a short delay so the user sees "Uploaded"
      setTimeout(() => setState("idle"), 3000)

      return result
    } catch (err: any) {
      setErrorMessage(err?.message || "Upload failed.")
      setState("error")
      return null
    }
  }, [user, meetingId])

  return {
    state,
    errorMessage,
    isSupported,
    elapsed,
    lastUpload,
    startRecording,
    stopRecording,
  }
}
