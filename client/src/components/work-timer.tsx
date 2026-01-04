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

  const circumference = 2 * Math.PI * 28;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const getStateColor = () => {
    switch (state) {
      case "running":
        return "text-primary";
      case "paused":
        return "text-amber-600";
      case "completed":
        return "text-violet-600";
      default:
        return "text-muted-foreground";
    }
  };

  const getStrokeColor = () => {
    switch (state) {
      case "running":
        return "stroke-primary";
      case "paused":
        return "stroke-amber-500";
      case "completed":
        return "stroke-violet-500";
      default:
        return "stroke-muted-foreground/30";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3"
      data-testid="work-timer-container"
    >
      <div className={cn(
        "flex items-center gap-3 px-4 py-2.5 rounded-xl border bg-card/80 backdrop-blur-sm shadow-sm",
        state === "running" && "border-primary/30 bg-primary/5"
      )}>
        <div className="relative w-14 h-14 flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-muted/20"
            />
            <motion.circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className={getStrokeColor()}
              initial={false}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            {state === "running" ? (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-primary"
              />
            ) : state === "completed" ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="text-violet-500"
              >
                ✓
              </motion.div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col min-w-[80px]">
          <motion.span
            className={cn("font-mono text-2xl font-bold tracking-tight leading-none", getStateColor())}
            data-testid="timer-display"
          >
            {timeDisplay}
          </motion.span>
          <span className="text-[10px] text-muted-foreground mt-0.5">
            {isInWorkBlock ? (
              <span className="flex items-center gap-1 text-primary">
                <Zap className="w-2.5 h-2.5" />
                {currentBlockName}
              </span>
            ) : state === "running" ? (
              "Focus mode"
            ) : state === "paused" ? (
              "Paused"
            ) : state === "completed" ? (
              "Complete!"
            ) : (
              <span className="flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                Ready
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-1 ml-1">
          {state === "idle" && (
            <Button
              onClick={start}
              size="sm"
              className="h-8 px-3 bg-primary hover:bg-primary/90 text-primary-foreground"
              data-testid="timer-start-button"
            >
              <Play className="w-3.5 h-3.5 mr-1" />
              Start
            </Button>
          )}

          {state === "running" && (
            <Button
              onClick={pause}
              size="sm"
              variant="outline"
              className="h-8 px-3 border-amber-500/30 text-amber-600 hover:bg-amber-50"
              data-testid="timer-pause-button"
            >
              <Pause className="w-3.5 h-3.5 mr-1" />
              Pause
            </Button>
          )}

          {state === "paused" && (
            <>
              <Button
                onClick={resume}
                size="sm"
                className="h-8 px-3 bg-primary hover:bg-primary/90 text-primary-foreground"
                data-testid="timer-resume-button"
              >
                <Play className="w-3.5 h-3.5" />
              </Button>
              <Button
                onClick={reset}
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                data-testid="timer-reset-button"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            </>
          )}

          {state === "completed" && (
            <Button
              onClick={reset}
              size="sm"
              variant="outline"
              className="h-8 px-3 border-violet-500/30 text-violet-600 hover:bg-violet-50"
              data-testid="timer-restart-button"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Again
            </Button>
          )}

          <div className="flex items-center border-l border-border/50 ml-1 pl-1">
            <Button
              onClick={toggleMute}
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              data-testid="timer-mute-button"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  data-testid="timer-settings-button"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="end">
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Timer Settings</h4>
                  <div className="flex items-center justify-between">
                    <label htmlFor="auto-start" className="text-sm text-muted-foreground">
                      Auto-start in work blocks
                    </label>
                    <Switch
                      id="auto-start"
                      checked={autoStartEnabled}
                      onCheckedChange={setAutoStartEnabled}
                      data-testid="timer-autostart-switch"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Auto-starts during Work Block 1 (9am-1pm) or Work Block 2 (2pm-6pm)
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
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="text-lg"
          >
            🎉
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
