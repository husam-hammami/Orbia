import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/hooks/useTheme";
import { themePresets } from "@/lib/themePresets";
import { Sun, Moon, ChevronDown, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Cute animated sun with rays
function AnimatedSun() {
  return (
    <motion.g
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 1 }}
    >
      {/* Sun rays */}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, i) => (
        <motion.line
          key={angle}
          x1={35 + Math.cos(angle * Math.PI / 180) * 14}
          y1={22 + Math.sin(angle * Math.PI / 180) * 14}
          x2={35 + Math.cos(angle * Math.PI / 180) * 20}
          y2={22 + Math.sin(angle * Math.PI / 180) * 20}
          className="stroke-warning"
          strokeWidth="2"
          strokeLinecap="round"
          animate={{ 
            opacity: [0.4, 1, 0.4],
            strokeWidth: [1.5, 2.5, 1.5]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            delay: i * 0.1 
          }}
        />
      ))}
      {/* Main sun circle */}
      <motion.circle
        cx="35"
        cy="22"
        r="12"
        className="fill-warning"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
        style={{ transformOrigin: "35px 22px" }}
      />
      {/* Sun face */}
      <circle cx="31" cy="20" r="1.5" className="fill-warning/60" />
      <circle cx="39" cy="20" r="1.5" className="fill-warning/60" />
      <motion.path
        d="M30 25 Q35 29 40 25"
        className="stroke-warning/60"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        animate={{ d: ["M30 25 Q35 29 40 25", "M30 26 Q35 30 40 26", "M30 25 Q35 29 40 25"] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      {/* Rosy cheeks */}
      <circle cx="28" cy="24" r="2" className="fill-destructive/30" />
      <circle cx="42" cy="24" r="2" className="fill-destructive/30" />
    </motion.g>
  );
}

// Fluffy animated clouds
function Cloud({ x, y, size = 1, delay = 0 }: { x: number; y: number; size?: number; delay?: number }) {
  return (
    <motion.g
      initial={{ x: x - 20, opacity: 0 }}
      animate={{ 
        x: [x, x + 15, x],
        opacity: 1
      }}
      transition={{ 
        x: { duration: 20 + delay * 5, repeat: Infinity, ease: "easeInOut" },
        opacity: { duration: 1, delay: delay * 0.3 }
      }}
    >
      <g transform={`translate(0, ${y}) scale(${size})`}>
        <ellipse cx="0" cy="0" rx="12" ry="7" className="fill-background/80" />
        <ellipse cx="-8" cy="2" rx="8" ry="5" className="fill-background/80" />
        <ellipse cx="10" cy="2" rx="10" ry="6" className="fill-background/80" />
        <ellipse cx="5" cy="-3" rx="7" ry="5" className="fill-background/90" />
        <ellipse cx="-3" cy="-2" rx="6" ry="4" className="fill-background/90" />
      </g>
    </motion.g>
  );
}

// Cozy small cottage
function Cottage({ x }: { x: number }) {
  return (
    <motion.g
      transform={`translate(${x}, 0)`}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.8, type: "spring" }}
    >
      {/* Main house body */}
      <rect x="-18" y="28" width="36" height="26" rx="2" className="fill-accent/80" />
      {/* Roof */}
      <path d="M-22 30 L0 10 L22 30 Z" className="fill-primary" />
      <path d="M-18 28 L0 14 L18 28 Z" className="fill-primary/80" />
      {/* Chimney */}
      <rect x="8" y="12" width="6" height="12" className="fill-destructive/60" />
      <motion.ellipse
        cx="11"
        cy="10"
        rx="4"
        ry="2"
        className="fill-muted/50"
        animate={{ 
          cy: [10, 4, 10],
          opacity: [0.5, 0.2, 0.5],
          rx: [4, 6, 4]
        }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      {/* Door */}
      <rect x="-5" y="38" width="10" height="16" rx="1" className="fill-primary/60" />
      <circle cx="3" cy="46" r="1" className="fill-warning" />
      {/* Windows */}
      <rect x="-15" y="32" width="7" height="7" rx="1" className="fill-background/90" />
      <line x1="-11.5" y1="32" x2="-11.5" y2="39" className="stroke-primary/40" strokeWidth="0.5" />
      <line x1="-15" y1="35.5" x2="-8" y2="35.5" className="stroke-primary/40" strokeWidth="0.5" />
      <rect x="8" y="32" width="7" height="7" rx="1" className="fill-background/90" />
      <line x1="11.5" y1="32" x2="11.5" y2="39" className="stroke-primary/40" strokeWidth="0.5" />
      <line x1="8" y1="35.5" x2="15" y2="35.5" className="stroke-primary/40" strokeWidth="0.5" />
      {/* Window glow */}
      <motion.rect
        x="-14"
        y="33"
        width="5"
        height="5"
        className="fill-warning/30"
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      {/* Heart on door */}
      <path d="M0 42 C-2 40 -3 42 0 44 C3 42 2 40 0 42" className="fill-destructive/60" />
      {/* Flowers by door */}
      <circle cx="-8" cy="52" r="2" className="fill-primary/70" />
      <circle cx="8" cy="52" r="2" className="fill-accent/70" />
    </motion.g>
  );
}

