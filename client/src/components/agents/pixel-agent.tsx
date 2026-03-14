import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { agentAnimations } from "@/lib/agent-animations";

interface PixelAgentProps {
  status: "idle" | "working" | "error" | "waiting";
  accentColor: string;
  avatar?: string | null;
  size?: number;
}

const SKIN = "#FFD5B8";
const SKIN_SHADOW = "#E8B896";
const HAIR_DARK = "#3D2B1F";
const HAIR_LIGHT = "#6B4226";
const DESK_TOP = "#2A2A3E";
const DESK_FRONT = "#1E1E2E";
const MONITOR_BEZEL = "#1A1A2A";
const SCREEN_BG = "#0D1117";

function MonitorScreen({ color, status }: { color: string; status: string }) {
  const lines = status === "working" ? 4 : status === "error" ? 2 : 3;
  return (
    <g>
      <rect x="14" y="4" width="22" height="16" rx="1.5" fill={MONITOR_BEZEL} />
      <rect x="15.5" y="5.5" width="19" height="13" rx="0.8" fill={SCREEN_BG} />

      {status === "working" && (
        <>
          <motion.rect
            x="17" y="7.5" width="8" height="1.2" rx="0.4" fill={color}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
          />
          <motion.rect
            x="17" y="10" width="12" height="1.2" rx="0.4" fill={`${color}88`}
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
          />
          <motion.rect
            x="17" y="12.5" width="6" height="1.2" rx="0.4" fill={`${color}66`}
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
          />
          <motion.rect
            x="17" y="15" width="14" height="1.2" rx="0.4" fill={`${color}44`}
            animate={{ opacity: [0.2, 0.6, 0.2] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0.6 }}
          />
        </>
      )}

      {status === "error" && (
        <>
          <motion.text
            x="25" y="13.5" textAnchor="middle" fontSize="7" fill="#ef4444" fontWeight="bold"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          >!</motion.text>
        </>
      )}

      {status === "idle" && (
        <>
          <rect x="17" y="7.5" width="10" height="1" rx="0.4" fill={`${color}55`} />
          <rect x="17" y="10" width="14" height="1" rx="0.4" fill={`${color}33`} />
          <rect x="17" y="12.5" width="7" height="1" rx="0.4" fill={`${color}33`} />
          <motion.rect
            x="30" y="15" width="2" height="1.2" rx="0.4" fill={color}
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        </>
      )}

      {status === "waiting" && (
        <motion.text
          x="25" y="14" textAnchor="middle" fontSize="5" fill="#f59e0b"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >...</motion.text>
      )}

      <rect x="23" y="20" width="4" height="2" fill={MONITOR_BEZEL} />
      <rect x="20" y="22" width="10" height="1.2" rx="0.5" fill={MONITOR_BEZEL} />
    </g>
  );
}

