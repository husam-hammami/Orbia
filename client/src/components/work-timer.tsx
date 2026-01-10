import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, Square, Volume2, VolumeX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const DURATION_OPTIONS = [15, 25, 45, 60];
const AUTO_START_STORAGE_KEY = "neurozen-timer-autostart";
const DURATION_STORAGE_KEY = "neurozen-timer-duration";
const TIMER_STATE_KEY = "neurozen-work-timer";

type TimerState = "idle" | "running" | "paused";

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

  const [state, setState] = useState<TimerState>("idle");
  const [remainingSeconds, setRemainingSeconds] = useState(selectedDuration * 60);
  const [completedIntervals, setCompletedIntervals] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    localStorage.setItem(AUTO_START_STORAGE_KEY, String(autoStartEnabled));
  }, [autoStartEnabled]);

  useEffect(() => {
    localStorage.setItem(DURATION_STORAGE_KEY, String(selectedDuration));
    if (state === "idle") {
      setRemainingSeconds(selectedDuration * 60);
    }
  }, [selectedDuration, state]);

  // Timer countdown
  useEffect(() => {
    if (state === "running") {
      intervalRef.current = setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            setState("idle");
            setCompletedIntervals(c => c + 1);
            return selectedDuration * 60;
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
  }, [state, selectedDuration]);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeDisplay = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  const totalSeconds = selectedDuration * 60;
  const progress = ((totalSeconds - remainingSeconds) / totalSeconds) * 100;

  const isIdle = state === "idle";
  const isRunning = state === "running";
  const isPaused = state === "paused";

  const handleStart = useCallback(() => {
    setState("running");
  }, []);

  const handlePause = useCallback(() => {
    setState("paused");
  }, []);

  const handleResume = useCallback(() => {
    setState("running");
  }, []);

  const handleStop = useCallback(() => {
    setState("idle");
    setRemainingSeconds(selectedDuration * 60);
  }, [selectedDuration]);

  const handleReset = useCallback(() => {
    setState("idle");
    setRemainingSeconds(selectedDuration * 60);
    localStorage.removeItem(TIMER_STATE_KEY);
  }, [selectedDuration]);

  const handleDurationSelect = useCallback((duration: number) => {
    if (state === "idle") {
      setSelectedDuration(duration);
      setRemainingSeconds(duration * 60);
    }
  }, [state]);

  const getCoreColors = () => {
    if (isRunning) return {
      primary: "from-cyan-400 via-teal-400 to-emerald-400",
      glow: "rgba(20, 184, 166, 0.5)",
      orbitColor: "#14b8a6",
    };
    if (isPaused) return {
      primary: "from-amber-400 via-orange-400 to-yellow-400",
      glow: "rgba(251, 191, 36, 0.4)",
      orbitColor: "#f59e0b",
    };
    return {
      primary: "from-teal-500 via-cyan-500 to-teal-400",
      glow: "rgba(20, 184, 166, 0.3)",
      orbitColor: "#14b8a6",
    };
  };

  const colors = getCoreColors();
  const orbitRadius = 90;

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
            <div className="relative w-20 h-20">
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="35" fill="none" strokeWidth="1" className="stroke-teal-500/20" />
                <motion.circle
                  cx="40" cy="40" r="35"
                  fill="none" strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray={219.91}
                  strokeDashoffset={219.91 - (progress / 100) * 219.91}
                  stroke={colors.orbitColor}
                  style={{ filter: `drop-shadow(0 0 4px ${colors.glow})` }}
                />
              </svg>

              <motion.div
                className="absolute w-2 h-2 rounded-full bg-gradient-to-r from-cyan-400 to-teal-400"
                style={{
                  left: "50%",
                  top: "50%",
                  marginLeft: "-4px",
                  marginTop: "-4px",
                  boxShadow: `0 0 8px ${colors.glow}`,
                }}
                animate={{
                  x: Math.cos(((progress / 100) * 360 - 90) * (Math.PI / 180)) * 35,
                  y: Math.sin(((progress / 100) * 360 - 90) * (Math.PI / 180)) * 35,
                }}
              />

              <motion.div 
                className={cn(
                  "absolute inset-3 rounded-full flex items-center justify-center",
                  "bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95",
                  "border border-teal-500/30"
                )}
                animate={isRunning ? {
                  boxShadow: [
                    `0 0 15px ${colors.glow}, inset 0 0 10px rgba(20,184,166,0.1)`,
                    `0 0 25px ${colors.glow}, inset 0 0 15px rgba(20,184,166,0.15)`,
                    `0 0 15px ${colors.glow}, inset 0 0 10px rgba(20,184,166,0.1)`,
                  ]
                } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <span className="font-mono text-xs font-bold text-teal-400 tabular-nums">
                  {minutes}:{seconds.toString().padStart(2, "0")}
                </span>
              </motion.div>
            </div>
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
                "relative w-80 p-6 rounded-3xl overflow-hidden",
                "bg-gradient-to-br from-slate-900/98 via-slate-800/95 to-slate-900/98",
                "backdrop-blur-2xl border border-teal-500/20",
                "shadow-[0_0_60px_-15px_rgba(20,184,166,0.4)]"
              )}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(20,184,166,0.12),transparent_60%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(6,182,212,0.08),transparent_50%)]" />
              
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 rounded-full bg-teal-400/50"
                  style={{
                    left: `${15 + Math.random() * 70}%`,
                    top: `${15 + Math.random() * 70}%`,
                  }}
                  animate={{
                    y: [0, -15 - Math.random() * 10, 0],
                    x: [0, (Math.random() - 0.5) * 10, 0],
                    opacity: [0.3, 0.7, 0.3],
                  }}
                  transition={{
                    duration: 3 + Math.random() * 2,
                    delay: i * 0.3,
                    repeat: Infinity,
                  }}
                />
              ))}

              <button
                onClick={() => setIsExpanded(false)}
                className="absolute top-3 right-3 z-20 w-7 h-7 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-slate-600/50"
                data-testid="timer-close-button"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="relative mb-6">
                <div className="relative w-52 h-52 mx-auto">
                  
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 208 208">
                    <circle cx="104" cy="104" r="100" fill="none" strokeWidth="0.5" className="stroke-teal-500/10" strokeDasharray="2 4" />
                  </svg>

                  {DURATION_OPTIONS.map((duration, i) => {
                    const angle = -90 + (i * 90);
                    const isSelected = selectedDuration === duration;
                    const x = Math.cos((angle * Math.PI) / 180) * orbitRadius;
                    const y = Math.sin((angle * Math.PI) / 180) * orbitRadius;
                    const canSelect = isIdle;
                    
                    return (
                      <button
                        key={duration}
                        className={cn(
                          "absolute w-11 h-11 rounded-full flex items-center justify-center z-10",
                          "font-mono text-sm font-bold transition-all duration-200",
                          "border-2",
                          isSelected
                            ? "bg-gradient-to-br from-teal-400 to-cyan-500 text-white border-teal-300/60 shadow-[0_0_25px_rgba(20,184,166,0.6)]"
                            : canSelect
                              ? "bg-slate-800/90 text-slate-400 border-slate-600/40 hover:border-teal-500/60 hover:text-teal-300 hover:shadow-[0_0_15px_rgba(20,184,166,0.3)] hover:scale-110 active:scale-95"
                              : "bg-slate-800/50 text-slate-600 border-slate-700/40 cursor-not-allowed"
                        )}
                        style={{
                          left: `calc(50% + ${x}px - 22px)`,
                          top: `calc(50% + ${y}px - 22px)`,
                        }}
                        onClick={() => canSelect && handleDurationSelect(duration)}
                        disabled={!canSelect}
                        data-testid={`duration-${duration}`}
                      >
                        {duration}
                      </button>
                    );
                  })}

                  <svg className="absolute inset-[26px] w-[156px] h-[156px] -rotate-90" viewBox="0 0 156 156">
                    <circle
                      cx="78" cy="78" r="70"
                      fill="none" strokeWidth="1.5"
                      className="stroke-slate-700/40"
                      strokeDasharray="3 6"
                    />
                    <motion.circle
                      cx="78" cy="78" r="70"
                      fill="none" strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={439.82}
                      strokeDashoffset={439.82 - (progress / 100) * 439.82}
                      stroke={colors.orbitColor}
                      style={{ filter: `drop-shadow(0 0 10px ${colors.glow})` }}
                    />
                    <motion.circle
                      cx={78 + 70 * Math.cos(((progress / 100) * 360 - 90) * (Math.PI / 180))}
                      cy={78 + 70 * Math.sin(((progress / 100) * 360 - 90) * (Math.PI / 180))}
                      r="4"
                      fill={colors.orbitColor}
                      style={{ filter: `drop-shadow(0 0 8px ${colors.glow})` }}
                    />
                  </svg>

                  <motion.div
                    className={cn(
                      "absolute inset-[38px] w-[132px] h-[132px] rounded-full",
                      "bg-gradient-to-br",
                      colors.primary,
                      "flex flex-col items-center justify-center gap-1",
                      "border-2 border-white/20"
                    )}
                    animate={isRunning ? {
                      boxShadow: [
                        `0 0 40px ${colors.glow}, inset 0 0 40px rgba(255,255,255,0.1)`,
                        `0 0 60px ${colors.glow}, inset 0 0 50px rgba(255,255,255,0.15)`,
                        `0 0 40px ${colors.glow}, inset 0 0 40px rgba(255,255,255,0.1)`,
                      ]
                    } : {
                      boxShadow: `0 0 30px ${colors.glow}, inset 0 0 30px rgba(255,255,255,0.1)`
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <div className="absolute inset-3 rounded-full bg-gradient-to-br from-white/25 via-transparent to-transparent" />
                    
                    <span className="relative font-mono text-3xl font-bold text-white tabular-nums drop-shadow-[0_2px_10px_rgba(0,0,0,0.3)]">
                      {timeDisplay}
                    </span>
                  </motion.div>
                </div>
              </div>

              {/* Control buttons */}
              <div className="flex items-center justify-center gap-3 mb-4">
                {isIdle && (
                  <Button
                    onClick={handleStart}
                    className="h-11 px-6 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold shadow-[0_0_20px_rgba(20,184,166,0.4)]"
                    data-testid="timer-start-button"
                  >
                    <Play className="w-4 h-4 mr-2 fill-white" />
                    Start
                  </Button>
                )}

                {isRunning && (
                  <>
                    <Button
                      onClick={handlePause}
                      variant="outline"
                      className="h-11 px-5 rounded-full border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                      data-testid="timer-pause-button"
                    >
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </Button>
                    <Button
                      onClick={handleStop}
                      variant="outline"
                      className="h-11 px-5 rounded-full border-red-500/50 text-red-400 hover:bg-red-500/10"
                      data-testid="timer-stop-button"
                    >
                      <Square className="w-4 h-4 mr-2 fill-red-400" />
                      Stop
                    </Button>
                  </>
                )}

                {isPaused && (
                  <>
                    <Button
                      onClick={handleResume}
                      className="h-11 px-5 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold"
                      data-testid="timer-resume-button"
                    >
                      <Play className="w-4 h-4 mr-2 fill-white" />
                      Resume
                    </Button>
                    <Button
                      onClick={handleReset}
                      variant="outline"
                      className="h-11 px-5 rounded-full border-slate-500/50 text-slate-300 hover:bg-slate-700/50"
                      data-testid="timer-reset-button"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset
                    </Button>
                  </>
                )}
                
                <Button
                  onClick={() => setIsMuted(!isMuted)}
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-10 w-10 rounded-full",
                    isMuted ? "text-red-400 hover:text-red-300" : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                  )}
                  data-testid="timer-mute-button"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
              </div>

              {/* Session indicators */}
              {completedIntervals > 0 && (
                <div className="flex items-center justify-center gap-1.5 mb-4">
                  {Array.from({ length: Math.min(completedIntervals, 5) }).map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      style={{ boxShadow: "0 0 10px rgba(20,184,166,0.6)" }}
                    />
                  ))}
                  {completedIntervals > 5 && (
                    <span className="text-xs text-teal-400/70 ml-1">+{completedIntervals - 5}</span>
                  )}
                </div>
              )}

              {/* Auto-start toggle */}
              <div className="pt-3 border-t border-slate-700/40">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 uppercase tracking-wider">Auto-start in work blocks</span>
                  <Switch
                    checked={autoStartEnabled}
                    onCheckedChange={setAutoStartEnabled}
                    className="data-[state=checked]:bg-teal-500 scale-75"
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
