import { useState, useRef, useCallback, useEffect } from "react";
import { Audio } from "expo-av";
import { auth } from "../config/firebase";
import { ENV } from "../config/env";

export type RecordingState =
  | "idle"
  | "recording"
  | "stopping"
  | "uploading"
  | "uploaded"
  | "error";

export function useRecorder(meetingId: string) {
  const [state, setState] = useState<RecordingState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopTimer();
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    };
  }, [stopTimer]);

  const startRecording = useCallback(async () => {
    try {
      setErrorMessage(null);
      setElapsed(0);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      startTimeRef.current = Date.now();
      setState("recording");

      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to start recording.");
      setState("error");
      stopTimer();
    }
  }, [stopTimer]);

  const stopRecording = useCallback(async () => {
    const recording = recordingRef.current;
    if (!recording) return;

    setState("stopping");
    stopTimer();

    const durationSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;

      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      if (!uri) {
        setErrorMessage("No recording file found.");
        setState("error");
        return;
      }

      const user = auth.currentUser;
      if (!user) {
        setErrorMessage("Not authenticated.");
        setState("error");
        return;
      }

      setState("uploading");

      const idToken = await user.getIdToken();

      const formData = new FormData();
      formData.append("meetingId", meetingId);
      formData.append("mimeType", "audio/m4a");
      formData.append("durationSeconds", String(durationSeconds));
      // React Native FormData file upload uses URI objects
      (formData as any).append("file", { uri, type: "audio/m4a", name: "recording.m4a" });

      const response = await fetch(`${ENV.API_BASE_URL}/api/recordings/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "Unknown error");
        throw new Error(`Upload failed (${response.status}): ${text}`);
      }

      setState("uploaded");
      setTimeout(() => setState("idle"), 3000);
    } catch (err: any) {
      setErrorMessage(err?.message || "Upload failed.");
      setState("error");
    }
  }, [meetingId, stopTimer]);

  return { state, elapsed, errorMessage, startRecording, stopRecording };
}
