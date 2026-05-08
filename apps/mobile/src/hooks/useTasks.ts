/**
 * useTasks hook — Subscribes to tasks for a meeting.
 */

import { useState, useEffect } from "react";
import { Task, subscribeToTasks, subscribeToOpenTasksForMeetings, subscribeToDoneTasksForMeetings } from "../services/tasks";

export function useTasks(meetingId?: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!meetingId) {
      setLoading(false);
      return;
    }
    const unsubscribe = subscribeToTasks(
      meetingId, 
      (data) => {
        setTasks(data);
        setLoading(false);
      },
      (error) => {
        console.warn("[useTasks] Error subscribing to tasks:", error.message);
        setLoading(false);
      }
    );
    
    // Timeout to prevent infinite loading if tasks take too long to load
    const timeoutId = setTimeout(() => {
      setLoading((prev) => {
        if (prev) {
          console.warn("[useTasks] Tasks subscription timeout (5s). Forcing loading to false.");
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

  return { tasks, loading };
}

export function useOpenTasksForMeetings(meetingIds: string[]) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!meetingIds || meetingIds.length === 0) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToOpenTasksForMeetings(meetingIds, (data) => {
      setTasks(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [meetingIds.join(",")]);

  return { tasks, loading };
}

export function useDoneTasksForMeetings(meetingIds: string[]) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!meetingIds || meetingIds.length === 0) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToDoneTasksForMeetings(meetingIds, (data) => {
      setTasks(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [meetingIds.join(",")]);

  return { tasks, loading };
}