// Cute tree
function Tree({ x, type = 'round' }: { x: number; type?: 'round' | 'pine' | 'cherry' }) {
  return (
    <motion.g
      transform={`translate(${x}, 0)`}
      initial={{ scale: 0, y: 10 }}
      animate={{ scale: 1, y: 0 }}
      transition={{ duration: 0.6, type: "spring" }}
    >
      {/* Trunk */}
      <rect x="-3" y="40" width="6" height="14" rx="1" className="fill-amber-700" />
      
      {type === 'round' && (
        <motion.g
          animate={{ rotate: [-1, 1, -1] }}
          transition={{ duration: 4, repeat: Infinity }}
          style={{ transformOrigin: "0px 35px" }}
        >
          <ellipse cx="0" cy="30" rx="14" ry="16" className="fill-success/80" />
          <ellipse cx="-6" cy="26" rx="8" ry="10" className="fill-success/90" />
          <ellipse cx="6" cy="28" rx="7" ry="9" className="fill-success/70" />
          {/* Apples/fruits */}
          <circle cx="-4" cy="34" r="2" className="fill-destructive/80" />
          <circle cx="5" cy="30" r="2" className="fill-destructive/80" />
        </motion.g>
      )}
      
      {type === 'pine' && (
        <motion.g
          animate={{ rotate: [-0.5, 0.5, -0.5] }}
          transition={{ duration: 3, repeat: Infinity }}
          style={{ transformOrigin: "0px 40px" }}
        >
          <path d="M0 12 L-12 40 L12 40 Z" className="fill-success/80" />
          <path d="M0 18 L-10 38 L10 38 Z" className="fill-success/90" />
          <path d="M0 24 L-8 36 L8 36 Z" className="fill-success" />
        </motion.g>
      )}
      
      {type === 'cherry' && (
        <motion.g
          animate={{ rotate: [-1, 1, -1] }}
          transition={{ duration: 3.5, repeat: Infinity }}
          style={{ transformOrigin: "0px 35px" }}
        >
          <ellipse cx="0" cy="28" rx="16" ry="14" className="fill-primary/50" />
          <ellipse cx="-5" cy="24" rx="10" ry="8" className="fill-primary/60" />
          <ellipse cx="7" cy="26" rx="8" ry="7" className="fill-primary/40" />
          {/* Cherry blossoms */}
          {[-8, -3, 2, 8, -5, 5].map((bx, i) => (
            <motion.circle
              key={i}
              cx={bx}
              cy={22 + (i % 2) * 8}
              r="2"
              className="fill-background"
              animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
            />
          ))}
        </motion.g>
      )}
    </motion.g>
  );
}

