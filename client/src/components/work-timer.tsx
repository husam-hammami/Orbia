import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, Volume2, VolumeX, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkTimer } from "@/hooks/use-work-timer";
import { cn } from "@/lib/utils";

const WORK_SESSION_MINUTES = 45;
const BREAK_DURATION_MINUTES = 5;

export function WorkTimer() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; angle: number; delay: number }>>([]);

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
    durationMinutes: WORK_SESSION_MINUTES,
    breakDurationMinutes: BREAK_DURATION_MINUTES,
  });

  // Generate ambient particles
  useEffect(() => {
    const newParticles = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      angle: (i * 45) + Math.random() * 20,
      delay: Math.random() * 2,
    }));
    setParticles(newParticles);
  }, []);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeDisplay = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  // Orbital progress calculation
  const orbitProgress = (progress / 100) * 360;
  
  // Session crystals positions
  const sessionCrystals = useMemo(() => {
    return Array.from({ length: Math.min(completedIntervals, 8) }, (_, i) => ({
      id: i,
      angle: -90 + (i * 45), // Start from top, spread evenly
    }));
  }, [completedIntervals]);

  const getStateColors = () => {
    if (isBreakTime) return {
      primary: "from-emerald-400 to-teal-500",
      glow: "shadow-emerald-500/50",
      ring: "stroke-emerald-400",
      bg: "from-emerald-500/10 via-teal-500/5 to-transparent",
      accent: "#10b981",
    };
    switch (state) {
      case "running": return {
        primary: "from-violet-400 to-indigo-500",
        glow: "shadow-violet-500/50",
        ring: "stroke-violet-400",
        bg: "from-violet-500/10 via-indigo-500/5 to-transparent",
        accent: "#8b5cf6",
      };
      case "paused": return {
        primary: "from-amber-400 to-orange-500",
        glow: "shadow-amber-500/50",
        ring: "stroke-amber-400",
        bg: "from-amber-500/10 via-orange-500/5 to-transparent",
        accent: "#f59e0b",
      };
      default: return {
        primary: "from-slate-400 to-slate-500",
        glow: "shadow-slate-500/30",
        ring: "stroke-slate-400",
        bg: "from-slate-500/5 via-slate-500/2 to-transparent",
        accent: "#64748b",
      };
    }
  };

  const colors = getStateColors();
  const isActive = state === "running" || state === "break";

  return (
    <motion.div
      layout
      className="relative"
      data-testid="work-timer-container"
    >
      {/* Collapsed pill view */}
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
            <div className={cn(
              "relative flex items-center gap-3 px-4 py-2 rounded-full",
              "bg-gradient-to-r from-background/80 to-background/60",
              "backdrop-blur-xl border border-white/10",
              "shadow-lg hover:shadow-xl transition-all duration-300",
              isActive && "ring-2 ring-offset-2 ring-offset-background",
              isActive && (isBreakTime ? "ring-emerald-500/50" : "ring-violet-500/50")
            )}>
              {/* Mini orbital indicator */}
              <div className="relative w-10 h-10">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
                  {/* Background ring */}
                  <circle
                    cx="20" cy="20" r="16"
                    fill="none" strokeWidth="2"
                    className="stroke-muted/20"
                  />
                  {/* Progress arc */}
                  <motion.circle
                    cx="20" cy="20" r="16"
                    fill="none" strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray={100}
                    strokeDashoffset={100 - progress}
                    className={colors.ring}
                    style={{ filter: `drop-shadow(0 0 4px ${colors.accent})` }}
                  />
                </svg>
                
                {/* Center orb */}
                <motion.div
                  className={cn(
                    "absolute inset-2 rounded-full",
                    "bg-gradient-to-br",
                    colors.primary
                  )}
                  animate={isActive ? {
                    scale: [1, 1.1, 1],
                    opacity: [0.8, 1, 0.8],
                  } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{ boxShadow: `0 0 20px ${colors.accent}40` }}
                />
              </div>

              {/* Time display */}
              <div className="flex flex-col">
                <span className={cn(
                  "font-mono text-lg font-bold tabular-nums",
                  "bg-gradient-to-r bg-clip-text text-transparent",
                  colors.primary
                )} data-testid="timer-display">
                  {timeDisplay}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {isBreakTime ? "Breathe" : state === "running" ? "Focus" : state === "paused" ? "Paused" : "Ready"}
                </span>
              </div>

              {/* Session count */}
              {completedIntervals > 0 && (
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(completedIntervals, 5) }).map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        "bg-gradient-to-br",
                        colors.primary
                      )}
                      style={{ boxShadow: `0 0 6px ${colors.accent}` }}
                    />
                  ))}
                  {completedIntervals > 5 && (
                    <span className="text-[10px] text-muted-foreground ml-0.5">
                      +{completedIntervals - 5}
                    </span>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="relative"
          >
            {/* Glassmorphic container */}
            <div className={cn(
              "relative w-72 p-6 rounded-3xl",
              "bg-gradient-to-br from-background/90 via-background/70 to-background/50",
              "backdrop-blur-2xl border border-white/10",
              "shadow-2xl"
            )}>
              {/* Ambient background gradient */}
              <div className={cn(
                "absolute inset-0 rounded-3xl bg-gradient-radial",
                colors.bg,
                "pointer-events-none"
              )} />

              {/* Close button */}
              <button
                onClick={() => setIsExpanded(false)}
                className="absolute top-3 right-3 w-6 h-6 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="text-xs">×</span>
              </button>

              {/* Main orbital display */}
              <div className="relative w-48 h-48 mx-auto mb-4">
                {/* Outer glow ring */}
                <motion.div
                  className={cn(
                    "absolute inset-0 rounded-full",
                    "bg-gradient-to-r",
                    colors.primary,
                    "opacity-10 blur-xl"
                  )}
                  animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 3, repeat: Infinity }}
                />

                {/* Orbital track */}
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 200 200">
                  {/* Background orbit */}
                  <circle
                    cx="100" cy="100" r="85"
                    fill="none" strokeWidth="1"
                    className="stroke-muted/20"
                    strokeDasharray="4 4"
                  />
                  
                  {/* Progress arc with glow */}
                  <motion.circle
                    cx="100" cy="100" r="85"
                    fill="none" strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={534}
                    strokeDashoffset={534 - (progress / 100) * 534}
                    className={colors.ring}
                    style={{ filter: `drop-shadow(0 0 8px ${colors.accent})` }}
                  />

                  {/* Orbiting particle at progress point */}
                  <motion.g
                    style={{
                      transformOrigin: "100px 100px",
                      rotate: orbitProgress,
                    }}
                  >
                    <circle
                      cx="100" cy="15" r="4"
                      fill={colors.accent}
                      style={{ filter: `drop-shadow(0 0 10px ${colors.accent})` }}
                    />
                    <circle
                      cx="100" cy="15" r="2"
                      fill="white"
                      opacity="0.8"
                    />
                  </motion.g>
                </svg>

                {/* Session crystals orbiting */}
                {sessionCrystals.map((crystal, i) => (
                  <motion.div
                    key={crystal.id}
                    className="absolute w-3 h-3"
                    style={{
                      left: "50%",
                      top: "50%",
                      marginLeft: "-6px",
                      marginTop: "-6px",
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{
                      scale: 1,
                      opacity: 1,
                      x: Math.cos((crystal.angle * Math.PI) / 180) * 70,
                      y: Math.sin((crystal.angle * Math.PI) / 180) * 70,
                    }}
                    transition={{ delay: i * 0.1, type: "spring" }}
                  >
                    <div
                      className={cn(
                        "w-full h-full rounded-full",
                        "bg-gradient-to-br from-violet-400 to-indigo-500"
                      )}
                      style={{ boxShadow: `0 0 8px ${colors.accent}` }}
                    />
                  </motion.div>
                ))}

                {/* Ambient floating particles */}
                {particles.map((p) => (
                  <motion.div
                    key={p.id}
                    className="absolute w-1 h-1 rounded-full bg-white/30"
                    style={{
                      left: "50%",
                      top: "50%",
                    }}
                    animate={isActive ? {
                      x: [
                        Math.cos((p.angle * Math.PI) / 180) * 60,
                        Math.cos(((p.angle + 30) * Math.PI) / 180) * 80,
                        Math.cos((p.angle * Math.PI) / 180) * 60,
                      ],
                      y: [
                        Math.sin((p.angle * Math.PI) / 180) * 60,
                        Math.sin(((p.angle + 30) * Math.PI) / 180) * 80,
                        Math.sin((p.angle * Math.PI) / 180) * 60,
                      ],
                      opacity: [0.2, 0.5, 0.2],
                    } : {
                      x: Math.cos((p.angle * Math.PI) / 180) * 65,
                      y: Math.sin((p.angle * Math.PI) / 180) * 65,
                      opacity: 0.2,
                    }}
                    transition={{
                      duration: 4,
                      delay: p.delay,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                ))}

                {/* Central orb */}
                <div className="absolute inset-[25%] flex items-center justify-center">
                  <motion.div
                    className={cn(
                      "w-full h-full rounded-full",
                      "bg-gradient-to-br",
                      colors.primary,
                      "flex items-center justify-center",
                      "shadow-2xl"
                    )}
                    animate={isActive ? {
                      scale: [1, 1.05, 1],
                      boxShadow: [
                        `0 0 30px ${colors.accent}40`,
                        `0 0 50px ${colors.accent}60`,
                        `0 0 30px ${colors.accent}40`,
                      ],
                    } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{ boxShadow: `0 0 40px ${colors.accent}40` }}
                  >
                    {/* Inner glow layer */}
                    <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
                    
                    {/* Time display */}
                    <div className="relative text-center">
                      <motion.span
                        className="block text-2xl font-bold text-white font-mono tabular-nums"
                        style={{ textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}
                      >
                        {timeDisplay}
                      </motion.span>
                      <span className="text-[10px] text-white/70 uppercase tracking-wider">
                        {isBreakTime ? "Breathe" : state === "running" ? "Focus" : state === "paused" ? "Paused" : "Ready"}
                      </span>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Control buttons */}
              <div className="flex items-center justify-center gap-2 mt-4">
                {state === "idle" && (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={start}
                      className={cn(
                        "h-10 px-6 rounded-full",
                        "bg-gradient-to-r",
                        colors.primary,
                        "border-0 text-white font-medium",
                        "shadow-lg hover:shadow-xl transition-shadow"
                      )}
                      style={{ boxShadow: `0 4px 20px ${colors.accent}40` }}
                      data-testid="timer-start-button"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Begin Focus
                    </Button>
                  </motion.div>
                )}

                {state === "running" && (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={pause}
                      variant="outline"
                      className="h-10 px-6 rounded-full border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
                      data-testid="timer-pause-button"
                    >
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </Button>
                  </motion.div>
                )}

                {state === "break" && (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={skipBreak}
                      variant="outline"
                      className="h-10 px-6 rounded-full border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10"
                      data-testid="timer-skip-break-button"
                    >
                      <SkipForward className="w-4 h-4 mr-2" />
                      Skip Break
                    </Button>
                  </motion.div>
                )}

                {state === "paused" && (
                  <>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={resume}
                        className={cn(
                          "h-10 px-5 rounded-full",
                          "bg-gradient-to-r",
                          colors.primary,
                          "border-0 text-white"
                        )}
                        data-testid="timer-resume-button"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Resume
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={reset}
                        variant="ghost"
                        className="h-10 w-10 rounded-full text-muted-foreground"
                        data-testid="timer-reset-button"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  </>
                )}

                {/* Mute toggle */}
                <Button
                  onClick={toggleMute}
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 rounded-full",
                    isMuted ? "text-red-400" : "text-muted-foreground"
                  )}
                  data-testid="timer-mute-button"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
              </div>

              {/* Session counter */}
              {completedIntervals > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 text-center"
                >
                  <span className="text-xs text-muted-foreground">
                    {completedIntervals} session{completedIntervals !== 1 ? "s" : ""} completed today
                  </span>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
