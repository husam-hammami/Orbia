import { motion } from "framer-motion";
import { Lock, Settings, Sparkles, ChevronDown, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import { themePresets } from "@/lib/themePresets";
import { useState } from "react";
import { SetPasswordDialog } from "@/components/lock-screen";
import sphereUrl from '@assets/orbia_sphere_transparent.png';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface MobileHeaderProps {
  lockContext?: {
    isLocked: boolean;
    hasPassword: boolean;
    lock: () => void;
    setPassword: (password: string) => void;
    removePassword: () => void;
  } | null;
}

export function MobileHeader({ lockContext }: MobileHeaderProps) {
  const { themeId, setTheme, isDark, toggleDarkMode } = useTheme();
  const currentTheme = themePresets.find(t => t.id === themeId) || themePresets[0];
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-gradient-to-b from-background via-background/95 to-background/80 backdrop-blur-xl border-b border-border/30 safe-area-top">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <img 
              src={sphereUrl} 
              alt="Orbia" 
              className="h-9 w-9 object-contain drop-shadow-[0_0_6px_hsl(var(--primary)/0.3)]" 
            />
            <span 
              className="text-sm font-bold tracking-[0.2em] bg-gradient-to-r from-[hsl(var(--primary))] via-[hsl(var(--accent))] to-[hsl(var(--primary))] bg-clip-text text-transparent"
              style={{ fontFamily: "'Orbitron', sans-serif" }}
            >
              ORBIA
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {lockContext && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  if (lockContext.hasPassword) {
                    lockContext.lock();
                  } else {
                    setShowPasswordDialog(true);
                  }
                }}
                className={cn(
                  "p-2.5 rounded-full transition-colors",
                  "bg-muted/50 hover:bg-muted",
                  lockContext.hasPassword ? "text-primary" : "text-muted-foreground"
                )}
                data-testid="button-mobile-lock"
              >
                <Lock className="w-4 h-4" />
              </motion.button>
            )}
            
            <Popover open={showThemeMenu} onOpenChange={setShowThemeMenu}>
              <PopoverTrigger asChild>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  className="p-2.5 rounded-full bg-muted/50 hover:bg-muted transition-colors"
                  data-testid="button-mobile-theme"
                >
                  <div 
                    className="w-5 h-5 rounded-full border border-white/20"
                    style={{ 
                      background: `linear-gradient(135deg, hsl(${(isDark ? currentTheme.dark : currentTheme.light)['--primary']}), hsl(${(isDark ? currentTheme.dark : currentTheme.light)['--accent']}))` 
                    }}
                  />
                </motion.button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-3" align="end">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">Theme</h4>
                    <button
                      onClick={toggleDarkMode}
                      className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                    >
                      {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {themePresets.map((theme) => {
                      const palette = isDark ? theme.dark : theme.light;
                      const isSelected = themeId === theme.id;
                      return (
                        <button
                          key={theme.id}
                          onClick={() => { setTheme(theme.id); setShowThemeMenu(false); }}
                          className={cn(
                            "w-10 h-10 rounded-full transition-all",
                            isSelected ? "ring-2 ring-primary ring-offset-2 scale-110" : "hover:scale-105"
                          )}
                          style={{ 
                            background: `linear-gradient(135deg, hsl(${palette['--primary']}), hsl(${palette['--accent']}))` 
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </header>
      
      {lockContext && (
        <SetPasswordDialog
          isOpen={showPasswordDialog}
          onClose={() => setShowPasswordDialog(false)}
          onSetPassword={lockContext.setPassword}
          hasExistingPassword={lockContext.hasPassword}
          onRemovePassword={lockContext.removePassword}
        />
      )}
    </>
  );
}
