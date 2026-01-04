import { useState, useEffect, useRef, useCallback } from "react";

export type TimerState = "idle" | "running" | "paused" | "completed";

interface WorkTimerConfig {
  durationMinutes: number;
  onComplete?: () => void;
  autoStartEnabled?: boolean;
}

interface WorkTimerReturn {
  state: TimerState;
  remainingSeconds: number;
  totalSeconds: number;
  progress: number;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  isInWorkBlock: boolean;
  currentBlockName: string | null;
  isMuted: boolean;
  toggleMute: () => void;
}

const STORAGE_KEY = "neurozen-work-timer";

interface StoredTimerState {
  remainingSeconds: number;
  state: TimerState;
  startedAt: number | null;
  pausedAt: number | null;
}

export function useWorkTimer(config: WorkTimerConfig): WorkTimerReturn {
  const { durationMinutes, onComplete, autoStartEnabled = false } = config;
  const totalSeconds = durationMinutes * 60;

  const [state, setState] = useState<TimerState>("idle");
  const [remainingSeconds, setRemainingSeconds] = useState(totalSeconds);
  const [isMuted, setIsMuted] = useState(() => {
    const stored = localStorage.getItem("neurozen-timer-muted");
    return stored === "true";
  });
  const [isInWorkBlock, setIsInWorkBlock] = useState(false);
  const [currentBlockName, setCurrentBlockName] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoStartedRef = useRef(false);

  useEffect(() => {
    audioRef.current = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleXZ2m7qtZj0sVpLFxJVhOyxbk9Dpq2YgC0aUx8ybZC8nX5jU4aRjJRtLl8zYoGMtIlqS0uqoYSIOS5LJ051gMCZek9TlpmMkHE2Xz9qhYi8jW5HS6qhgIw9Kk8rUn2AxJl6T1OSoYyUcTJfQ2qFiLyNbkdLqqGAjD0qTytSeYDEmXpPU5KhjJRxMl9DaoWIvI1uR0uqoYCMPSpPK1J5gMSZek9TkqGMlHEyX0NqhYi8jW5HS6qhgIw9Kk8rUnmAxJl6T1OSoYyUcTJfQ2qFiLyNbkdLqqGAjD0qTytSeYDEmXpPU5KhjJRxMl9DaoWIvI1uR0uqoYCMPSpPK1J5gMSZek9TkqGMlHEyX0NqhYi8jW5HS6qhgIw8=");
    audioRef.current.volume = 0.5;
  }, []);

  const saveState = useCallback((newState: TimerState, seconds: number) => {
    const stored: StoredTimerState = {
      remainingSeconds: seconds,
      state: newState,
      startedAt: newState === "running" ? Date.now() : null,
      pausedAt: newState === "paused" ? Date.now() : null,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed: StoredTimerState = JSON.parse(stored);
        if (parsed.state === "running" && parsed.startedAt) {
          const elapsed = Math.floor((Date.now() - parsed.startedAt) / 1000);
          const remaining = Math.max(0, parsed.remainingSeconds - elapsed);
          if (remaining > 0) {
            setRemainingSeconds(remaining);
            setState("running");
          } else {
            setState("completed");
            setRemainingSeconds(0);
          }
        } else if (parsed.state === "paused") {
          setRemainingSeconds(parsed.remainingSeconds);
          setState("paused");
        }
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const checkWorkBlock = useCallback(() => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = hours * 60 + minutes;

    const workBlock1Start = 9 * 60;
    const workBlock1End = 13 * 60;
    const workBlock2Start = 14 * 60;
    const workBlock2End = 18 * 60;

    if (currentTime >= workBlock1Start && currentTime < workBlock1End) {
      setIsInWorkBlock(true);
      setCurrentBlockName("Work Block 1");
      return true;
    } else if (currentTime >= workBlock2Start && currentTime < workBlock2End) {
      setIsInWorkBlock(true);
      setCurrentBlockName("Work Block 2");
      return true;
    } else {
      setIsInWorkBlock(false);
      setCurrentBlockName(null);
      return false;
    }
  }, []);

  useEffect(() => {
    checkWorkBlock();
    const blockCheckInterval = setInterval(checkWorkBlock, 60000);
    return () => clearInterval(blockCheckInterval);
  }, [checkWorkBlock]);

  useEffect(() => {
    if (autoStartEnabled && isInWorkBlock && state === "idle" && !hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      setState("running");
      setRemainingSeconds(totalSeconds);
      saveState("running", totalSeconds);
    }
  }, [autoStartEnabled, isInWorkBlock, state, totalSeconds, saveState]);

  useEffect(() => {
    if (state === "running") {
      intervalRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            setState("completed");
            saveState("completed", 0);
            if (!isMuted && audioRef.current) {
              audioRef.current.play().catch(() => {});
            }
            onComplete?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state, isMuted, onComplete, saveState]);

  const start = useCallback(() => {
    hasAutoStartedRef.current = true;
    setRemainingSeconds(totalSeconds);
    setState("running");
    saveState("running", totalSeconds);
  }, [totalSeconds, saveState]);

  const pause = useCallback(() => {
    setState("paused");
    saveState("paused", remainingSeconds);
  }, [remainingSeconds, saveState]);

  const resume = useCallback(() => {
    setState("running");
    saveState("running", remainingSeconds);
  }, [remainingSeconds, saveState]);

  const reset = useCallback(() => {
    hasAutoStartedRef.current = false;
    setState("idle");
    setRemainingSeconds(totalSeconds);
    localStorage.removeItem(STORAGE_KEY);
  }, [totalSeconds]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const newValue = !prev;
      localStorage.setItem("neurozen-timer-muted", String(newValue));
      return newValue;
    });
  }, []);

  const progress = ((totalSeconds - remainingSeconds) / totalSeconds) * 100;

  return {
    state,
    remainingSeconds,
    totalSeconds,
    progress,
    start,
    pause,
    resume,
    reset,
    isInWorkBlock,
    currentBlockName,
    isMuted,
    toggleMute,
  };
}
