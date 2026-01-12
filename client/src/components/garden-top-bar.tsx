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

function Butterfly({ delay, startX, color }: { delay: number; startX: number; color: string }) {
  return (
    <motion.g
      initial={{ x: startX, y: 20 }}
      animate={{
        x: [startX, startX + 30, startX - 20, startX + 10, startX],
        y: [20, 10, 25, 8, 20],
      }}
      transition={{
        duration: 8 + Math.random() * 4,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <motion.path
        d="M0 0 Q-8 -6 -6 -12 Q-2 -8 0 0"
        fill={color}
        animate={{ rotate: [-20, 20, -20] }}
        transition={{ duration: 0.3, repeat: Infinity }}
        style={{ transformOrigin: "0px 0px" }}
      />
      <motion.path
        d="M0 0 Q8 -6 6 -12 Q2 -8 0 0"
        fill={color}
        animate={{ rotate: [20, -20, 20] }}
        transition={{ duration: 0.3, repeat: Infinity }}
        style={{ transformOrigin: "0px 0px" }}
      />
      <motion.path
        d="M0 0 Q-6 4 -4 8 Q-1 5 0 0"
        fill={color}
        opacity={0.8}
        animate={{ rotate: [-15, 15, -15] }}
        transition={{ duration: 0.3, repeat: Infinity }}
        style={{ transformOrigin: "0px 0px" }}
      />
      <motion.path
        d="M0 0 Q6 4 4 8 Q1 5 0 0"
        fill={color}
        opacity={0.8}
        animate={{ rotate: [15, -15, 15] }}
        transition={{ duration: 0.3, repeat: Infinity }}
        style={{ transformOrigin: "0px 0px" }}
      />
      <ellipse cx="0" cy="0" rx="1" ry="4" fill="hsl(var(--foreground))" opacity={0.5} />
      <circle cx="-1" cy="-3" r="0.8" fill="white" opacity={0.6} />
      <circle cx="1" cy="-3" r="0.8" fill="white" opacity={0.6} />
    </motion.g>
  );
}

function Flower({ x, type, delay }: { x: number; type: 'tulip' | 'daisy' | 'rose'; delay: number }) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.g
      transform={`translate(${x}, 0)`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ cursor: 'pointer' }}
    >
      <motion.path
        d={`M0 48 Q${type === 'rose' ? 2 : -2} 38 0 28`}
        className="stroke-success"
        strokeWidth="2"
        fill="none"
        animate={{ 
          d: isHovered 
            ? `M0 48 Q${type === 'rose' ? 4 : -4} 38 0 26`
            : `M0 48 Q${type === 'rose' ? 2 : -2} 38 0 28`
        }}
      />
      
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
          style={{ transformOrigin: "0px 28px" }}
        >
          <path d="M0 28 Q-5 22 -3 16 Q0 12 0 16 Q0 12 3 16 Q5 22 0 28" className="fill-primary" />
          <path d="M-1 24 Q-2 20 0 18" className="stroke-primary/50" strokeWidth="0.5" fill="none" />
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
          style={{ transformOrigin: "0px 28px" }}
        >
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
            <ellipse
              key={angle}
              cx={Math.cos(angle * Math.PI / 180) * 5}
              cy={24 + Math.sin(angle * Math.PI / 180) * 5}
              rx="3"
              ry="1.5"
              className="fill-background"
              transform={`rotate(${angle}, ${Math.cos(angle * Math.PI / 180) * 5}, ${24 + Math.sin(angle * Math.PI / 180) * 5})`}
            />
          ))}
          <circle cx="0" cy="24" r="3" className="fill-warning" />
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
          style={{ transformOrigin: "0px 26px" }}
        >
          <circle cx="0" cy="22" r="6" className="fill-destructive/80" />
          <path d="M-2 22 Q0 18 2 22 Q0 20 -2 22" className="fill-destructive" />
          <path d="M-4 24 Q-2 20 0 24" className="fill-destructive/60" />
          <path d="M4 24 Q2 20 0 24" className="fill-destructive/60" />
        </motion.g>
      )}
      
      <path d="M-3 36 Q-5 34 -6 30" className="stroke-success/80" strokeWidth="1.5" fill="none" />
      <ellipse cx="-6" cy="32" rx="3" ry="1.5" className="fill-success/70" transform="rotate(-30, -6, 32)" />
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
        y: [0, 60],
        x: [0, Math.random() * 20 - 10, Math.random() * 30 - 15],
        opacity: [0, 0.7, 0.7, 0],
        rotate: [0, 180, 360],
      }}
      transition={{
        duration: 6 + Math.random() * 3,
        delay,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  );
}

