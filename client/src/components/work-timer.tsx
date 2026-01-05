import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, Volume2, VolumeX, Settings2 } from "lucide-react";
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
  const [isHovered, setIsHovered] = useState(false);

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
    isMuted,
    toggleMute,
  } = useWorkTimer({
    durationMinutes: WORK_SESSION_MINUTES,
    autoStartEnabled,
  });

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeDisplay = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  const circumference = 2 * Math.PI * 18;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const getStrokeColor = () => {
    switch (state) {
      case "running": return "stroke-primary";
      case "paused": return "stroke-amber-500";
      case "completed": return "stroke-violet-500";
      default: return "stroke-muted-foreground/40";
    }
  };

  const showControls = isHovered || state !== "idle";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid="work-timer-container"
    >
      <div className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-200",
        state === "running" 
          ? "bg-primary/10 border-primary/30" 
          : state === "paused"
          ? "bg-amber-50 border-amber-200"
          : state === "completed"
          ? "bg-violet-50 border-violet-200"
          : "bg-muted/30 border-border/50 hover:bg-muted/50"
      )}>
        <div className="relative w-10 h-10 flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
            <circle
              cx="20" cy="20" r="18"
              fill="none" stroke="currentColor" strokeWidth="3"
              className="text-muted/20"
            />
            <motion.circle
              cx="20" cy="20" r="18"
              fill="none" strokeWidth="3" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className={getStrokeColor()}
              initial={false}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.3 }}
            />
          </svg>
          {state === "running" && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            </motion.div>
          )}
        </div>

        <span className={cn(
          "font-mono text-lg font-semibold tabular-nums",
          state === "running" ? "text-primary" :
          state === "paused" ? "text-amber-600" :
          state === "completed" ? "text-violet-600" :
          "text-muted-foreground"
        )} data-testid="timer-display">
          {timeDisplay}
        </span>

        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-1 overflow-hidden"
            >
              {state === "idle" && (
                <Button
                  onClick={start}
                  size="sm"
                  className="h-7 px-2.5 text-xs bg-primary hover:bg-primary/90"
                  data-testid="timer-start-button"
                >
                  <Play className="w-3 h-3 mr-1" />
                  Start
                </Button>
              )}

              {state === "running" && (
                <Button
                  onClick={pause}
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-amber-600 hover:bg-amber-100"
                  data-testid="timer-pause-button"
                >
                  <Pause className="w-3.5 h-3.5" />
                </Button>
              )}

              {state === "paused" && (
                <>
                  <Button
                    onClick={resume}
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-primary hover:bg-primary/10"
                    data-testid="timer-resume-button"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    onClick={reset}
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground"
                    data-testid="timer-reset-button"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </Button>
                </>
              )}

              {state === "completed" && (
                <Button
                  onClick={reset}
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-violet-600 hover:bg-violet-100"
                  data-testid="timer-restart-button"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Again
                </Button>
              )}

              <div className="h-4 w-px bg-border/50 mx-0.5" />

              <Button
                onClick={toggleMute}
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-muted-foreground"
                data-testid="timer-mute-button"
              >
                {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-muted-foreground"
                    data-testid="timer-settings-button"
                  >
                    <Settings2 className="w-3 h-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56" align="end">
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Timer Settings</h4>
                    <div className="flex items-center justify-between gap-2">
                      <label htmlFor="auto-start" className="text-xs text-muted-foreground">
                        Auto-start in work blocks
                      </label>
                      <Switch
                        id="auto-start"
                        checked={autoStartEnabled}
                        onCheckedChange={setAutoStartEnabled}
                        data-testid="timer-autostart-switch"
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {state === "completed" && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -right-2 -top-2 text-sm"
        >
          🎉
        </motion.span>
      )}
    </motion.div>
  );
}
