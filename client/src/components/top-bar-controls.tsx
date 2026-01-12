import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/hooks/useTheme";
import { themePresets } from "@/lib/themePresets";
import { Sun, Moon, Palette, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function AnimatedKitty() {
  const [position, setPosition] = useState(0);
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const [isResting, setIsResting] = useState(false);
  const [isSitting, setIsSitting] = useState(false);
  const [isStretching, setIsStretching] = useState(false);
  const [frame, setFrame] = useState(0);
  const [blinkFrame, setBlinkFrame] = useState(0);
  const restTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerWidth = 200;

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
    if (isResting || isSitting || isStretching) return;

    const walkInterval = setInterval(() => {
      setFrame((f) => (f + 1) % 8);
      setPosition((p) => {
        const step = direction === 'right' ? 1.5 : -1.5;
        const newPos = p + step;
        
        if (newPos > containerWidth - 60) {
          setDirection('left');
          return containerWidth - 60;
        } else if (newPos < 0) {
          setDirection('right');
          return 0;
        }
        
        const rand = Math.random();
        if (rand < 0.005) {
          setIsSitting(true);
          restTimeoutRef.current = setTimeout(() => setIsSitting(false), 3000 + Math.random() * 2000);
        } else if (rand < 0.008) {
          setIsStretching(true);
          restTimeoutRef.current = setTimeout(() => setIsStretching(false), 1500);
        } else if (rand < 0.012) {
          setIsResting(true);
          restTimeoutRef.current = setTimeout(() => setIsResting(false), 2000 + Math.random() * 2000);
        }
        
        return newPos;
      });
    }, 80);

    return () => clearInterval(walkInterval);
  }, [direction, isResting, isSitting, isStretching]);

  const walkCycle = [0, 1, 2, 3, 2, 1, 0, -1];
  const legPhase = walkCycle[frame];
  const bodyBob = Math.sin(frame * Math.PI / 4) * 0.5;
  const tailPhase = Math.sin(frame * Math.PI / 2) * 12;
  const earTwitch = frame === 0 || frame === 4;

  return (
    <div className="relative h-12 overflow-hidden" style={{ width: containerWidth }}>
      <motion.div
        className="absolute bottom-1"
        animate={{ left: position }}
        transition={{ type: "tween", duration: 0.08 }}
      >
        <svg
          width="60"
          height="44"
          viewBox="0 0 60 44"
          fill="none"
          className={cn("drop-shadow-md", direction === 'left' && "scale-x-[-1]")}
        >
          <defs>
            <linearGradient id="furGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" className="[stop-color:hsl(var(--primary))]" stopOpacity="1" />
              <stop offset="100%" className="[stop-color:hsl(var(--primary))]" stopOpacity="0.7" />
            </linearGradient>
            <linearGradient id="bellyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" className="[stop-color:hsl(var(--primary))]" stopOpacity="0.3" />
              <stop offset="100%" className="[stop-color:hsl(var(--accent))]" stopOpacity="0.5" />
            </linearGradient>
            <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.2"/>
            </filter>
          </defs>
          
          <g transform={`translate(0, ${isSitting ? 4 : isStretching ? -2 : bodyBob})`}>
            {/* Tail - behind body */}
            <motion.path
              d={isSitting 
                ? "M8 28 Q2 22 4 16 Q6 10 10 8"
                : isStretching
                ? "M6 26 Q0 24 -2 18 Q-3 12 0 8"
                : "M8 26 Q4 22 3 16 Q2 10 6 6"
              }
              stroke="url(#furGradient)"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
              filter="url(#softShadow)"
              animate={{ 
                rotate: isSitting ? [0, 8, 0, -8, 0] : tailPhase,
                d: isSitting 
                  ? "M8 28 Q2 22 4 16 Q6 10 10 8"
                  : isStretching
                  ? "M6 26 Q0 24 -2 18 Q-3 12 0 8"
                  : undefined
              }}
              transition={isSitting ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : { duration: 0.15 }}
              style={{ transformOrigin: "8px 28px" }}
            />
            
            {/* Tail fur detail */}
            <motion.path
              d={isSitting ? "M6 20 Q8 18 6 16" : "M5 18 Q7 16 5 14"}
              className="stroke-primary/30"
              strokeWidth="1"
              fill="none"
              animate={{ rotate: isSitting ? [0, 8, 0, -8, 0] : tailPhase }}
              transition={isSitting ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : { duration: 0.15 }}
              style={{ transformOrigin: "8px 28px" }}
            />
            
            {/* Back legs */}
            {!isSitting && (
              <>
                <motion.path
                  d="M14 32 Q12 36 13 40 Q14 42 16 42"
                  stroke="url(#furGradient)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  fill="none"
                  animate={{ rotate: isStretching ? -15 : legPhase * 3 }}
                  style={{ transformOrigin: "14px 32px" }}
                />
                <motion.path
                  d="M20 32 Q18 36 19 40 Q20 42 22 42"
                  stroke="url(#furGradient)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  fill="none"
                  animate={{ rotate: isStretching ? -10 : -legPhase * 3 }}
                  style={{ transformOrigin: "20px 32px" }}
                />
              </>
            )}
            
            {/* Body */}
            <motion.ellipse
              cx={isSitting ? "22" : isStretching ? "24" : "22"}
              cy={isSitting ? "28" : "26"}
              rx={isSitting ? "12" : isStretching ? "16" : "14"}
              ry={isSitting ? "10" : isStretching ? "8" : "9"}
              fill="url(#furGradient)"
              filter="url(#softShadow)"
            />
            
            {/* Belly fur pattern */}
            <ellipse
              cx={isSitting ? "22" : "22"}
              cy={isSitting ? "30" : "28"}
              rx="6"
              ry={isSitting ? "5" : "4"}
              fill="url(#bellyGradient)"
            />
            
            {/* Front legs */}
            {!isSitting && (
              <>
                <motion.path
                  d="M30 30 Q28 35 29 40 Q30 42 32 42"
                  stroke="url(#furGradient)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  fill="none"
                  animate={{ rotate: isStretching ? 25 : -legPhase * 4 }}
                  style={{ transformOrigin: "30px 30px" }}
                />
                <motion.path
                  d="M34 28 Q32 34 33 40 Q34 42 36 42"
                  stroke="url(#furGradient)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  fill="none"
                  animate={{ rotate: isStretching ? 30 : legPhase * 4 }}
                  style={{ transformOrigin: "34px 28px" }}
                />
              </>
            )}
            
            {/* Sitting legs */}
            {isSitting && (
              <>
                <ellipse cx="14" cy="34" rx="5" ry="4" fill="url(#furGradient)" />
                <ellipse cx="30" cy="34" rx="5" ry="4" fill="url(#furGradient)" />
                <path d="M28 36 Q30 38 32 36" className="stroke-primary/40" strokeWidth="1" fill="none" />
                <path d="M12 36 Q14 38 16 36" className="stroke-primary/40" strokeWidth="1" fill="none" />
              </>
            )}
            
            {/* Paw details */}
            {!isSitting && !isStretching && (
              <>
                <circle cx="16" cy="42" r="2" className="fill-accent/60" />
                <circle cx="22" cy="42" r="2" className="fill-accent/60" />
                <circle cx="32" cy="42" r="2" className="fill-accent/60" />
                <circle cx="36" cy="42" r="2" className="fill-accent/60" />
              </>
            )}
            
            {/* Neck */}
            <ellipse cx="36" cy="22" rx="6" ry="8" fill="url(#furGradient)" />
            
            {/* Head */}
            <motion.g
              animate={{ 
                y: isSitting ? -2 : isStretching ? -6 : 0,
                rotate: isStretching ? 5 : 0 
              }}
              style={{ transformOrigin: "42px 16px" }}
            >
              <circle cx="42" cy="14" r="10" fill="url(#furGradient)" filter="url(#softShadow)" />
              
              {/* Cheek fluff */}
              <ellipse cx="36" cy="16" rx="3" ry="4" className="fill-primary/50" />
              <ellipse cx="48" cy="16" rx="3" ry="4" className="fill-primary/50" />
              
              {/* Ears */}
              <motion.g animate={{ rotate: earTwitch ? -3 : 0 }} style={{ transformOrigin: "38px 8px" }}>
                <path d="M34 10 L36 2 L40 8 Z" fill="url(#furGradient)" />
                <path d="M35.5 9 L36.5 4 L38.5 8 Z" className="fill-accent/60" />
              </motion.g>
              <motion.g animate={{ rotate: earTwitch ? 3 : 0 }} style={{ transformOrigin: "48px 8px" }}>
                <path d="M46 8 L50 2 L52 10 Z" fill="url(#furGradient)" />
                <path d="M47.5 8 L49.5 4 L50.5 9 Z" className="fill-accent/60" />
              </motion.g>
              
              {/* Face details */}
              {/* Eyes */}
              <g>
                {(blinkFrame === 1 || (isSitting && Math.random() < 0.01)) ? (
                  <>
                    <path d="M37 12 Q39 11 41 12" className="stroke-foreground" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                    <path d="M45 12 Q47 11 49 12" className="stroke-foreground" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                  </>
                ) : (
                  <>
                    {/* Left eye */}
                    <ellipse cx="39" cy="12" rx="3" ry="3.5" className="fill-background" />
                    <ellipse cx="39.5" cy="12" rx="2" ry="2.5" className="fill-foreground" />
                    <circle cx="40.5" cy="11" r="0.8" className="fill-background" />
                    <circle cx="38.5" cy="13" r="0.4" className="fill-background/60" />
                    
                    {/* Right eye */}
                    <ellipse cx="47" cy="12" rx="3" ry="3.5" className="fill-background" />
                    <ellipse cx="47.5" cy="12" rx="2" ry="2.5" className="fill-foreground" />
                    <circle cx="48.5" cy="11" r="0.8" className="fill-background" />
                    <circle cx="46.5" cy="13" r="0.4" className="fill-background/60" />
                  </>
                )}
              </g>
              
              {/* Nose */}
              <path d="M43 16 L44.5 18 L41.5 18 Z" className="fill-destructive/70" />
              
              {/* Mouth */}
              <path d="M43 18 L43 19.5" className="stroke-foreground/40" strokeWidth="0.8" />
              <path d="M41 19 Q43 21 45 19" className="stroke-foreground/30" strokeWidth="0.8" fill="none" />
              
              {/* Whiskers */}
              <g className="stroke-foreground/40" strokeWidth="0.5">
                <motion.line 
                  x1="50" y1="15" x2="58" y2="13"
                  animate={{ rotate: [-2, 2, -2] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{ transformOrigin: "50px 15px" }}
                />
                <motion.line 
                  x1="50" y1="17" x2="58" y2="17"
                  animate={{ rotate: [-1, 1, -1] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                  style={{ transformOrigin: "50px 17px" }}
                />
                <motion.line 
                  x1="50" y1="19" x2="58" y2="21"
                  animate={{ rotate: [2, -2, 2] }}
                  transition={{ duration: 2.2, repeat: Infinity }}
                  style={{ transformOrigin: "50px 19px" }}
                />
                <line x1="36" y1="15" x2="28" y2="13" />
                <line x1="36" y1="17" x2="28" y2="17" />
                <line x1="36" y1="19" x2="28" y2="21" />
              </g>
              
              {/* Forehead fur tuft */}
              <path d="M41 6 Q43 4 45 6 Q43 5 41 6" className="fill-primary/60" />
            </motion.g>
          </g>
        </svg>
      </motion.div>
      
      {/* Decorative floor with sparkles */}
      <div className="absolute bottom-0 left-0 right-0">
        <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <motion.div 
          className="absolute bottom-0 left-1/4 w-1 h-1 rounded-full bg-primary/40"
          animate={{ opacity: [0.2, 0.6, 0.2], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.div 
          className="absolute bottom-0 left-1/2 w-1 h-1 rounded-full bg-accent/40"
          animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.3, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
        />
        <motion.div 
          className="absolute bottom-0 left-3/4 w-1 h-1 rounded-full bg-primary/40"
          animate={{ opacity: [0.2, 0.5, 0.2], scale: [0.9, 1.1, 0.9] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: 1 }}
        />
      </div>
    </div>
  );
}

function ThemeSwatch({ themeId, isSelected, onClick, isDark }: { themeId: string; isSelected: boolean; onClick: () => void; isDark: boolean }) {
  const theme = themePresets.find(t => t.id === themeId);
  if (!theme) return null;
  const palette = isDark ? theme.dark : theme.light;

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative w-8 h-8 rounded-full transition-all duration-200 border-2",
        isSelected 
          ? "border-primary scale-110 shadow-lg shadow-primary/20" 
          : "border-transparent hover:scale-105"
      )}
      style={{ 
        background: `linear-gradient(135deg, hsl(${palette['--primary']}), hsl(${palette['--accent']}))` 
      }}
      title={theme.name}
    >
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <Check className="w-4 h-4 text-white drop-shadow-md" />
        </motion.div>
      )}
    </button>
  );
}

