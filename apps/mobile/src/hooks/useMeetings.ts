/**
 * useMeetings hook — Subscribes to meetings for a user.
 */

import { useState, useEffect } from "react";
import { Meeting, subscribeToMeetings } from "../services/meetings";

export function useMeetings(userId?: string) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const unsubscribe = subscribeToMeetings(
      userId, 
      (data) => {
        setMeetings(data);
        setLoading(false);
      },
      (error) => {
        console.warn("[useMeetings] Error subscribing to meetings:", error.message);
        setLoading(false);
      }
    );
    
    // Timeout to prevent infinite loading if meetings take too long to load
    const timeoutId = setTimeout(() => {
      setLoading((prev) => {
        if (prev) {
          console.warn("[useMeetings] Meetings subscription timeout (5s). Forcing loading to false.");
          return false;
        }
        return prev;
      });
    }, 5000);

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [userId]);

  return { meetings, loading };
}