function Butterfly({ delay, startX, color }: { delay: number; startX: number; color: string }) {
  return (
    <motion.g
      initial={{ x: startX, y: 20 }}
      animate={{
        x: [startX, startX + 40, startX - 30, startX + 20, startX],
        y: [20, 8, 28, 5, 20],
      }}
      transition={{
        duration: 10 + Math.random() * 4,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <motion.path
        d="M0 0 Q-8 -6 -6 -12 Q-2 -8 0 0"
        fill={color}
        animate={{ rotate: [-20, 20, -20] }}
        transition={{ duration: 0.25, repeat: Infinity }}
        style={{ transformOrigin: "0px 0px" }}
      />
      <motion.path
        d="M0 0 Q8 -6 6 -12 Q2 -8 0 0"
        fill={color}
        animate={{ rotate: [20, -20, 20] }}
        transition={{ duration: 0.25, repeat: Infinity }}
        style={{ transformOrigin: "0px 0px" }}
      />
      <motion.path
        d="M0 0 Q-5 3 -3 7 Q-1 4 0 0"
        fill={color}
        opacity={0.8}
        animate={{ rotate: [-12, 12, -12] }}
        transition={{ duration: 0.25, repeat: Infinity }}
        style={{ transformOrigin: "0px 0px" }}
      />
      <motion.path
        d="M0 0 Q5 3 3 7 Q1 4 0 0"
        fill={color}
        opacity={0.8}
        animate={{ rotate: [12, -12, 12] }}
        transition={{ duration: 0.25, repeat: Infinity }}
        style={{ transformOrigin: "0px 0px" }}
      />
      <ellipse cx="0" cy="0" rx="0.8" ry="3" fill="hsl(var(--foreground))" opacity={0.4} />
    </motion.g>
  );
}

// Enhanced flowers with more variety
function Flower({ x, type, delay, size = 1 }: { x: number; type: 'tulip' | 'daisy' | 'rose' | 'lavender' | 'sunflower'; delay: number; size?: number }) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.g
      transform={`translate(${x}, 0) scale(${size})`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ cursor: 'pointer' }}
      data-testid={`flower-${type}-${x}`}
    >
      {/* Stem */}
      <motion.path
        d={`M0 54 Q${type === 'rose' ? 2 : -2} 44 0 ${type === 'sunflower' ? 30 : 34}`}
        className="stroke-success"
        strokeWidth={size > 0.8 ? 2 : 1.5}
        fill="none"
        animate={{ 
          d: isHovered 
            ? `M0 54 Q${type === 'rose' ? 4 : -4} 44 0 ${type === 'sunflower' ? 28 : 32}`
            : `M0 54 Q${type === 'rose' ? 2 : -2} 44 0 ${type === 'sunflower' ? 30 : 34}`
        }}
      />
      
      {/* Leaf */}
      <path d="M-2 44 Q-6 42 -7 38" className="stroke-success/80" strokeWidth="1.5" fill="none" />
      <ellipse cx="-7" cy="40" rx="3" ry="1.5" className="fill-success/70" transform="rotate(-30, -7, 40)" />
      
      {type === 'tulip' && (
        <motion.g
          animate={{ 
            y: isHovered ? -4 : 0,
            scale: isHovered ? 1.2 : 1,
            rotate: [0, 2, -2, 0]
          }}
          transition={{ 
            y: { duration: 0.3 },
            scale: { duration: 0.3 },
            rotate: { duration: 3, repeat: Infinity, delay }
          }}
          style={{ transformOrigin: "0px 34px" }}
        >
          <path d="M0 34 Q-6 26 -4 18 Q0 14 0 18 Q0 14 4 18 Q6 26 0 34" className="fill-primary" />
          <path d="M-1 30 Q-2 24 0 20" className="stroke-primary/50" strokeWidth="0.5" fill="none" />
        </motion.g>
      )}
      
      {type === 'daisy' && (
        <motion.g
          animate={{ 
            y: isHovered ? -4 : 0,
            scale: isHovered ? 1.2 : 1,
            rotate: [0, 3, -3, 0]
          }}
          transition={{ 
            y: { duration: 0.3 },
            scale: { duration: 0.3 },
            rotate: { duration: 4, repeat: Infinity, delay }
          }}
          style={{ transformOrigin: "0px 34px" }}
        >
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
            <ellipse
              key={angle}
              cx={Math.cos(angle * Math.PI / 180) * 5}
              cy={30 + Math.sin(angle * Math.PI / 180) * 5}
              rx="3.5"
              ry="1.8"
              className="fill-background"
              transform={`rotate(${angle}, ${Math.cos(angle * Math.PI / 180) * 5}, ${30 + Math.sin(angle * Math.PI / 180) * 5})`}
            />
          ))}
          <circle cx="0" cy="30" r="3" className="fill-warning" />
        </motion.g>
      )}
      
      {type === 'rose' && (
        <motion.g
          animate={{ 
            y: isHovered ? -4 : 0,
            scale: isHovered ? 1.2 : 1,
            rotate: [0, 2, -2, 0]
          }}
          transition={{ 
            y: { duration: 0.3 },
            scale: { duration: 0.3 },
            rotate: { duration: 3.5, repeat: Infinity, delay }
          }}
          style={{ transformOrigin: "0px 32px" }}
        >
          <circle cx="0" cy="28" r="7" className="fill-destructive/80" />
          <path d="M-3 28 Q0 22 3 28 Q0 24 -3 28" className="fill-destructive" />
          <path d="M-5 30 Q-2 24 0 30" className="fill-destructive/60" />
          <path d="M5 30 Q2 24 0 30" className="fill-destructive/60" />
          <circle cx="0" cy="26" r="2" className="fill-destructive/90" />
        </motion.g>
      )}
      
      {type === 'lavender' && (
        <motion.g
          animate={{ 
            y: isHovered ? -3 : 0,
            scale: isHovered ? 1.15 : 1,
            rotate: [0, 2, -2, 0]
          }}
          transition={{ 
            y: { duration: 0.3 },
            scale: { duration: 0.3 },
            rotate: { duration: 3, repeat: Infinity, delay }
          }}
          style={{ transformOrigin: "0px 34px" }}
        >
          {[0, 3, 6, 9, 12, 15].map((dy, i) => (
            <ellipse
              key={i}
              cx={i % 2 === 0 ? -1 : 1}
              cy={20 + dy}
              rx="2.5"
              ry="2"
              className="fill-accent"
            />
          ))}
        </motion.g>
      )}
      
      {type === 'sunflower' && (
        <motion.g
          animate={{ 
            y: isHovered ? -4 : 0,
            scale: isHovered ? 1.15 : 1,
            rotate: [0, 2, -2, 0]
          }}
          transition={{ 
            y: { duration: 0.3 },
            scale: { duration: 0.3 },
            rotate: { duration: 4, repeat: Infinity, delay }
          }}
          style={{ transformOrigin: "0px 30px" }}
        >
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
            <ellipse
              key={angle}
              cx={Math.cos(angle * Math.PI / 180) * 7}
              cy={24 + Math.sin(angle * Math.PI / 180) * 7}
              rx="4"
              ry="2"
              className="fill-warning"
              transform={`rotate(${angle}, ${Math.cos(angle * Math.PI / 180) * 7}, ${24 + Math.sin(angle * Math.PI / 180) * 7})`}
            />
          ))}
          <circle cx="0" cy="24" r="5" className="fill-amber-800" />
          <circle cx="-1" cy="23" r="0.8" className="fill-warning/40" />
          <circle cx="1" cy="25" r="0.8" className="fill-warning/40" />
        </motion.g>
      )}
    </motion.g>
  );
}