function Sparkle({ x, y, delay, size = 1 }: { x: number; y: number; delay: number; size?: number }) {
  return (
    <motion.g transform={`translate(${x}, ${y})`}>
      <motion.path
        d={`M0 ${-3 * size} L${size} 0 L0 ${3 * size} L${-size} 0 Z`}
        className="fill-warning/60"
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: [0, 1, 0.5, 1, 0],
          opacity: [0, 1, 0.5, 1, 0],
        }}
        transition={{
          duration: 2 + Math.random(),
          delay,
          repeat: Infinity,
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
      initial={{ opacity: 0 }}
      animate={{
        x: [0, 15, -10, 20, 0],
        y: [0, -8, 5, -12, 0],
        opacity: [0, 0.8, 0.3, 0.9, 0],
      }}
      transition={{
        duration: 5 + Math.random() * 2,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      filter="url(#glow)"
    />
  );
}

function FloatingHeart({ delay, startX }: { delay: number; startX: number }) {
  return (
    <motion.path
      d={`M${startX} 5 C${startX - 2} 2 ${startX - 4} 5 ${startX} 9 C${startX + 4} 5 ${startX + 2} 2 ${startX} 5`}
      className="fill-destructive/30"
      initial={{ y: 50, opacity: 0, scale: 0.5 }}
      animate={{
        y: [-10],
        opacity: [0, 0.6, 0.6, 0],
        scale: [0.5, 1, 0.8],
      }}
      transition={{
        duration: 5 + Math.random() * 2,
        delay,
        repeat: Infinity,
        ease: "easeOut",
      }}
    />
  );
}

function WalkingCat({ containerWidth }: { containerWidth: number }) {
  const [position, setPosition] = useState(50);
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const [isResting, setIsResting] = useState(false);
  const [isSitting, setIsSitting] = useState(false);
  const [frame, setFrame] = useState(0);
  const [blinkFrame, setBlinkFrame] = useState(0);
  const restTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (restTimeoutRef.current) clearTimeout(restTimeoutRef.current);
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
        
        if (newPos > containerWidth - 80) {
          setDirection('left');
          return containerWidth - 80;
        } else if (newPos < 30) {
          setDirection('right');
          return 30;
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
      <g transform={`translate(0, ${isSitting ? 8 : bodyBob}) ${direction === 'left' ? 'scale(-1,1) translate(-50,0)' : ''}`}>
        <motion.path
          d={isSitting ? "M8 28 Q2 22 4 16 Q6 10 10 8" : "M8 26 Q4 22 3 16 Q2 10 6 6"}
          className="stroke-primary"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          animate={{ rotate: isSitting ? [0, 8, 0, -8, 0] : tailPhase }}
          transition={isSitting ? { duration: 2, repeat: Infinity } : { duration: 0.15 }}
          style={{ transformOrigin: "8px 28px" }}
        />
        
        {!isSitting && (
          <>
            <motion.path d="M14 30 Q12 34 13 38" className="stroke-primary" strokeWidth="4" strokeLinecap="round" fill="none"
              animate={{ rotate: legPhase * 3 }} style={{ transformOrigin: "14px 30px" }} />
            <motion.path d="M20 30 Q18 34 19 38" className="stroke-primary" strokeWidth="4" strokeLinecap="round" fill="none"
              animate={{ rotate: -legPhase * 3 }} style={{ transformOrigin: "20px 30px" }} />
            <motion.path d="M30 28 Q28 33 29 38" className="stroke-primary" strokeWidth="4" strokeLinecap="round" fill="none"
              animate={{ rotate: -legPhase * 4 }} style={{ transformOrigin: "30px 28px" }} />
            <motion.path d="M34 26 Q32 32 33 38" className="stroke-primary" strokeWidth="4" strokeLinecap="round" fill="none"
              animate={{ rotate: legPhase * 4 }} style={{ transformOrigin: "34px 26px" }} />
          </>
        )}
        
        <ellipse cx={isSitting ? "22" : "22"} cy={isSitting ? "26" : "24"} rx={isSitting ? "11" : "13"} ry={isSitting ? "9" : "8"} className="fill-primary" />
        <ellipse cx="22" cy={isSitting ? "28" : "26"} rx="5" ry="3" className="fill-accent/40" />
        
        {isSitting && (
          <>
            <ellipse cx="14" cy="32" rx="4" ry="3" className="fill-primary" />
            <ellipse cx="30" cy="32" rx="4" ry="3" className="fill-primary" />
          </>
        )}
        
        <ellipse cx="36" cy="20" rx="5" ry="7" className="fill-primary" />
        
        <circle cx="42" cy="14" r="9" className="fill-primary" />
        <ellipse cx="36" cy="15" rx="2.5" ry="3" className="fill-primary/60" />
        <ellipse cx="48" cy="15" rx="2.5" ry="3" className="fill-primary/60" />
        
        <path d="M34 10 L36 3 L40 8 Z" className="fill-primary" />
        <path d="M35.5 9 L36.5 5 L38.5 8 Z" className="fill-accent/50" />
        <path d="M46 8 L50 3 L52 10 Z" className="fill-primary" />
        <path d="M47.5 8 L49.5 5 L50.5 9 Z" className="fill-accent/50" />
        
        {blinkFrame === 1 ? (
          <>
            <path d="M37 12 Q39 11 41 12" className="stroke-foreground" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            <path d="M45 12 Q47 11 49 12" className="stroke-foreground" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </>
        ) : (
          <>
            <ellipse cx="39" cy="12" rx="2.5" ry="3" className="fill-background" />
            <ellipse cx="39.5" cy="12" rx="1.5" ry="2" className="fill-foreground" />
            <circle cx="40.2" cy="11.2" r="0.6" className="fill-background" />
            <ellipse cx="47" cy="12" rx="2.5" ry="3" className="fill-background" />
            <ellipse cx="47.5" cy="12" rx="1.5" ry="2" className="fill-foreground" />
            <circle cx="48.2" cy="11.2" r="0.6" className="fill-background" />
          </>
        )}
        
        <path d="M43 15 L44.5 17 L41.5 17 Z" className="fill-destructive/60" />
        <path d="M43 17 L43 18.5" className="stroke-foreground/40" strokeWidth="0.6" />
        <path d="M41 18 Q43 20 45 18" className="stroke-foreground/30" strokeWidth="0.6" fill="none" />
        
        <g className="stroke-foreground/30" strokeWidth="0.4">
          <line x1="50" y1="14" x2="56" y2="12" />
          <line x1="50" y1="16" x2="56" y2="16" />
          <line x1="50" y1="18" x2="56" y2="20" />
          <line x1="36" y1="14" x2="30" y2="12" />
          <line x1="36" y1="16" x2="30" y2="16" />
          <line x1="36" y1="18" x2="30" y2="20" />
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
  const { themeId, isDark, setTheme, toggleDarkMode, currentTheme } = useTheme();
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
    { x: 40, type: 'tulip' as const, delay: 0 },
    { x: 90, type: 'daisy' as const, delay: 0.5 },
    { x: 150, type: 'rose' as const, delay: 1 },
    { x: containerWidth - 180, type: 'tulip' as const, delay: 0.3 },
    { x: containerWidth - 120, type: 'daisy' as const, delay: 0.8 },
    { x: containerWidth - 60, type: 'rose' as const, delay: 0.2 },
  ], [containerWidth]);

  const butterflies = useMemo(() => [
    { delay: 0, startX: 100, color: 'hsl(var(--primary))' },
    { delay: 2, startX: containerWidth - 150, color: 'hsl(var(--accent))' },
    { delay: 4, startX: containerWidth / 2, color: 'hsl(var(--destructive))' },
  ], [containerWidth]);

  const petals = useMemo(() => 
    Array.from({ length: 6 }, (_, i) => ({
      delay: i * 1.5,
      startX: 50 + (containerWidth - 100) * (i / 5),
    })), [containerWidth]);

  const sparkles = useMemo(() => [
    { x: 60, y: 15, delay: 0, size: 1 },
    { x: 130, y: 25, delay: 1.5, size: 0.8 },
    { x: containerWidth - 100, y: 18, delay: 0.8, size: 1.2 },
    { x: containerWidth - 40, y: 28, delay: 2, size: 0.7 },
    { x: containerWidth / 2 - 20, y: 12, delay: 0.5, size: 1 },
  ], [containerWidth]);

  const fireflies = useMemo(() => [
    { startX: 80, startY: 20, delay: 0 },
    { startX: containerWidth - 90, startY: 25, delay: 1.5 },
    { startX: containerWidth / 2 + 50, startY: 15, delay: 3 },
  ], [containerWidth]);

  const hearts = useMemo(() => [
    { delay: 0, startX: 70 },
    { delay: 3, startX: containerWidth - 80 },
    { delay: 6, startX: containerWidth / 2 },
  ], [containerWidth]);

  return (
    <div ref={containerRef} className="relative w-full h-14 overflow-hidden rounded-b-2xl">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-accent/10 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-accent/10" />
      
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
            <stop offset="0%" className="[stop-color:hsl(var(--success))]" stopOpacity="0.6" />
            <stop offset="100%" className="[stop-color:hsl(var(--success))]" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        
        <path 
          d={`M0 50 Q${containerWidth * 0.25} 44 ${containerWidth * 0.5} 48 Q${containerWidth * 0.75} 52 ${containerWidth} 46 L${containerWidth} 60 L0 60 Z`}
          fill="url(#grassGradient)"
        />
        
        {flowers.map((flower, i) => (
          <Flower key={i} {...flower} />
        ))}
        
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
