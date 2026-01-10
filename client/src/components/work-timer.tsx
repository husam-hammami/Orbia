import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, Volume2, VolumeX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useWorkTimer } from "@/hooks/use-work-timer";
import { cn } from "@/lib/utils";

const DURATION_OPTIONS = [15, 25, 45, 60];
const AUTO_START_STORAGE_KEY = "neurozen-timer-autostart";
const DURATION_STORAGE_KEY = "neurozen-timer-duration";

export function WorkTimer() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(() => {
    const stored = localStorage.getItem(DURATION_STORAGE_KEY);
    return stored ? parseInt(stored) : 25;
  });
  const [autoStartEnabled, setAutoStartEnabled] = useState(() => {
    const stored = localStorage.getItem(AUTO_START_STORAGE_KEY);
    return stored === "true";
  });

  useEffect(() => {
    localStorage.setItem(AUTO_START_STORAGE_KEY, String(autoStartEnabled));
  }, [autoStartEnabled]);

  useEffect(() => {
    localStorage.setItem(DURATION_STORAGE_KEY, String(selectedDuration));
  }, [selectedDuration]);

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
  } = useWorkTimer({
    durationMinutes: selectedDuration,
    breakDurationMinutes: 5,
    autoStartEnabled,
  });

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeDisplay = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  const isActive = state === "running" || state === "break";
  const isIdle = state === "idle";
  const isPaused = state === "paused";

  const handleCoreClick = useCallback(() => {
    if (isIdle) {
      start();
    } else if (state === "running") {
      pause();
    } else if (isPaused) {
      resume();
    } else if (isBreakTime) {
      skipBreak();
    }
  }, [isIdle, state, isPaused, isBreakTime, start, pause, resume, skipBreak]);

  const getCoreColors = () => {
    if (isBreakTime) return {
      primary: "from-emerald-400 via-teal-400 to-cyan-400",
      glow: "rgba(16, 185, 129, 0.6)",
      ring: "#10b981",
    };
    if (state === "running") return {
      primary: "from-cyan-400 via-teal-400 to-emerald-400",
      glow: "rgba(20, 184, 166, 0.6)",
      ring: "#14b8a6",
    };
    if (isPaused) return {
      primary: "from-amber-400 via-orange-400 to-yellow-400",
      glow: "rgba(251, 191, 36, 0.5)",
      ring: "#f59e0b",
    };
    return {
      primary: "from-slate-400 via-slate-300 to-slate-400",
      glow: "rgba(148, 163, 184, 0.3)",
      ring: "#94a3b8",
    };
  };

  const colors = getCoreColors();

  return (
    <motion.div layout className="relative" data-testid="work-timer-container">
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="cursor-pointer"
            onClick={() => setIsExpanded(true)}
          >
            <motion.div 
              className={cn(
                "relative w-16 h-16 rounded-full",
                "bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90",
                "backdrop-blur-xl border border-cyan-500/20",
                "shadow-[0_0_30px_-5px_rgba(6,182,212,0.3),inset_0_1px_1px_rgba(255,255,255,0.1)]",
                "flex items-center justify-center"
              )}
              animate={isActive ? {
                boxShadow: [
                  "0 0 30px -5px rgba(20, 184, 166, 0.3), inset 0 1px 1px rgba(255,255,255,0.1)",
                  "0 0 50px -5px rgba(20, 184, 166, 0.5), inset 0 1px 1px rgba(255,255,255,0.1)",
                  "0 0 30px -5px rgba(20, 184, 166, 0.3), inset 0 1px 1px rgba(255,255,255,0.1)",
                ]
              } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" strokeWidth="2" className="stroke-slate-700/50" />
                <motion.circle
                  cx="32" cy="32" r="28"
                  fill="none" strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={175.93}
                  strokeDashoffset={175.93 - (progress / 100) * 175.93}
                  stroke={colors.ring}
                  style={{ filter: `drop-shadow(0 0 6px ${colors.glow})` }}
                />
              </svg>
              
              <motion.div
                className={cn(
                  "w-10 h-10 rounded-full",
                  "bg-gradient-to-br",
                  colors.primary,
                  "flex items-center justify-center"
                )}
                animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
                style={{ boxShadow: `0 0 20px ${colors.glow}` }}
              >
                <span className="font-mono text-[10px] font-bold text-white tabular-nums">
                  {minutes}:{seconds.toString().padStart(2, "0")}
                </span>
              </motion.div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <motion.div 
              className={cn(
                "relative w-72 p-6 rounded-3xl overflow-hidden",
                "bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95",
                "backdrop-blur-2xl border border-cyan-500/20",
                "shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5),0_0_40px_-10px_rgba(6,182,212,0.3)]"
              )}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(20,184,166,0.15),transparent_50%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(6,182,212,0.1),transparent_50%)]" />
              
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 rounded-full bg-cyan-400/40"
                  style={{
                    left: `${20 + Math.random() * 60}%`,
                    top: `${20 + Math.random() * 60}%`,
                  }}
                  animate={{
                    y: [0, -20, 0],
                    opacity: [0.2, 0.6, 0.2],
                  }}
                  transition={{
                    duration: 3 + Math.random() * 2,
                    delay: i * 0.5,
                    repeat: Infinity,
                  }}
                />
              ))}

              <button
                onClick={() => setIsExpanded(false)}
                className="absolute top-3 right-3 z-10 w-6 h-6 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-slate-600/50"
                data-testid="timer-close-button"
              >
                <X className="w-3 h-3" />
              </button>

              <div className="relative mb-6">
                <div className="relative w-44 h-44 mx-auto">
                  {DURATION_OPTIONS.map((duration, i) => {
                    const angle = -90 + (i * 90);
                    const isSelected = selectedDuration === duration;
                    const x = Math.cos((angle * Math.PI) / 180) * 75;
                    const y = Math.sin((angle * Math.PI) / 180) * 75;
                    
                    return (
                      <motion.button
                        key={duration}
                        className={cn(
                          "absolute w-10 h-10 rounded-full flex items-center justify-center",
                          "font-mono text-xs font-bold transition-all duration-300",
                          "border",
                          isSelected
                            ? "bg-gradient-to-br from-cyan-400 to-teal-500 text-white border-cyan-300/50 shadow-[0_0_20px_rgba(6,182,212,0.5)]"
                            : "bg-slate-800/80 text-slate-400 border-slate-600/50 hover:border-cyan-500/50 hover:text-cyan-400"
                        )}
                        style={{
                          left: "50%",
                          top: "50%",
                          marginLeft: "-20px",
                          marginTop: "-20px",
                          transform: `translate(${x}px, ${y}px)`,
                        }}
                        onClick={() => isIdle && setSelectedDuration(duration)}
                        disabled={!isIdle}
                        whileHover={isIdle ? { scale: 1.1 } : {}}
                        whileTap={isIdle ? { scale: 0.95 } : {}}
                        data-testid={`duration-${duration}`}
                      >
                        {duration}
                      </motion.button>
                    );
                  })}

                  <svg className="absolute inset-6 w-32 h-32 -rotate-90" viewBox="0 0 128 128">
                    <circle
                      cx="64" cy="64" r="56"
                      fill="none" strokeWidth="2"
                      className="stroke-slate-700/30"
                      strokeDasharray="4 4"
                    />
                    <motion.circle
                      cx="64" cy="64" r="56"
                      fill="none" strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={351.86}
                      strokeDashoffset={351.86 - (progress / 100) * 351.86}
                      stroke={colors.ring}
                      style={{ filter: `drop-shadow(0 0 8px ${colors.glow})` }}
                    />
                  </svg>

                  <motion.button
                    className={cn(
                      "absolute inset-6 w-32 h-32 rounded-full",
                      "bg-gradient-to-br",
                      colors.primary,
                      "flex flex-col items-center justify-center",
                      "cursor-pointer transition-all",
                      "border border-white/20"
                    )}
                    onClick={handleCoreClick}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    animate={isActive ? {
                      boxShadow: [
                        `0 0 30px ${colors.glow}, inset 0 0 30px rgba(255,255,255,0.1)`,
                        `0 0 50px ${colors.glow}, inset 0 0 40px rgba(255,255,255,0.15)`,
                        `0 0 30px ${colors.glow}, inset 0 0 30px rgba(255,255,255,0.1)`,
                      ]
                    } : {
                      boxShadow: `0 0 20px ${colors.glow}, inset 0 0 20px rgba(255,255,255,0.1)`
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{
                      boxShadow: `0 0 30px ${colors.glow}, inset 0 0 30px rgba(255,255,255,0.1)`,
                    }}
                    data-testid="timer-core-button"
                  >
                    <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/20 via-transparent to-transparent" />
                    
                    <span className="relative font-mono text-2xl font-bold text-white tabular-nums drop-shadow-lg">
                      {timeDisplay}
                    </span>
                    
                    {isIdle && (
                      <motion.div
                        className="relative mt-1"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <Play className="w-5 h-5 text-white/90 fill-white/90" />
                      </motion.div>
                    )}
                    {state === "running" && (
                      <Pause className="relative w-5 h-5 text-white/80 mt-1" />
                    )}
                    {isPaused && (
                      <Play className="relative w-5 h-5 text-white/80 fill-white/80 mt-1" />
                    )}
                  </motion.button>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 mb-4">
                <Button
                  onClick={reset}
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full text-slate-400 hover:text-white hover:bg-slate-700/50"
                  data-testid="timer-reset-button"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                
                <Button
                  onClick={toggleMute}
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-9 w-9 rounded-full",
                    isMuted ? "text-red-400 hover:text-red-300" : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                  )}
                  data-testid="timer-mute-button"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>

                {completedIntervals > 0 && (
                  <div className="flex items-center gap-1 ml-2">
                    {Array.from({ length: Math.min(completedIntervals, 5) }).map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 rounded-full bg-gradient-to-br from-cyan-400 to-teal-500"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        style={{ boxShadow: "0 0 8px rgba(6,182,212,0.6)" }}
                      />
                    ))}
                    {completedIntervals > 5 && (
                      <span className="text-xs text-slate-500 ml-1">+{completedIntervals - 5}</span>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-700/50">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Auto-start</span>
                  <Switch
                    checked={autoStartEnabled}
                    onCheckedChange={setAutoStartEnabled}
                    className="data-[state=checked]:bg-cyan-500 scale-75"
                    data-testid="timer-autostart-toggle"
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
