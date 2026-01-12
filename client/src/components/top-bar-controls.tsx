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
  const [frame, setFrame] = useState(0);
  const restTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (restTimeoutRef.current) {
        clearTimeout(restTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isResting) return;

    const walkInterval = setInterval(() => {
      setFrame((f) => (f + 1) % 4);
      setPosition((p) => {
        const step = direction === 'right' ? 2 : -2;
        const newPos = p + step;
        
        if (newPos > 120) {
          setDirection('left');
          return 120;
        } else if (newPos < 0) {
          setDirection('right');
          return 0;
        }
        
        if (Math.random() < 0.01) {
          setIsResting(true);
          restTimeoutRef.current = setTimeout(() => setIsResting(false), 2000 + Math.random() * 3000);
        }
        
        return newPos;
      });
    }, 120);

    return () => clearInterval(walkInterval);
  }, [direction, isResting]);

  const tailWag = frame % 2 === 0 ? -15 : 15;
  const legOffset = frame % 2 === 0;
  const earTwitch = frame === 0;

  return (
    <div className="relative w-40 h-8 overflow-hidden">
      <motion.div
        className="absolute bottom-0"
        style={{ left: position }}
        animate={{ x: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <svg
          width="24"
          height="20"
          viewBox="0 0 24 20"
          fill="none"
          className={cn("transition-transform", direction === 'left' && "scale-x-[-1]")}
        >
          {/* Body */}
          <ellipse cx="12" cy="14" rx="7" ry="5" className="fill-primary/80" />
          
          {/* Head */}
          <circle cx="18" cy="10" r="4" className="fill-primary/80" />
          
          {/* Ears */}
          <motion.path
            d="M15 6 L16 2 L18 5 Z"
            className="fill-primary"
            animate={{ rotate: earTwitch ? -5 : 0 }}
            style={{ originX: "16px", originY: "5px" }}
          />
          <motion.path
            d="M19 5 L21 1 L22 4 Z"
            className="fill-primary"
            animate={{ rotate: earTwitch ? 5 : 0 }}
            style={{ originX: "21px", originY: "4px" }}
          />
          
          {/* Inner ears */}
          <path d="M15.5 5.5 L16.3 3 L17.5 5 Z" className="fill-primary/40" />
          <path d="M19.5 4.5 L20.8 2 L21.5 4 Z" className="fill-primary/40" />
          
          {/* Eyes */}
          {isResting ? (
            <>
              <path d="M16 9 Q17 8.5 18 9" stroke="currentColor" strokeWidth="0.5" className="stroke-background" />
              <path d="M19 9 Q20 8.5 21 9" stroke="currentColor" strokeWidth="0.5" className="stroke-background" />
            </>
          ) : (
            <>
              <circle cx="17" cy="9" r="1" className="fill-background" />
              <circle cx="20" cy="9" r="1" className="fill-background" />
              <circle cx="17.3" cy="9" r="0.4" className="fill-foreground" />
              <circle cx="20.3" cy="9" r="0.4" className="fill-foreground" />
            </>
          )}
          
          {/* Nose */}
          <path d="M21 10 L22 11 L21 11 Z" className="fill-destructive/60" />
          
          {/* Whiskers */}
          <line x1="21" y1="10.5" x2="24" y2="9.5" stroke="currentColor" strokeWidth="0.3" className="stroke-foreground/30" />
          <line x1="21" y1="11" x2="24" y2="11" stroke="currentColor" strokeWidth="0.3" className="stroke-foreground/30" />
          <line x1="21" y1="11.5" x2="24" y2="12.5" stroke="currentColor" strokeWidth="0.3" className="stroke-foreground/30" />
          
          {/* Legs */}
          <motion.rect
            x="7"
            y="17"
            width="2"
            height="3"
            rx="1"
            className="fill-primary/70"
            animate={{ y: legOffset ? 17 : 16 }}
          />
          <motion.rect
            x="11"
            y="17"
            width="2"
            height="3"
            rx="1"
            className="fill-primary/70"
            animate={{ y: !legOffset ? 17 : 16 }}
          />
          <motion.rect
            x="14"
            y="15"
            width="2"
            height="4"
            rx="1"
            className="fill-primary/70"
            animate={{ y: legOffset ? 15 : 14 }}
          />
          
          {/* Tail */}
          <motion.path
            d="M5 14 Q2 10 3 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            className="stroke-primary/80"
            animate={{ rotate: isResting ? tailWag * 2 : tailWag }}
            style={{ originX: "5px", originY: "14px" }}
          />
        </svg>
      </motion.div>
      
      {/* Floor line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
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
