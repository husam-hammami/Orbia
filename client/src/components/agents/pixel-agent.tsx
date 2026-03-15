import React from "react";
import { motion } from "framer-motion";

interface NeuralOrbitProps {
  status: "idle" | "working" | "error" | "waiting";
  accentColor: string;
  size?: number;
  seed?: number;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

const ORBIT_CONFIGS = [
  { rx: 38, ry: 12, rot: 25, speed: 60 },
  { rx: 34, ry: 18, rot: -50, speed: 45 },
  { rx: 42, ry: 10, rot: 80, speed: 75 },
  { rx: 30, ry: 22, rot: -20, speed: 55 },
  { rx: 46, ry: 8, rot: 110, speed: 90 },
];

const NODE_POSITIONS = [
  { angle: 0, orbit: 0, r: 2.2 },
  { angle: 120, orbit: 1, r: 1.8 },
  { angle: 240, orbit: 2, r: 2.0 },
  { angle: 60, orbit: 3, r: 1.5 },
  { angle: 180, orbit: 0, r: 1.6 },
  { angle: 300, orbit: 4, r: 1.4 },
  { angle: 45, orbit: 2, r: 1.3 },
  { angle: 200, orbit: 1, r: 1.7 },
];

export function NeuralOrbit({ status, accentColor, size = 120, seed = 0 }: NeuralOrbitProps) {
  const safeStatus = (["idle", "working", "error", "waiting"].includes(status) ? status : "idle") as NeuralOrbitProps["status"];
  const color = accentColor || "#6366f1";
  const rgb = hexToRgb(color);
  const uid = `no-${color.replace("#", "")}-${seed}`;

  const isWorking = safeStatus === "working";
  const isError = safeStatus === "error";
  const isWaiting = safeStatus === "waiting";

  const orbitOpacity = isWorking ? 0.5 : isError ? 0.25 : isWaiting ? 0.2 : 0.3;
  const orbitWidth = isWorking ? 0.8 : 0.5;
  const corePulse = isWorking ? [10, 14, 10] : isError ? [8, 12, 8] : isWaiting ? [8, 10, 8] : [8, 11, 8];
  const coreDuration = isWorking ? 1.8 : isError ? 0.6 : isWaiting ? 4 : 3;
  const glowRadius = isWorking ? 25 : isError ? 18 : isWaiting ? 15 : 18;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <motion.div
        className="absolute rounded-full"
        style={{
          width: size * 0.6,
          height: size * 0.6,
          background: `radial-gradient(circle, rgba(${rgb.r},${rgb.g},${rgb.b},0.15) 0%, transparent 70%)`,
          filter: `blur(${size * 0.15}px)`,
        }}
        animate={{
          scale: isWorking ? [1, 1.3, 1] : isError ? [1, 1.15, 0.95, 1] : [1, 1.1, 1],
          opacity: isWorking ? [0.6, 1, 0.6] : isWaiting ? [0.2, 0.4, 0.2] : isError ? [0.3, 0.6, 0.3] : [0.3, 0.5, 0.3],
        }}
        transition={{ duration: coreDuration, repeat: Infinity, ease: "easeInOut" }}
      />

      <svg viewBox="0 0 100 100" width={size} height={size} className="overflow-visible absolute inset-0">
        <defs>
          <radialGradient id={`${uid}-core`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="30%" stopColor={color} stopOpacity="0.8" />
            <stop offset="70%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${uid}-glow`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
          {isError && (
            <filter id={`${uid}-distort`}>
              <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" seed={seed} />
              <feDisplacementMap in="SourceGraphic" scale="3" />
            </filter>
          )}
        </defs>

        <g filter={isError ? `url(#${uid}-distort)` : undefined}>
          <motion.circle
            cx="50" cy="50" r={glowRadius}
            fill={`url(#${uid}-glow)`}
            animate={{ r: corePulse.map(v => v + (glowRadius - 10)), opacity: isWaiting ? [0.15, 0.3, 0.15] : [0.2, 0.4, 0.2] }}
            transition={{ duration: coreDuration * 1.2, repeat: Infinity, ease: "easeInOut" }}
          />

          {ORBIT_CONFIGS.map((orbit, i) => {
            const adjustedRot = orbit.rot + seed * 15;
            const dir = i % 2 === 0 ? 360 : -360;
            const dur = orbit.speed / (isWorking ? 2.5 : isError ? 3 : isWaiting ? 0.6 : 1);
            return (
              <motion.ellipse
                key={i}
                cx="50" cy="50"
                rx={orbit.rx} ry={orbit.ry}
                fill="none"
                stroke={color}
                strokeWidth={orbitWidth}
                opacity={orbitOpacity - i * 0.04}
                style={{ originX: "50px", originY: "50px" }}
                initial={{ rotate: adjustedRot }}
                animate={{ rotate: [adjustedRot, adjustedRot + dir] }}
                transition={{ duration: dur, repeat: Infinity, ease: "linear" }}
              />
            );
          })}

          {NODE_POSITIONS.map((node, i) => {
            const orbit = ORBIT_CONFIGS[node.orbit % ORBIT_CONFIGS.length];
            const a = ((node.angle + seed * 30) * Math.PI) / 180;
            const x = 50 + Math.cos(a) * orbit.rx * 0.85;
            const y = 50 + Math.sin(a) * orbit.ry * 0.85;
            const nodeOpacity = isWorking ? 0.9 : isWaiting ? 0.3 : isError ? 0.5 : 0.5;
            const pulseDur = isWorking ? 1 + i * 0.2 : 3 + i * 0.5;
            return (
              <motion.circle
                key={`n-${i}`}
                cx={x} cy={y} r={node.r}
                fill={i % 3 === 0 ? "#ffffff" : color}
                opacity={nodeOpacity}
                animate={{
                  opacity: [nodeOpacity * 0.5, nodeOpacity, nodeOpacity * 0.5],
                  r: isWorking ? [node.r, node.r * 1.5, node.r] : [node.r, node.r * 1.2, node.r],
                }}
                transition={{ duration: pulseDur, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
              />
            );
          })}

          {isWorking && NODE_POSITIONS.slice(0, 4).map((node, i) => {
            const orbit = ORBIT_CONFIGS[node.orbit % ORBIT_CONFIGS.length];
            const a = ((node.angle + seed * 30) * Math.PI) / 180;
            const x = 50 + Math.cos(a) * orbit.rx * 0.85;
            const y = 50 + Math.sin(a) * orbit.ry * 0.85;
            return (
              <motion.line
                key={`l-${i}`}
                x1="50" y1="50" x2={x} y2={y}
                stroke={color}
                strokeWidth="0.3"
                opacity={0.2}
                animate={{ opacity: [0.05, 0.25, 0.05] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
              />
            );
          })}

          <motion.circle
            cx="50" cy="50"
            fill={`url(#${uid}-core)`}
            animate={{ r: corePulse }}
            transition={{ duration: coreDuration, repeat: Infinity, ease: "easeInOut" }}
          />

          <circle cx="50" cy="50" r="3" fill="#ffffff" opacity={isWaiting ? 0.5 : 0.85} />
        </g>
      </svg>
    </div>
  );
}

export function EmptyOrbit({ size = 120, onClick }: { size?: number; onClick?: () => void }) {
  const interactive = !!onClick;
  const Container = interactive ? motion.div : ("div" as any);
  return (
    <Container
      className={`relative rounded-full flex items-center justify-center ${interactive ? "cursor-pointer group focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:outline-none" : ""}`}
      style={{ width: size, height: size }}
      {...(interactive ? {
        whileHover: { scale: 1.05 },
        whileTap: { scale: 0.97 },
        onClick,
        onKeyDown: (e: any) => (e.key === "Enter" || e.key === " ") && onClick?.(),
        role: "button",
        tabIndex: 0,
        "aria-label": "Add new agent",
      } : {})}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} className="opacity-20 group-hover:opacity-40 transition-opacity duration-500">
        <motion.ellipse
          cx="50" cy="50" rx="40" ry="12"
          fill="none" stroke="#6366f1" strokeWidth="0.5" strokeDasharray="3 6"
          style={{ originX: "50px", originY: "50px" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        />
        <motion.ellipse
          cx="50" cy="50" rx="35" ry="18"
          fill="none" stroke="#6366f1" strokeWidth="0.4" strokeDasharray="2 8"
          style={{ originX: "50px", originY: "50px" }}
          initial={{ rotate: -60 }}
          animate={{ rotate: [-60, -420] }}
          transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
        />
        <circle cx="50" cy="50" r="4" fill="#6366f1" opacity="0.2" />
        <circle cx="50" cy="50" r="1.5" fill="#6366f1" opacity="0.3" />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-8 h-[1px] bg-indigo-500/30 group-hover:bg-indigo-400/50 transition-colors" />
        <div className="absolute h-8 w-[1px] bg-indigo-500/30 group-hover:bg-indigo-400/50 transition-colors" />
      </div>
    </Container>
  );
}
