import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/hooks/useTheme";
import { themePresets } from "@/lib/themePresets";
import { Sun, Moon, ChevronDown, Check, Sparkles, Lock, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useLock } from "@/App";
import { SetPasswordDialog } from "@/components/lock-screen";
import { WatchIconButton } from "@/components/watch-companion";

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
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  let lockContext: ReturnType<typeof useLock> | null = null;
  try {
    lockContext = useLock();
  } catch (e) {}

  return (
    <div ref={containerRef} className="relative w-full h-12 overflow-hidden">
      {/* Subtle animated aurora waves */}
      <div className="absolute inset-0">
        {/* Wave 1 - slow flowing */}
        <motion.div
          animate={{ 
            x: [0, 50, 0],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0"
          style={{
            background: `linear-gradient(90deg, 
              transparent 0%, 
              hsl(var(--primary) / 0.15) 20%, 
              hsl(var(--accent) / 0.2) 50%, 
              hsl(var(--primary) / 0.15) 80%, 
              transparent 100%
            )`,
          }}
        />
        
        {/* Wave 2 - opposite direction */}
        <motion.div
          animate={{ 
            x: [0, -40, 0],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          className="absolute inset-0"
          style={{
            background: `linear-gradient(90deg, 
              transparent 0%, 
              hsl(var(--accent) / 0.1) 30%, 
              hsl(var(--primary) / 0.15) 60%, 
              transparent 100%
            )`,
          }}
        />
        
        {/* Subtle bottom edge glow */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-[2px]"
          style={{
            background: `linear-gradient(90deg, 
              transparent 0%, 
              hsl(var(--primary) / 0.3) 20%, 
              hsl(var(--accent) / 0.4) 50%, 
              hsl(var(--primary) / 0.3) 80%, 
              transparent 100%
            )`,
          }}
        />
      </div>
      
      {/* Theme picker and lock button */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
        <WatchIconButton />
        {lockContext && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (lockContext?.hasPassword) {
                lockContext.lock();
              } else {
                setShowPasswordDialog(true);
              }
            }}
            data-testid="button-lock-app"
            className={cn(
              "p-2 rounded-full",
              "bg-background/50 backdrop-blur-xl border border-border/30",
              "shadow-lg hover:shadow-xl transition-all duration-300",
              lockContext.hasPassword ? "text-primary" : "text-muted-foreground"
            )}
            title={lockContext.hasPassword ? "Lock app" : "Set password"}
          >
            <Lock className="w-4 h-4" />
          </motion.button>
        )}
        
        {/* Settings for password */}
        {lockContext?.hasPassword && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowPasswordDialog(true)}
            data-testid="button-password-settings"
            className={cn(
              "p-2 rounded-full",
              "bg-background/50 backdrop-blur-xl border border-border/30",
              "shadow-lg hover:shadow-xl transition-all duration-300",
              "text-muted-foreground hover:text-foreground"
            )}
            title="Password settings"
          >
            <Settings className="w-4 h-4" />
          </motion.button>
        )}
        
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              data-testid="button-theme-picker"
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full",
                "bg-background/50 backdrop-blur-xl border border-border/30",
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
                <h4 className="font-semibold text-foreground">Theme</h4>
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
      
      {/* Password Dialog */}
      {lockContext && (
        <SetPasswordDialog
          isOpen={showPasswordDialog}
          onClose={() => setShowPasswordDialog(false)}
          onSetPassword={lockContext.setPassword}
          hasExistingPassword={lockContext.hasPassword}
          onRemovePassword={lockContext.removePassword}
        />
      )}
    </div>
  );
}
