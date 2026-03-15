import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AiMindProps {
  status: "idle" | "working" | "error" | "waiting";
  accentColor: string;
  avatar?: string | null;
  size?: number;
}

const SEEDS = [
  { rx: 40, ry: 15, rot: 30, dash: "10, 20" },
  { rx: 35, ry: 25, rot: -45, dash: "15, 15" },
  { rx: 45, ry: 20, rot: 75, dash: "5, 30" },
];

export function AiMind({ status, accentColor, avatar, size = 120 }: AiMindProps) {
  const safeStatus = (["idle", "working", "error", "waiting"].includes(status) ? status : "idle") as AiMindProps["status"];
  const color = accentColor || "#6366f1";

  // Animation variants based on status
  let speedMultiplier = 1;
  let scaleVariance = 1.05;
  let coreOpacity = [0.5, 0.8, 0.5];
  
  if (safeStatus === "working") {
    speedMultiplier = 3;
    scaleVariance = 1.15;
    coreOpacity = [0.8, 1, 0.8];
  } else if (safeStatus === "waiting") {
    speedMultiplier = 0.5;
    scaleVariance = 1.02;
    coreOpacity = [0.3, 0.5, 0.3];
  } else if (safeStatus === "error") {
    speedMultiplier = 4;
    scaleVariance = 1.1;
    coreOpacity = [0.4, 0.9, 0.4];
  }

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Background glow */}
      <motion.div
        className="absolute inset-0 rounded-full blur-[20px] opacity-30"
        style={{ backgroundColor: color }}
        animate={{
          scale: [1, scaleVariance, 1],
          opacity: safeStatus === "error" ? [0.2, 0.5, 0.2] : coreOpacity,
        }}
        transition={{
          duration: 3 / speedMultiplier,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      {/* Core Energy */}
      <svg viewBox="0 0 100 100" width={size} height={size} className="overflow-visible absolute inset-0 z-10 drop-shadow-xl">
        <defs>
          <radialGradient id={`coreGlow-${color.replace('#', '')}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="60%" stopColor={color} stopOpacity="0.6" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
          <filter id={`glitch-${color.replace('#', '')}`}>
            {safeStatus === "error" && (
              <feTurbulence type="fractalNoise" baseFrequency="0.15" numOctaves="2" result="noise" />
            )}
            {safeStatus === "error" && (
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="8" xChannelSelector="R" yChannelSelector="G" result="displaced" />
            )}
            <feGaussianBlur stdDeviation={safeStatus === "working" ? 2 : safeStatus === "error" ? 1 : 4} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in={safeStatus === "error" ? "displaced" : "SourceGraphic"} />
            </feMerge>
          </filter>
        </defs>

        <g filter={`url(#glitch-${color.replace('#', '')})`}>
          {/* Central Core */}
          <motion.circle
            cx="50"
            cy="50"
            r={safeStatus === "working" ? 18 : 14}
            fill={`url(#coreGlow-${color.replace('#', '')})`}
            animate={{
              r: safeStatus === "working" ? [18, 21, 18] : [14, 16, 14],
              opacity: coreOpacity,
            }}
            transition={{
              duration: 2 / speedMultiplier,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Inner Dense Core */}
          <circle cx="50" cy="50" r="6" fill="#ffffff" opacity="0.8" />

          {/* Orbital Rings */}
          {SEEDS.map((seed, i) => (
            <motion.ellipse
              key={i}
              cx="50"
              cy="50"
              rx={seed.rx}
              ry={seed.ry}
              fill="none"
              stroke={color}
              strokeWidth={safeStatus === "working" ? 1.5 : 0.8}
              strokeDasharray={seed.dash}
              opacity={0.6 + i * 0.1}
              style={{ originX: "50px", originY: "50px" }}
              initial={{ rotate: seed.rot }}
              animate={{
                rotate: [seed.rot, seed.rot + (i % 2 === 0 ? 360 : -360)],
                scale: safeStatus === "working" ? [1, 1.05, 1] : [1, 1.02, 1]
              }}
              transition={{
                rotate: {
                  duration: (15 + i * 5) / speedMultiplier,
                  repeat: Infinity,
                  ease: "linear"
                },
                scale: {
                  duration: 4 / speedMultiplier,
                  repeat: Infinity,
                  ease: "easeInOut"
                }
              }}
            />
          ))}

          {/* Working Particles */}
          {safeStatus === "working" && [0, 1, 2, 3, 4, 5].map(i => (
            <motion.circle
              key={`p-${i}`}
              r="1.5"
              fill="#ffffff"
              style={{ originX: "50px", originY: "50px" }}
              initial={{
                cx: 50,
                cy: 50,
              }}
              animate={{
                cx: [50, 50 + Math.cos(i * 60 * Math.PI / 180) * (40 + (i % 2) * 10)],
                cy: [50, 50 + Math.sin(i * 60 * Math.PI / 180) * (40 + (i % 2) * 10)],
                opacity: [1, 0],
                scale: [1, 0.5]
              }}
              transition={{
                duration: 1.5 - (i % 3) * 0.2,
                repeat: Infinity,
                ease: "easeOut",
                delay: i * 0.15
              }}
            />
          ))}

          {/* Error Glitch Lines */}
          {safeStatus === "error" && [0, 1, 2].map(i => (
            <motion.path
              key={`e-${i}`}
              d={`M 50 50 L ${20 + i * 30} ${15 + i * 25}`}
              stroke={color}
              strokeWidth="2"
              animate={{ opacity: [0, 1, 0], pathLength: [0, 1, 0] }}
              transition={{ duration: 0.3 + i * 0.2, repeat: Infinity, ease: "steps(3)" }}
            />
          ))}
        </g>
      </svg>
      
      {/* Avatar overlay */}
      {avatar && (
        <div className="absolute z-20 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
          <motion.div 
            className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.9)]"
            style={{ fontSize: size * 0.32 }}
            animate={{ 
              scale: safeStatus === "working" ? [1, 1.1, 1] : 1,
              opacity: safeStatus === "waiting" ? [0.6, 1, 0.6] : 1
            }}
            transition={{ duration: 2 / speedMultiplier, repeat: Infinity, ease: "easeInOut" }}
          >
            {avatar}
          </motion.div>
        </div>
      )}
    </div>
  );
}

export function EmptyMind({ size = 120, onClick, interactive = true }: { size?: number; onClick?: () => void; interactive?: boolean }) {
  const Container = interactive ? motion.div : "div" as any;
  return (
    <Container
      className={cn(
        "relative rounded-full flex items-center justify-center",
        interactive && "cursor-pointer group focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:outline-none"
      )}
      style={{ width: size, height: size }}
      {...(interactive ? {
        whileHover: { scale: 1.05 },
        whileTap: { scale: 0.95 },
        onClick: onClick,
        onKeyDown: (e: any) => (e.key === "Enter" || e.key === " ") && onClick?.(),
        role: "button",
        tabIndex: 0,
        "aria-label": "Add new agent"
      } : {})}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} className={cn("opacity-30 transition-opacity", interactive && "group-hover:opacity-60")}>
        <motion.circle 
          cx="50" cy="50" r="42" 
          fill="none" stroke="#6366f1" strokeWidth="1" strokeDasharray="4 8" 
          animate={{ rotate: 360 }} 
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          style={{ originX: "50px", originY: "50px" }}
        />
        <motion.circle 
          cx="50" cy="50" r="28" 
          fill="none" stroke="#6366f1" strokeWidth="0.5" strokeDasharray="2 4" 
          animate={{ rotate: -360 }} 
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          style={{ originX: "50px", originY: "50px" }}
        />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className={cn(
            "w-12 h-12 rounded-full border border-dashed border-indigo-500/40 flex items-center justify-center bg-indigo-500/5 backdrop-blur-sm transition-all",
            interactive && "group-hover:bg-indigo-500/10 group-hover:border-indigo-400/60 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]"
          )}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className={cn(
          "absolute flex items-center justify-center transition-colors",
          interactive ? "text-indigo-400/50 group-hover:text-indigo-300" : "text-indigo-400/50"
        )}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </Container>
  );
}
