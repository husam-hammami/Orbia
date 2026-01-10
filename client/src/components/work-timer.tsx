import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, Volume2, VolumeX, SkipForward, Bell, Timer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useWorkTimer } from "@/hooks/use-work-timer";
import { cn } from "@/lib/utils";

const WORK_SESSION_MINUTES = 45;
const BREAK_DURATION_MINUTES = 5;
const AUTO_START_STORAGE_KEY = "neurozen-timer-autostart";

export function WorkTimer() {
  const [isExpanded, setIsExpanded] = useState(false);
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
    skipBreak,
    isMuted,
    toggleMute,
    completedIntervals,
    isBreakTime,
    testSound,
    isInWorkBlock,
    currentBlockName,
  } = useWorkTimer({
    durationMinutes: WORK_SESSION_MINUTES,
    breakDurationMinutes: BREAK_DURATION_MINUTES,
    autoStartEnabled,
  });

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeDisplay = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  const isActive = state === "running" || state === "break";

  const getStateConfig = () => {
    if (isBreakTime) return {
      label: "Break",
      ringColor: "stroke-emerald-400",
      orbGradient: "from-emerald-400 to-teal-500",
      glowColor: "rgba(16, 185, 129, 0.4)",
      textColor: "text-emerald-500",
    };
    switch (state) {
      case "running": return {
        label: "Focus",
        ringColor: "stroke-teal-500",
        orbGradient: "from-teal-400 to-teal-600",
        glowColor: "rgba(20, 184, 166, 0.4)",
        textColor: "text-teal-600",
      };
      case "paused": return {
        label: "Paused",
        ringColor: "stroke-amber-400",
        orbGradient: "from-amber-400 to-orange-500",
        glowColor: "rgba(245, 158, 11, 0.4)",
        textColor: "text-amber-500",
      };
      default: return {
        label: "Ready",
        ringColor: "stroke-slate-300",
        orbGradient: "from-slate-400 to-slate-500",
        glowColor: "rgba(100, 116, 139, 0.2)",
        textColor: "text-slate-500",
      };
    }
  };

  const config = getStateConfig();

  return (
    <motion.div
      layout
      className="relative"
      data-testid="work-timer-container"
    >
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="cursor-pointer"
            onClick={() => setIsExpanded(true)}
          >
            <motion.div 
              className={cn(
                "relative flex items-center gap-3 h-11 px-4 rounded-2xl",
                "bg-gradient-to-r from-white/70 via-white/50 to-teal-50/40",
                "backdrop-blur-xl border border-teal-200/40",
                "shadow-[0_8px_30px_-8px_rgba(15,118,110,0.15)]",
                "hover:shadow-[0_8px_30px_-4px_rgba(15,118,110,0.25)] hover:border-teal-300/50",
                "transition-all duration-300"
              )}
              animate={isActive ? {
                boxShadow: [
                  "0 8px 30px -8px rgba(20, 184, 166, 0.2)",
                  "0 8px 40px -4px rgba(20, 184, 166, 0.35)",
                  "0 8px 30px -8px rgba(20, 184, 166, 0.2)",
                ]
              } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="relative w-8 h-8">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 32 32">
                  <circle
                    cx="16" cy="16" r="13"
                    fill="none" strokeWidth="2"
                    className="stroke-slate-200/60"
                  />
                  <motion.circle
                    cx="16" cy="16" r="13"
                    fill="none" strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray={81.68}
                    strokeDashoffset={81.68 - (progress / 100) * 81.68}
                    className={config.ringColor}
                  />
                </svg>
                
                <div className={cn(
                  "absolute inset-1.5 rounded-full flex items-center justify-center",
                  "bg-gradient-to-br",
                  config.orbGradient
                )}>
                  <Timer className="w-3 h-3 text-white" />
                </div>
              </div>

              <div className="flex flex-col leading-tight">
                <span className={cn(
                  "font-mono text-base font-semibold tabular-nums",
                  config.textColor
                )} data-testid="timer-display">
                  {timeDisplay}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {config.label}
                </span>
              </div>

              {completedIntervals > 0 && (
                <div className="flex items-center gap-0.5 ml-1">
                  {Array.from({ length: Math.min(completedIntervals, 4) }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-teal-400 to-teal-600"
                    />
                  ))}
                  {completedIntervals > 4 && (
                    <span className="text-[10px] text-slate-400 ml-0.5">
                      +{completedIntervals - 4}
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className="relative"
          >
            <motion.div 
              className={cn(
                "relative w-80 p-6 rounded-3xl",
                "bg-gradient-to-br from-white/80 via-white/60 to-teal-50/50",
                "backdrop-blur-2xl border border-teal-200/40",
                "shadow-[0_20px_50px_-12px_rgba(15,118,110,0.25)]"
              )}
            >
              <button
                onClick={() => setIsExpanded(false)}
                className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-100/80 hover:bg-slate-200/80 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors"
                data-testid="timer-close-button"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-center mb-6">
                <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Focus Timer</h3>
              </div>

              <div className="relative w-40 h-40 mx-auto mb-6">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                  <circle
                    cx="80" cy="80" r="70"
                    fill="none" strokeWidth="4"
                    className="stroke-slate-200/50"
                  />
                  <motion.circle
                    cx="80" cy="80" r="70"
                    fill="none" strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={439.82}
                    strokeDashoffset={439.82 - (progress / 100) * 439.82}
                    className={config.ringColor}
                    style={{ filter: `drop-shadow(0 0 8px ${config.glowColor})` }}
                  />
                </svg>

                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    className={cn(
                      "w-28 h-28 rounded-full flex flex-col items-center justify-center",
                      "bg-gradient-to-br",
                      config.orbGradient,
                      "shadow-lg"
                    )}
                    animate={isActive ? {
                      scale: [1, 1.02, 1],
                    } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{ boxShadow: `0 8px 30px -4px ${config.glowColor}` }}
                  >
                    <span className="text-2xl font-bold text-white font-mono tabular-nums">
                      {timeDisplay}
                    </span>
                    <span className="text-xs text-white/80 font-medium uppercase tracking-wider">
                      {config.label}
                    </span>
                  </motion.div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 mb-4">
                {state === "idle" && (
                  <Button
                    onClick={start}
                    className={cn(
                      "h-11 px-8 rounded-full",
                      "bg-gradient-to-r from-teal-500 to-teal-600",
                      "hover:from-teal-600 hover:to-teal-700",
                      "border-0 text-white font-semibold",
                      "shadow-[0_4px_20px_-4px_rgba(20,184,166,0.5)]",
                      "transition-all duration-300"
                    )}
                    data-testid="timer-start-button"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start Focus
                  </Button>
                )}

                {state === "running" && (
                  <Button
                    onClick={pause}
                    variant="outline"
                    className="h-11 px-6 rounded-full border-teal-400/60 text-teal-600 hover:bg-teal-50/50 hover:border-teal-500"
                    data-testid="timer-pause-button"
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </Button>
                )}

                {state === "break" && (
                  <Button
                    onClick={skipBreak}
                    variant="outline"
                    className="h-11 px-6 rounded-full border-emerald-400/60 text-emerald-600 hover:bg-emerald-50/50"
                    data-testid="timer-skip-break-button"
                  >
                    <SkipForward className="w-4 h-4 mr-2" />
                    Skip Break
                  </Button>
                )}

                {state === "paused" && (
                  <>
                    <Button
                      onClick={resume}
                      className={cn(
                        "h-11 px-6 rounded-full",
                        "bg-gradient-to-r from-teal-500 to-teal-600",
                        "hover:from-teal-600 hover:to-teal-700",
                        "border-0 text-white font-semibold",
                        "shadow-[0_4px_20px_-4px_rgba(20,184,166,0.5)]"
                      )}
                      data-testid="timer-resume-button"
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Resume
                    </Button>
                    <Button
                      onClick={reset}
                      variant="ghost"
                      className="h-11 w-11 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                      data-testid="timer-reset-button"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </>
                )}

                <Button
                  onClick={toggleMute}
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-9 w-9 rounded-full",
                    isMuted ? "text-red-400 hover:text-red-500" : "text-slate-400 hover:text-slate-600"
                  )}
                  data-testid="timer-mute-button"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>

                <Button
                  onClick={testSound}
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full text-slate-400 hover:text-teal-600"
                  data-testid="timer-test-sound-button"
                  title="Test notification sound"
                >
                  <Bell className="w-4 h-4" />
                </Button>
              </div>

              {completedIntervals > 0 && (
                <div className="text-center mb-4">
                  <span className="text-xs text-slate-500 font-medium">
                    {completedIntervals} session{completedIntervals !== 1 ? "s" : ""} completed
                  </span>
                </div>
              )}

              <div className="pt-4 border-t border-slate-200/60 space-y-3">
                {isInWorkBlock && currentBlockName && (
                  <div className="flex items-center justify-center gap-2 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                    <span className="text-slate-500">
                      In <span className="font-medium text-slate-700">{currentBlockName}</span> block
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Auto-start in work blocks</span>
                  <Switch
                    checked={autoStartEnabled}
                    onCheckedChange={setAutoStartEnabled}
                    className="data-[state=checked]:bg-teal-500"
                    data-testid="timer-autostart-toggle"
                  />
                </div>
                <p className="text-[10px] text-slate-400 text-center">
                  9-13h & 14-18h from routine
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