function Character({ status, color }: { status: string; color: string }) {
  const isWorking = status === "working";

  return (
    <g transform="translate(15, 10)">
      <rect x="5" y="21" width="10" height="12" rx="1.5" fill={color} />
      <rect x="6" y="22" width="8" height="4" rx="1" fill={`${color}DD`} />

      {isWorking ? (
        <motion.g
          animate={{ y: [0, -1, 0, -1.5, 0] }}
          transition={{ duration: 0.55, repeat: Infinity, ease: "linear" }}
        >
          <rect x="2" y="26" width="5" height="2.5" rx="1" fill={SKIN} />
          <rect x="13" y="26" width="5" height="2.5" rx="1" fill={SKIN} />
        </motion.g>
      ) : (
        <>
          <rect x="3" y="27" width="4" height="2.5" rx="1" fill={SKIN} />
          <rect x="13" y="27" width="4" height="2.5" rx="1" fill={SKIN} />
        </>
      )}

      <circle cx="10" cy="16" r="6" fill={SKIN} />
      <ellipse cx="10" cy="15.5" rx="6.5" ry="3.5" fill={HAIR_DARK} />
      <rect x="3.5" y="12" width="4" height="5" rx="1" fill={HAIR_DARK} />
      <rect x="12.5" y="12" width="4" height="5" rx="1" fill={HAIR_DARK} />

      <circle cx="7.5" cy="17" r="0.9" fill="#1a1a2e" />
      <circle cx="12.5" cy="17" r="0.9" fill="#1a1a2e" />
      <circle cx="7.8" cy="16.7" r="0.3" fill="white" />
      <circle cx="12.8" cy="16.7" r="0.3" fill="white" />

      {status === "idle" && (
        <line x1="7" y1="19.5" x2="13" y2="19.5" stroke={SKIN_SHADOW} strokeWidth="0.6" strokeLinecap="round" />
      )}
      {isWorking && (
        <path d="M 7.5 19.2 Q 10 20.5 12.5 19.2" stroke={SKIN_SHADOW} strokeWidth="0.6" fill="none" strokeLinecap="round" />
      )}
      {status === "error" && (
        <>
          <path d="M 7.5 20 Q 10 18.5 12.5 20" stroke="#ef4444" strokeWidth="0.7" fill="none" strokeLinecap="round" />
          <motion.g animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity }}>
            <circle cx="15" cy="11" r="3" fill="none" stroke="#ef4444" strokeWidth="0.5" opacity="0.6" />
          </motion.g>
        </>
      )}
      {status === "waiting" && (
        <>
          <line x1="7" y1="19.5" x2="13" y2="19.5" stroke={SKIN_SHADOW} strokeWidth="0.6" strokeLinecap="round" />
          <motion.g
            animate={{ y: [-1, 1, -1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <circle cx="18" cy="10" r="4" fill="white" opacity="0.9" />
            <text x="18" y="12" textAnchor="middle" fontSize="5" fill="#333">?</text>
          </motion.g>
        </>
      )}
    </g>
  );
}

function Desk({ color }: { color: string }) {
  return (
    <g>
      <rect x="4" y="44" width="42" height="3" rx="0.8" fill={DESK_TOP} />
      <rect x="4" y="44" width="42" height="1" rx="0.5" fill={`${color}15`} />
      <motion.rect
        x="4" y="44" width="8" height="0.5" rx="0.25" fill={`${color}66`}
        animate={{ x: [4, 38, 4] }}
        transition={{ duration: 5, repeat: Infinity, ease: "linear", repeatDelay: 4 }}
      />
      <rect x="8" y="47" width="4" height="6" fill={DESK_FRONT} />
      <rect x="38" y="47" width="4" height="6" fill={DESK_FRONT} />
    </g>
  );
}

const PARTICLE_SEEDS = Array.from({ length: 6 }, (_, i) => ({
  x: 10 + (i * 5.3 + 3) % 30,
  delay: (i * 0.7) % 3,
  size: 1 + (i * 0.4) % 1.5,
}));

const LABEL_SEEDS = [
  { x: 12, delay: 1, label: "fn()" },
  { x: 22, delay: 2.5, label: "*.tsx" },
  { x: 32, delay: 4, label: "</>" },
];

function WorkingParticles({ color }: { color: string }) {
  const particles = PARTICLE_SEEDS;
  return (
    <g>
      {particles.map((p, i) => (
        <motion.circle
          key={i}
          cx={p.x}
          cy={40}
          r={p.size}
          fill={color}
          initial={{ y: 0, opacity: 0.7, scale: 1 }}
          animate={{ y: -30, opacity: 0, scale: 0.3 }}
          transition={{ duration: 2 + p.size * 0.5, repeat: Infinity, delay: p.delay, ease: "easeOut" }}
        />
      ))}
      {LABEL_SEEDS.map((s, i) => (
        <motion.text
          key={`label-${i}`}
          x={s.x}
          y={38}
          fontSize="2.2"
          fill={color}
          fontFamily="'JetBrains Mono', monospace"
          initial={{ y: 0, opacity: 0.5 }}
          animate={{ y: -20, opacity: 0 }}
          transition={{ duration: 3, repeat: Infinity, delay: s.delay, ease: "easeOut" }}
        >
          {s.label}
        </motion.text>
      ))}
    </g>
  );
}

export function PixelAgent({ status, accentColor, avatar, size = 120 }: PixelAgentProps) {
  const safeStatus = (["idle", "working", "error", "waiting"].includes(status) ? status : "idle") as PixelAgentProps["status"];
  const color = accentColor || "#6366f1";

  const useFloat = safeStatus === "idle" || safeStatus === "waiting";
  const usePulse = safeStatus === "working";

  return (
    <motion.div
      className="relative"
      style={{ width: size, height: size }}
      animate={useFloat ? agentAnimations.idleFloat.animate : usePulse ? agentAnimations.workingPulse.animate : undefined}
      transition={useFloat ? agentAnimations.idleFloat.transition : usePulse ? agentAnimations.workingPulse.transition : undefined}
    >
      {safeStatus === "error" && (
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{ boxShadow: [`0 0 0 0 rgba(239,68,68,0.3)`, `0 0 0 ${size/6}px rgba(239,68,68,0)`, `0 0 0 0 rgba(239,68,68,0)`] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        />
      )}

      <svg viewBox="0 0 50 55" width={size} height={size} className="drop-shadow-lg">
        <Desk color={color} />
        <MonitorScreen color={color} status={safeStatus} />
        <Character status={safeStatus} color={color} />
        {safeStatus === "working" && <WorkingParticles color={color} />}
      </svg>

      {avatar && (
        <div
          className="absolute top-0 right-0 text-lg bg-black/40 rounded-full w-7 h-7 flex items-center justify-center backdrop-blur-sm border border-white/10"
          style={{ fontSize: size > 80 ? "14px" : "10px" }}
        >
          {avatar}
        </div>
      )}
    </motion.div>
  );
}

export function EmptyDesk({ size = 120, onClick }: { size?: number; onClick: () => void }) {
  return (
    <motion.div
      className="relative cursor-pointer group focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:outline-none rounded-xl"
      style={{ width: size, height: size }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      onKeyDown={e => (e.key === "Enter" || e.key === " ") && onClick()}
      role="button"
      tabIndex={0}
      aria-label="Add new agent"
    >
      <svg viewBox="0 0 50 55" width={size} height={size} className="opacity-40 group-hover:opacity-60 transition-opacity">
        <rect x="4" y="44" width="42" height="3" rx="0.8" fill={DESK_TOP} />
        <rect x="8" y="47" width="4" height="6" fill={DESK_FRONT} />
        <rect x="38" y="47" width="4" height="6" fill={DESK_FRONT} />

        <rect x="14" y="4" width="22" height="16" rx="1.5" fill={MONITOR_BEZEL} opacity="0.5" />
        <rect x="15.5" y="5.5" width="19" height="13" rx="0.8" fill={SCREEN_BG} opacity="0.5" />
        <rect x="23" y="20" width="4" height="2" fill={MONITOR_BEZEL} opacity="0.5" />
        <rect x="20" y="22" width="10" height="1.2" rx="0.5" fill={MONITOR_BEZEL} opacity="0.5" />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="w-10 h-10 rounded-xl border-2 border-dashed border-indigo-500/30 flex items-center justify-center text-indigo-400/50 group-hover:text-indigo-400/80 group-hover:border-indigo-500/50 transition-colors"
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </motion.div>
      </div>
    </motion.div>
  );
}