export function TopBarControls() {
  const { themeId, isDark, setTheme, toggleDarkMode, currentTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex items-center gap-3">
      {/* Animated Kitty */}
      <div className="hidden sm:block">
        <AnimatedKitty />
      </div>

      {/* Theme Picker */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-full",
              "bg-card/80 backdrop-blur-xl border border-border/60",
              "shadow-lg hover:shadow-xl transition-all duration-300",
              "text-sm font-medium text-foreground"
            )}
          >
            <div 
              className="w-5 h-5 rounded-full border border-white/20"
              style={{ 
                background: `linear-gradient(135deg, hsl(${(isDark ? currentTheme.dark : currentTheme.light)['--primary']}), hsl(${(isDark ? currentTheme.dark : currentTheme.light)['--accent']}))` 
              }}
            />
            <span className="hidden sm:inline">{currentTheme.name}</span>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </motion.button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-80 p-4 bg-card/95 backdrop-blur-xl border-border/60" 
          align="end"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-foreground">Theme</h4>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleDarkMode}
                className={cn(
                  "p-2 rounded-full transition-colors",
                  isDark 
                    ? "bg-primary/10 text-primary" 
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <AnimatePresence mode="wait">
                  {isDark ? (
                    <motion.div
                      key="moon"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Moon className="w-5 h-5" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="sun"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Sun className="w-5 h-5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>

            <div className="grid grid-cols-5 gap-3">
              {themePresets.map((theme) => (
                <ThemeSwatch
                  key={theme.id}
                  themeId={theme.id}
                  isSelected={themeId === theme.id}
                  onClick={() => setTheme(theme.id)}
                  isDark={isDark}
                />
              ))}
            </div>

            <p className="text-xs text-muted-foreground text-center">
              {currentTheme.description}
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
