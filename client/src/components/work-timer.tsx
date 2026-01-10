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
      glow: "rgba(16, 185, 129, 0.5)",
      orbitColor: "#10b981",
    };
    if (state === "running") return {
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
              {/* Outer orbital ring */}
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

              {/* Orbiting particle */}
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

              {/* Core */}
              <motion.div 
                className={cn(
                  "absolute inset-3 rounded-full flex items-center justify-center",
                  "bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95",
                  "border border-teal-500/30"
                )}
                animate={isActive ? {
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
              {/* Ambient background effects */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(20,184,166,0.12),transparent_60%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(6,182,212,0.08),transparent_50%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,rgba(16,185,129,0.06),transparent_40%)]" />
              
              {/* Floating particles */}
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
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 3 + Math.random() * 2,
                    delay: i * 0.3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              ))}

              {/* Close button */}
              <button
                onClick={() => setIsExpanded(false)}
                className="absolute top-3 right-3 z-20 w-7 h-7 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors border border-slate-600/50"
                data-testid="timer-close-button"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Main orbital timer display */}
              <div className="relative mb-6">
                <div className="relative w-52 h-52 mx-auto">
                  
                  {/* Outer decorative ring */}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 208 208">
                    <circle cx="104" cy="104" r="100" fill="none" strokeWidth="0.5" className="stroke-teal-500/10" strokeDasharray="2 4" />
                  </svg>

                  {/* Duration selection orbit */}
                  {DURATION_OPTIONS.map((duration, i) => {
                    const angle = -90 + (i * 90);
                    const isSelected = selectedDuration === duration;
                    const x = Math.cos((angle * Math.PI) / 180) * orbitRadius;
                    const y = Math.sin((angle * Math.PI) / 180) * orbitRadius;
                    
                    return (
                      <motion.button
                        key={duration}
                        className={cn(
                          "absolute w-11 h-11 rounded-full flex items-center justify-center z-10",
                          "font-mono text-sm font-bold transition-all duration-300",
                          "border-2",
                          isSelected
                            ? "bg-gradient-to-br from-teal-400 to-cyan-500 text-white border-teal-300/60 shadow-[0_0_25px_rgba(20,184,166,0.6)]"
                            : "bg-slate-800/90 text-slate-400 border-slate-600/40 hover:border-teal-500/60 hover:text-teal-300 hover:shadow-[0_0_15px_rgba(20,184,166,0.3)]"
                        )}
                        style={{
                          left: "50%",
                          top: "50%",
                          marginLeft: "-22px",
                          marginTop: "-22px",
                          transform: `translate(${x}px, ${y}px)`,
                        }}
                        onClick={() => isIdle && setSelectedDuration(duration)}
                        disabled={!isIdle}
                        whileHover={isIdle ? { scale: 1.15 } : {}}
                        whileTap={isIdle ? { scale: 0.95 } : {}}
                        data-testid={`duration-${duration}`}
                      >
                        {duration}
                      </motion.button>
                    );
                  })}

                  {/* Progress orbit ring */}
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
                    {/* Orbiting energy particle on progress ring */}
                    <motion.circle
                      cx={78 + 70 * Math.cos(((progress / 100) * 360 - 90) * (Math.PI / 180))}
                      cy={78 + 70 * Math.sin(((progress / 100) * 360 - 90) * (Math.PI / 180))}
                      r="4"
                      fill={colors.orbitColor}
                      style={{ filter: `drop-shadow(0 0 8px ${colors.glow})` }}
                    />
                  </svg>

                  {/* Central core button */}
                  <motion.button
                    className={cn(
                      "absolute inset-[38px] w-[132px] h-[132px] rounded-full",
                      "bg-gradient-to-br",
                      colors.primary,
                      "flex flex-col items-center justify-center gap-1",
                      "cursor-pointer transition-all",
                      "border-2 border-white/20"
                    )}
                    onClick={handleCoreClick}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    animate={isActive ? {
                      boxShadow: [
                        `0 0 40px ${colors.glow}, inset 0 0 40px rgba(255,255,255,0.1)`,
                        `0 0 60px ${colors.glow}, inset 0 0 50px rgba(255,255,255,0.15)`,
                        `0 0 40px ${colors.glow}, inset 0 0 40px rgba(255,255,255,0.1)`,
                      ]
                    } : {
                      boxShadow: `0 0 30px ${colors.glow}, inset 0 0 30px rgba(255,255,255,0.1)`
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    data-testid="timer-core-button"
                  >
                    {/* Inner glow layer */}
                    <div className="absolute inset-3 rounded-full bg-gradient-to-br from-white/25 via-transparent to-transparent" />
                    <div className="absolute inset-0 rounded-full bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                    
                    {/* Time display */}
                    <span className="relative font-mono text-3xl font-bold text-white tabular-nums drop-shadow-[0_2px_10px_rgba(0,0,0,0.3)]">
                      {timeDisplay}
                    </span>
                    
                    {/* Action icon */}
                    <motion.div
                      className="relative"
                      animate={isIdle ? { scale: [1, 1.15, 1] } : {}}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      {isIdle && <Play className="w-6 h-6 text-white/90 fill-white/90 drop-shadow-lg" />}
                      {state === "running" && <Pause className="w-6 h-6 text-white/80 drop-shadow-lg" />}
                      {isPaused && <Play className="w-6 h-6 text-white/80 fill-white/80 drop-shadow-lg" />}
                    </motion.div>
                  </motion.button>
                </div>
              </div>

              {/* Control buttons */}
              <div className="flex items-center justify-center gap-3 mb-4">
                {/* Reset button - prominent */}
                <Button
                  onClick={reset}
                  variant="outline"
                  className="h-10 px-5 rounded-full bg-slate-800/50 border-slate-600/50 text-slate-300 hover:text-white hover:bg-slate-700/50 hover:border-teal-500/50"
                  data-testid="timer-reset-button"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
                
                {/* Mute toggle */}
                <Button
                  onClick={toggleMute}
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-10 w-10 rounded-full",
                    isMuted ? "text-red-400 hover:text-red-300 hover:bg-red-500/10" : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                  )}
                  data-testid="timer-mute-button"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>

                {/* Session indicators */}
                {completedIntervals > 0 && (
                  <div className="flex items-center gap-1.5 ml-2">
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
              </div>

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