function FloatingPetal({ delay, startX }: { delay: number; startX: number }) {
  return (
    <motion.ellipse
      cx={startX}
      cy={-5}
      rx="3"
      ry="2"
      className="fill-primary/40"
      initial={{ y: -10, opacity: 0, rotate: 0 }}
      animate={{
        y: [0, 70],
        x: [0, Math.random() * 20 - 10, Math.random() * 30 - 15],
        opacity: [0, 0.7, 0.7, 0],
        rotate: [0, 180, 360],
      }}
      transition={{
        duration: 8 + Math.random() * 4,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

function FloatingHeart({ delay, startX }: { delay: number; startX: number }) {
  return (
    <motion.path
      d={`M${startX} 0 C${startX - 3} -3 ${startX - 5} 0 ${startX} 4 C${startX + 5} 0 ${startX + 3} -3 ${startX} 0`}
      className="fill-destructive/30"
      initial={{ y: 60, opacity: 0, scale: 0.5 }}
      animate={{
        y: [-10, -20],
        opacity: [0, 0.6, 0],
        scale: [0.5, 1, 0.8],
      }}
      transition={{
        duration: 6,
        delay,
        repeat: Infinity,
        ease: "easeOut",
      }}
    />
  );
}

function Sparkle({ x, y, delay, size = 1 }: { x: number; y: number; delay: number; size?: number }) {
  return (
    <motion.g transform={`translate(${x}, ${y}) scale(${size})`}>
      <motion.path
        d="M0 -4 L1 -1 L4 0 L1 1 L0 4 L-1 1 L-4 0 L-1 -1 Z"
        className="fill-warning"
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: [0, 1, 0],
          opacity: [0, 1, 0],
          rotate: [0, 180],
        }}
        transition={{
          duration: 2,
          delay,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </motion.g>
  );
}

function Firefly({ startX, startY, delay }: { startX: number; startY: number; delay: number }) {
  return (
    <motion.circle
      cx={startX}
      cy={startY}
      r="2"
      className="fill-warning"
      filter="url(#glow)"
      initial={{ opacity: 0 }}
      animate={{
        x: [0, 15, -10, 5, 0],
        y: [0, -8, 5, -12, 0],
        opacity: [0, 1, 0.3, 1, 0],
      }}
      transition={{
        duration: 6,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

// Small bird
function Bird({ startX, delay }: { startX: number; delay: number }) {
  return (
    <motion.g
      initial={{ x: startX, y: 15 }}
      animate={{
        x: [startX, startX + 100, startX + 200],
        y: [15, 10, 18, 8, 15],
      }}
      transition={{
        duration: 12,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <motion.path
        d="M0 0 Q-4 -3 -8 0 M0 0 Q4 -3 8 0"
        className="stroke-foreground/40"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        animate={{ d: ["M0 0 Q-4 -3 -8 0 M0 0 Q4 -3 8 0", "M0 0 Q-4 0 -8 2 M0 0 Q4 0 8 2", "M0 0 Q-4 -3 -8 0 M0 0 Q4 -3 8 0"] }}
        transition={{ duration: 0.4, repeat: Infinity }}
      />
    </motion.g>
  );
}

// Walking cat with cute behaviors
function WalkingCat({ containerWidth }: { containerWidth: number }) {
  const [position, setPosition] = useState(80);
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const [frame, setFrame] = useState(0);
  const [isSitting, setIsSitting] = useState(false);
  const [isResting, setIsResting] = useState(false);
  const [blinkFrame, setBlinkFrame] = useState(0);
  const restTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (restTimeoutRef.current) {
        clearTimeout(restTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      if (Math.random() < 0.1) {
        setBlinkFrame(1);
        setTimeout(() => setBlinkFrame(0), 150);
      }
    }, 1000);
    return () => clearInterval(blinkInterval);
  }, []);

  useEffect(() => {
    if (isResting || isSitting) return;

    const walkInterval = setInterval(() => {
      setFrame((f) => (f + 1) % 8);
      setPosition((p) => {
        const step = direction === 'right' ? 1.2 : -1.2;
        const newPos = p + step;
        
        if (newPos > containerWidth - 100) {
          setDirection('left');
          return containerWidth - 100;
        } else if (newPos < 80) {
          setDirection('right');
          return 80;
        }
        
        const rand = Math.random();
        if (rand < 0.004) {
          setIsSitting(true);
          restTimeoutRef.current = setTimeout(() => setIsSitting(false), 4000);
        } else if (rand < 0.008) {
          setIsResting(true);
          restTimeoutRef.current = setTimeout(() => setIsResting(false), 2000);
        }
        
        return newPos;
      });
    }, 90);

    return () => clearInterval(walkInterval);
  }, [direction, isResting, isSitting, containerWidth]);

  const walkCycle = [0, 1, 2, 3, 2, 1, 0, -1];
  const legPhase = walkCycle[frame];
  const bodyBob = Math.sin(frame * Math.PI / 4) * 0.5;
  const tailPhase = Math.sin(frame * Math.PI / 2) * 12;

  return (
    <motion.g
      animate={{ x: position }}
      transition={{ type: "tween", duration: 0.09 }}
    >
      <g transform={`translate(0, ${isSitting ? 8 : bodyBob}) ${direction === 'left' ? 'scale(-1,1) translate(-40,0)' : ''}`}>
        {/* Tail */}
        <motion.path
          d={isSitting ? "M6 32 Q0 26 2 20 Q4 14 8 12" : "M6 30 Q2 26 1 20 Q0 14 4 10"}
          className="stroke-primary"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          animate={{ rotate: isSitting ? [0, 8, 0, -8, 0] : tailPhase }}
          transition={isSitting ? { duration: 2, repeat: Infinity } : { duration: 0.15 }}
          style={{ transformOrigin: "6px 32px" }}
        />
        
        {/* Legs */}
        {!isSitting && (
          <>
            <motion.path d="M12 34 Q10 38 11 42" className="stroke-primary" strokeWidth="3" strokeLinecap="round" fill="none"
              animate={{ rotate: legPhase * 3 }} style={{ transformOrigin: "12px 34px" }} />
            <motion.path d="M16 34 Q14 38 15 42" className="stroke-primary" strokeWidth="3" strokeLinecap="round" fill="none"
              animate={{ rotate: -legPhase * 3 }} style={{ transformOrigin: "16px 34px" }} />
            <motion.path d="M26 32 Q24 37 25 42" className="stroke-primary" strokeWidth="3" strokeLinecap="round" fill="none"
              animate={{ rotate: -legPhase * 4 }} style={{ transformOrigin: "26px 32px" }} />
            <motion.path d="M30 30 Q28 36 29 42" className="stroke-primary" strokeWidth="3" strokeLinecap="round" fill="none"
              animate={{ rotate: legPhase * 4 }} style={{ transformOrigin: "30px 30px" }} />
          </>
        )}
        
        {/* Body */}
        <ellipse cx={isSitting ? "18" : "18"} cy={isSitting ? "30" : "28"} rx={isSitting ? "10" : "11"} ry={isSitting ? "8" : "7"} className="fill-primary" />
        <ellipse cx="18" cy={isSitting ? "32" : "30"} rx="4" ry="2.5" className="fill-accent/40" />
        
        {/* Sitting paws */}
        {isSitting && (
          <>
            <ellipse cx="12" cy="36" rx="3.5" ry="2.5" className="fill-primary" />
            <ellipse cx="26" cy="36" rx="3.5" ry="2.5" className="fill-primary" />
          </>
        )}
        
        {/* Neck/chest */}
        <ellipse cx="30" cy="24" rx="4" ry="6" className="fill-primary" />
        
        {/* Head */}
        <circle cx="36" cy="18" r="8" className="fill-primary" />
        <ellipse cx="31" cy="19" rx="2" ry="2.5" className="fill-primary/60" />
        <ellipse cx="41" cy="19" rx="2" ry="2.5" className="fill-primary/60" />
        
        {/* Ears */}
        <path d="M30 14 L31 7 L35 12 Z" className="fill-primary" />
        <path d="M31 13 L31.5 9 L34 12 Z" className="fill-accent/50" />
        <path d="M40 12 L44 7 L46 14 Z" className="fill-primary" />
        <path d="M41 12 L43.5 9 L44.5 13 Z" className="fill-accent/50" />
        
        {/* Eyes */}
        {blinkFrame === 1 ? (
          <>
            <path d="M32 16 Q34 15 36 16" className="stroke-foreground" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            <path d="M39 16 Q41 15 43 16" className="stroke-foreground" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </>
        ) : (
          <>
            <ellipse cx="34" cy="16" rx="2" ry="2.5" className="fill-background" />
            <ellipse cx="34.3" cy="16" rx="1.2" ry="1.6" className="fill-foreground" />
            <circle cx="34.8" cy="15.4" r="0.5" className="fill-background" />
            <ellipse cx="41" cy="16" rx="2" ry="2.5" className="fill-background" />
            <ellipse cx="41.3" cy="16" rx="1.2" ry="1.6" className="fill-foreground" />
            <circle cx="41.8" cy="15.4" r="0.5" className="fill-background" />
          </>
        )}
        
        {/* Nose */}
        <path d="M37 19 L38.5 21 L35.5 21 Z" className="fill-destructive/60" />
        <path d="M37 21 L37 22.5" className="stroke-foreground/40" strokeWidth="0.5" />
        <path d="M35 22 Q37 24 39 22" className="stroke-foreground/30" strokeWidth="0.5" fill="none" />
        
        {/* Whiskers */}
        <g className="stroke-foreground/30" strokeWidth="0.4">
          <line x1="44" y1="18" x2="49" y2="16" />
          <line x1="44" y1="20" x2="49" y2="20" />
          <line x1="44" y1="22" x2="49" y2="24" />
          <line x1="30" y1="18" x2="25" y2="16" />
          <line x1="30" y1="20" x2="25" y2="20" />
          <line x1="30" y1="22" x2="25" y2="24" />
        </g>
      </g>
    </motion.g>
  );
}

function ThemeSwatch({ themeId, isSelected, onClick, isDark }: { themeId: string; isSelected: boolean; onClick: () => void; isDark: boolean }) {
  const theme = themePresets.find(t => t.id === themeId);
  if (!theme) return null;
  const palette = isDark ? theme.dark : theme.light;

  return (
    <button
      onClick={onClick}
      data-testid={`button-theme-${themeId}`}
      className={cn(
        "relative w-8 h-8 rounded-full transition-all duration-200 border-2",
        isSelected ? "border-primary scale-110 shadow-lg shadow-primary/20" : "border-transparent hover:scale-105"
      )}
      style={{ background: `linear-gradient(135deg, hsl(${palette['--primary']}), hsl(${palette['--accent']}))` }}
      title={theme.name}
    >
      {isSelected && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute inset-0 flex items-center justify-center">
          <Check className="w-4 h-4 text-white drop-shadow-md" />
        </motion.div>
      )}
    </button>
  );
}

export function GardenTopBar() {
  const { themeId, setTheme, isDark, toggleDarkMode } = useTheme();
  const currentTheme = themePresets.find(t => t.id === themeId) || themePresets[0];
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const flowers = useMemo(() => [
    { x: 70, type: 'tulip' as const, delay: 0, size: 0.8 },
    { x: 95, type: 'rose' as const, delay: 0.3, size: 0.9 },
    { x: 120, type: 'daisy' as const, delay: 0.5, size: 0.75 },
    { x: 145, type: 'lavender' as const, delay: 0.2, size: 0.85 },
    { x: 170, type: 'rose' as const, delay: 0.7, size: 0.8 },
    { x: 195, type: 'tulip' as const, delay: 0.4, size: 0.7 },
    { x: containerWidth - 220, type: 'sunflower' as const, delay: 0.1, size: 0.85 },
    { x: containerWidth - 195, type: 'rose' as const, delay: 0.6, size: 0.8 },
    { x: containerWidth - 170, type: 'tulip' as const, delay: 0.3, size: 0.75 },
    { x: containerWidth - 145, type: 'lavender' as const, delay: 0.8, size: 0.9 },
    { x: containerWidth - 120, type: 'daisy' as const, delay: 0.2, size: 0.8 },
    { x: containerWidth - 95, type: 'rose' as const, delay: 0.5, size: 0.85 },
  ], [containerWidth]);

  const butterflies = useMemo(() => [
    { delay: 0, startX: 180, color: 'hsl(var(--primary))' },
    { delay: 2, startX: containerWidth - 200, color: 'hsl(var(--accent))' },
    { delay: 4, startX: containerWidth / 2, color: 'hsl(var(--destructive))' },
    { delay: 6, startX: containerWidth / 3, color: 'hsl(var(--warning))' },
  ], [containerWidth]);

  const petals = useMemo(() => 
    Array.from({ length: 8 }, (_, i) => ({
      delay: i * 1.2,
      startX: 80 + (containerWidth - 160) * (i / 7),
    })), [containerWidth]);

  const sparkles = useMemo(() => [
    { x: 100, y: 12, delay: 0, size: 0.8 },
    { x: 160, y: 22, delay: 1.5, size: 0.7 },
    { x: containerWidth - 150, y: 15, delay: 0.8, size: 0.9 },
    { x: containerWidth - 100, y: 25, delay: 2, size: 0.6 },
    { x: containerWidth / 2 - 30, y: 10, delay: 0.5, size: 0.8 },
    { x: containerWidth / 2 + 50, y: 18, delay: 1.2, size: 0.7 },
  ], [containerWidth]);

  const fireflies = useMemo(() => [
    { startX: 130, startY: 18, delay: 0 },
    { startX: containerWidth - 140, startY: 22, delay: 1.5 },
    { startX: containerWidth / 2 + 60, startY: 12, delay: 3 },
  ], [containerWidth]);

  const hearts = useMemo(() => [
    { delay: 0, startX: 110 },
    { delay: 3, startX: containerWidth - 130 },
    { delay: 6, startX: containerWidth / 2 + 20 },
  ], [containerWidth]);

  const clouds = useMemo(() => [
    { x: 90, y: 12, size: 0.6, delay: 0 },
    { x: containerWidth - 130, y: 8, size: 0.5, delay: 1 },
    { x: containerWidth / 2 + 80, y: 14, size: 0.45, delay: 2 },
  ], [containerWidth]);

  return (
    <div ref={containerRef} className="relative w-full h-16 overflow-hidden rounded-b-2xl">
      {/* Sky gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-accent/20 via-primary/10 to-success/20" />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5" />
      
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMax slice">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <linearGradient id="grassGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" className="[stop-color:hsl(var(--success))]" stopOpacity="0.7" />
            <stop offset="100%" className="[stop-color:hsl(var(--success))]" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" className="[stop-color:hsl(var(--accent))]" stopOpacity="0.2" />
            <stop offset="100%" className="[stop-color:hsl(var(--primary))]" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        
        {/* Sun */}
        <AnimatedSun />
        
        {/* Clouds */}
        {clouds.map((cloud, i) => (
          <Cloud key={i} {...cloud} />
        ))}
        
        {/* Birds */}
        <Bird startX={containerWidth / 2 - 50} delay={0} />
        <Bird startX={containerWidth / 2 + 30} delay={4} />
        
        {/* Trees */}
        <Tree x={containerWidth / 2 - 60} type="cherry" />
        <Tree x={containerWidth / 2 + 80} type="round" />
        
        {/* Cottage */}
        <Cottage x={containerWidth / 2 + 10} />
        
        {/* Ground/grass */}
        <path 
          d={`M0 54 Q${containerWidth * 0.25} 48 ${containerWidth * 0.5} 52 Q${containerWidth * 0.75} 56 ${containerWidth} 50 L${containerWidth} 70 L0 70 Z`}
          fill="url(#grassGradient)"
        />
        
        {/* Flowers */}
        {flowers.map((flower, i) => (
          <Flower key={i} {...flower} />
        ))}
        
        {/* Floating elements */}
        {petals.map((petal, i) => (
          <FloatingPetal key={i} {...petal} />
        ))}
        
        {hearts.map((heart, i) => (
          <FloatingHeart key={i} {...heart} />
        ))}
        
        {sparkles.map((sparkle, i) => (
          <Sparkle key={i} {...sparkle} />
        ))}
        
        {fireflies.map((firefly, i) => (
          <Firefly key={i} {...firefly} />
        ))}
        
        {butterflies.map((butterfly, i) => (
          <Butterfly key={i} {...butterfly} />
        ))}
        
        <WalkingCat containerWidth={containerWidth} />
      </svg>
      
      {/* Theme picker */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              data-testid="button-theme-picker"
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full",
                "bg-background/70 backdrop-blur-xl border border-border/40",
                "shadow-lg hover:shadow-xl transition-all duration-300",
                "text-sm font-medium text-foreground"
              )}
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <div 
                className="w-4 h-4 rounded-full border border-white/20"
                style={{ 
                  background: `linear-gradient(135deg, hsl(${(isDark ? currentTheme.dark : currentTheme.light)['--primary']}), hsl(${(isDark ? currentTheme.dark : currentTheme.light)['--accent']}))` 
                }}
              />
              <span className="hidden md:inline text-xs">{currentTheme.name}</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </motion.button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4 bg-card/95 backdrop-blur-xl border-border/60" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-foreground">Garden Theme</h4>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleDarkMode}
                  data-testid="button-toggle-dark-mode"
                  className={cn(
                    "p-2 rounded-full transition-colors",
                    isDark ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <AnimatePresence mode="wait">
                    {isDark ? (
                      <motion.div key="moon" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                        <Moon className="w-5 h-5" />
                      </motion.div>
                    ) : (
                      <motion.div key="sun" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                        <Sun className="w-5 h-5" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              </div>
              <div className="grid grid-cols-5 gap-3">
                {themePresets.map((theme) => (
                  <ThemeSwatch key={theme.id} themeId={theme.id} isSelected={themeId === theme.id} onClick={() => setTheme(theme.id)} isDark={isDark} />
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center">{currentTheme.description}</p>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
