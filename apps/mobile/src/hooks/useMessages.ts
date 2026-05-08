/**
 * useMessages hook — Subscribes to chat messages for a meeting.
 */

import { useState, useEffect } from "react";
import { Message, subscribeToMessages } from "../services/messages";

export function useMessages(meetingId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!meetingId) {
      setLoading(false);
      return;
    }
    const unsubscribe = subscribeToMessages(
      meetingId, 
      (data) => {
        setMessages(data);
        setLoading(false);
      },
      (error) => {
        console.warn("[useMessages] Error subscribing to messages:", error?.message || "Unknown error");
        setLoading(false);
      }
    );
    
    const timeoutId = setTimeout(() => {
      setLoading((prev) => {
        if (prev) {
          console.warn("[useMessages] Messages subscription timeout (5s). Forcing loading to false.");
          return false;
        }
        return prev;
      });
    }, 5000);

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [meetingId]);

  return { messages, loading };
}
