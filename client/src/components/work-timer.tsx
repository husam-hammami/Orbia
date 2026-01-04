import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, Volume2, VolumeX, Clock, Zap, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useWorkTimer } from "@/hooks/use-work-timer";
import { cn } from "@/lib/utils";

const WORK_SESSION_MINUTES = 45;
const AUTO_START_STORAGE_KEY = "neurozen-timer-autostart";

export function WorkTimer() {
  const [autoStartEnabled, setAutoStartEnabled] = useState(() => {
    const stored = localStorage.getItem(AUTO_START_STORAGE_KEY);
    return stored === "true";
  });

  useEffect(() => {
    localStorage.setItem(AUTO_START_STORAGE_KEY, String(autoStartEnabled));
  }, [autoStartEnabled]);

  const {
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
  } = useWorkTimer({
    durationMinutes: WORK_SESSION_MINUTES,
    autoStartEnabled,
  });

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeDisplay = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  const circumference = 2 * Math.PI * 90;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const getStateColor = () => {
    switch (state) {
      case "running":
        return "text-emerald-500";
      case "paused":
        return "text-amber-500";
      case "completed":
        return "text-violet-500";
      default:
        return "text-slate-400";
    }
  };

  const getGradientColors = () => {
    switch (state) {
      case "running":
        return { from: "#10b981", to: "#3b82f6" };
      case "paused":
        return { from: "#f59e0b", to: "#ef4444" };
      case "completed":
        return { from: "#8b5cf6", to: "#ec4899" };
      default:
        return { from: "#64748b", to: "#94a3b8" };
    }
  };

  const colors = getGradientColors();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: -20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="relative"
      data-testid="work-timer-container"
    >
      <div className={cn(
        "relative bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-slate-700/50",
        state === "running" && "ring-2 ring-emerald-500/30"
      )}>
        {state === "running" && (
          <motion.div
            className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-blue-500/10"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}

        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-medium">
            {isInWorkBlock ? (
              <motion.div
                className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/20 text-emerald-400 rounded-full"
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Zap className="w-3 h-3" />
                <span>{currentBlockName}</span>
              </motion.div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-700/50 text-slate-400 rounded-full">
                <Clock className="w-3 h-3" />
                <span>Outside work hours</span>
              </div>
            )}
          </div>

          <div className="relative w-48 h-48">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
              <defs>
                <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={colors.from} />
                  <stop offset="100%" stopColor={colors.to} />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <circle
                cx="100"
                cy="100"
                r="90"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-slate-700/30"
              />

              <motion.circle
                cx="100"
                cy="100"
                r="90"
                fill="none"
                stroke="url(#timerGradient)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                filter="url(#glow)"
                initial={false}
                animate={{ strokeDashoffset }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                className={cn("font-mono text-4xl font-bold tracking-tight", getStateColor())}
                animate={state === "running" ? { scale: [1, 1.02, 1] } : {}}
                transition={{ duration: 1, repeat: Infinity }}
                data-testid="timer-display"
              >
                {timeDisplay}
              </motion.span>
              <span className="text-xs text-slate-500 mt-1">
                {state === "idle" && "Ready to focus"}
                {state === "running" && "In focus mode"}
                {state === "paused" && "Paused"}
                {state === "completed" && "Session complete!"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {state === "idle" && (
              <Button
                onClick={start}
                size="sm"
                className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white shadow-lg"
                data-testid="timer-start-button"
              >
                <Play className="w-4 h-4 mr-1.5" />
                Start Focus
              </Button>
            )}

            {state === "running" && (
              <Button
                onClick={pause}
                size="sm"
                variant="secondary"
                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border-amber-500/30"
                data-testid="timer-pause-button"
              >
                <Pause className="w-4 h-4 mr-1.5" />
                Pause
              </Button>
            )}

            {state === "paused" && (
              <>
                <Button
                  onClick={resume}
                  size="sm"
                  className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white"
                  data-testid="timer-resume-button"
                >
                  <Play className="w-4 h-4 mr-1.5" />
                  Resume
                </Button>
                <Button
                  onClick={reset}
                  size="sm"
                  variant="ghost"
                  className="text-slate-400 hover:text-slate-300"
                  data-testid="timer-reset-button"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </>
            )}

            {state === "completed" && (
              <Button
                onClick={reset}
                size="sm"
                className="bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 text-white"
                data-testid="timer-restart-button"
              >
                <RotateCcw className="w-4 h-4 mr-1.5" />
                New Session
              </Button>
            )}

            <Button
              onClick={toggleMute}
              size="sm"
              variant="ghost"
              className="text-slate-400 hover:text-slate-300"
              data-testid="timer-mute-button"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-slate-400 hover:text-slate-300"
                  data-testid="timer-settings-button"
                >
                  <Settings2 className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 bg-slate-900/95 border-slate-700/50" align="end">
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-slate-200">Timer Settings</h4>
                  <div className="flex items-center justify-between">
                    <label htmlFor="auto-start" className="text-sm text-slate-400">
                      Auto-start during work blocks
                    </label>
                    <Switch
                      id="auto-start"
                      checked={autoStartEnabled}
                      onCheckedChange={setAutoStartEnabled}
                      data-testid="timer-autostart-switch"
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Automatically starts when entering Work Block 1 (9am-1pm) or Work Block 2 (2pm-6pm)
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {state === "completed" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute -inset-4 pointer-events-none"
          >
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-gradient-to-r from-violet-500 to-pink-500"
                initial={{
                  left: "50%",
                  top: "50%",
                  scale: 0,
                }}
                animate={{
                  left: `${50 + Math.cos((i * Math.PI * 2) / 12) * 60}%`,
                  top: `${50 + Math.sin((i * Math.PI * 2) / 12) * 60}%`,
                  scale: [0, 1, 0],
                }}
                transition={{
                  duration: 1.5,
                  delay: i * 0.05,
                  repeat: Infinity,
                  repeatDelay: 2,
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
