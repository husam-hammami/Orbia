import { useState, useEffect, useRef, useCallback } from "react";

export type TimerState = "idle" | "running" | "paused" | "completed" | "break";

interface WorkTimerConfig {
  durationMinutes: number;
  breakDurationMinutes?: number;
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
  skipBreak: () => void;
  isInWorkBlock: boolean;
  currentBlockName: string | null;
  isMuted: boolean;
  toggleMute: () => void;
  completedIntervals: number;
  isBreakTime: boolean;
  testSound: () => void;
}

const STORAGE_KEY = "neurozen-work-timer";
const INTERVALS_KEY = "neurozen-intervals-today";

interface StoredTimerState {
  remainingSeconds: number;
  state: TimerState;
  startedAt: number | null;
  isBreakTime: boolean;
}

function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

function getStoredIntervals(): number {
  const stored = localStorage.getItem(INTERVALS_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.date === getTodayKey()) {
        return parsed.count;
      }
    } catch {}
  }
  return 0;
}

function saveIntervals(count: number) {
  localStorage.setItem(INTERVALS_KEY, JSON.stringify({
    date: getTodayKey(),
    count
  }));
}

export function useWorkTimer(config: WorkTimerConfig): WorkTimerReturn {
  const { 
    durationMinutes, 
    breakDurationMinutes = 5,
    onComplete, 
    autoStartEnabled = false 
  } = config;
  
  const workSeconds = durationMinutes * 60;
  const breakSeconds = breakDurationMinutes * 60;

  const [state, setState] = useState<TimerState>("idle");
  const [remainingSeconds, setRemainingSeconds] = useState(workSeconds);
  const [isBreakTime, setIsBreakTime] = useState(false);
  const [completedIntervals, setCompletedIntervals] = useState(getStoredIntervals);
  const [isMuted, setIsMuted] = useState(() => {
    const stored = localStorage.getItem("neurozen-timer-muted");
    return stored === "true";
  });
  const [isInWorkBlock, setIsInWorkBlock] = useState(false);
  const [currentBlockName, setCurrentBlockName] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoStartedRef = useRef(false);

  // Update remaining seconds when duration changes and timer is idle
  useEffect(() => {
    if (state === "idle") {
      setRemainingSeconds(workSeconds);
    }
  }, [workSeconds, state]);

  // Better notification sound - a pleasant chime
  useEffect(() => {
    // Create a more pleasant notification sound using Web Audio API
    audioRef.current = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleXZ2m7qtZj0sVpLFxJVhOyxbk9Dpq2YgC0aUx8ybZC8nX5jU4aRjJRtLl8zYoGMtIlqS0uqoYSIOS5LJ051gMCZek9TlpmMkHE2Xz9qhYi8jW5HS6qhgIw9Kk8rUn2AxJl6T1OSoYyUcTJfQ2qFiLyNbkdLqqGAjD0qTytSeYDEmXpPU5KhjJRxMl9DaoWIvI1uR0uqoYCMPSpPK1J5gMSZek9TkqGMlHEyX0NqhYi8jW5HS6qhgIw9Kk8rUnmAxJl6T1OSoYyUcTJfQ2qFiLyNbkdLqqGAjD0qTytSeYDEmXpPU5KhjJRxMl9DaoWIvI1uR0uqoYCMPSpPK1J5gMSZek9TkqGMlHEyX0NqhYi8jW5HS6qhgIw8=");
    audioRef.current.volume = 0.7;
  }, []);

  const playNotification = useCallback(() => {
    if (!isMuted) {
      // Play multiple times for attention
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
        
        // Play again after short delays for more noticeable notification
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {});
          }
        }, 300);
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {});
          }
        }, 600);
      }

      // Also try browser notification if available
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(isBreakTime ? "Break time is over!" : "Time for a break!", {
          body: isBreakTime 
            ? "Ready to start another focused work session?" 
            : "You've completed 45 minutes! Stand up and stretch your back.",
          icon: "🧘",
          tag: "work-timer"
        });
      }
    }
  }, [isMuted, isBreakTime]);

  const saveState = useCallback((newState: TimerState, seconds: number, breakTime: boolean) => {
    const stored: StoredTimerState = {
      remainingSeconds: seconds,
      state: newState,
      startedAt: newState === "running" || newState === "break" ? Date.now() : null,
      isBreakTime: breakTime,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  }, []);

  // Load state on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed: StoredTimerState = JSON.parse(stored);
        setIsBreakTime(parsed.isBreakTime);
        
        if ((parsed.state === "running" || parsed.state === "break") && parsed.startedAt) {
          const elapsed = Math.floor((Date.now() - parsed.startedAt) / 1000);
          const remaining = Math.max(0, parsed.remainingSeconds - elapsed);
          if (remaining > 0) {
            setRemainingSeconds(remaining);
            setState(parsed.state);
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

    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const checkWorkBlock = useCallback(() => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = hours * 60 + minutes;

    // Work blocks from routine
    const workBlock1Start = 9 * 60;   // 9:00
    const workBlock1End = 13 * 60;    // 13:00
    const workBlock2Start = 14 * 60;  // 14:00
    const workBlock2End = 18 * 60;    // 18:00

    if (currentTime >= workBlock1Start && currentTime < workBlock1End) {
      setIsInWorkBlock(true);
      setCurrentBlockName("Morning Work");
      return true;
    } else if (currentTime >= workBlock2Start && currentTime < workBlock2End) {
      setIsInWorkBlock(true);
      setCurrentBlockName("Afternoon Work");
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

  // Auto-start in work blocks
  useEffect(() => {
    if (autoStartEnabled && isInWorkBlock && state === "idle" && !hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      setState("running");
      setRemainingSeconds(workSeconds);
      setIsBreakTime(false);
      saveState("running", workSeconds, false);
    }
  }, [autoStartEnabled, isInWorkBlock, state, workSeconds, saveState]);

  // Main timer logic
  useEffect(() => {
    if (state === "running" || state === "break") {
      intervalRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            // Timer completed
            playNotification();
            
            if (isBreakTime) {
              // Break is over, go back to idle
              setState("idle");
              setIsBreakTime(false);
              setRemainingSeconds(workSeconds);
              localStorage.removeItem(STORAGE_KEY);
            } else {
              // Work session completed
              const newCount = completedIntervals + 1;
              setCompletedIntervals(newCount);
              saveIntervals(newCount);
              
              // Start break automatically
              setState("break");
              setIsBreakTime(true);
              setRemainingSeconds(breakSeconds);
              saveState("break", breakSeconds, true);
            }
            
            onComplete?.();
            return isBreakTime ? workSeconds : breakSeconds;
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
  }, [state, isMuted, onComplete, saveState, isBreakTime, workSeconds, breakSeconds, completedIntervals, playNotification]);

  const start = useCallback(() => {
    hasAutoStartedRef.current = true;
    setRemainingSeconds(workSeconds);
    setIsBreakTime(false);
    setState("running");
    saveState("running", workSeconds, false);
  }, [workSeconds, saveState]);

  const pause = useCallback(() => {
    setState("paused");
    saveState("paused", remainingSeconds, isBreakTime);
  }, [remainingSeconds, saveState, isBreakTime]);

  const resume = useCallback(() => {
    setState(isBreakTime ? "break" : "running");
    saveState(isBreakTime ? "break" : "running", remainingSeconds, isBreakTime);
  }, [remainingSeconds, saveState, isBreakTime]);

  const reset = useCallback(() => {
    hasAutoStartedRef.current = false;
    setState("idle");
    setRemainingSeconds(workSeconds);
    setIsBreakTime(false);
    localStorage.removeItem(STORAGE_KEY);
  }, [workSeconds]);

  const skipBreak = useCallback(() => {
    if (isBreakTime) {
      setState("idle");
      setIsBreakTime(false);
      setRemainingSeconds(workSeconds);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [isBreakTime, workSeconds]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const newValue = !prev;
      localStorage.setItem("neurozen-timer-muted", String(newValue));
      return newValue;
    });
  }, []);

  const testSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
      
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        }
      }, 300);
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        }
      }, 600);
    }
  }, []);

  const totalSeconds = isBreakTime ? breakSeconds : workSeconds;
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
    skipBreak,
    isInWorkBlock,
    currentBlockName,
    isMuted,
    toggleMute,
    completedIntervals,
    isBreakTime,
    testSound,
  };
}
