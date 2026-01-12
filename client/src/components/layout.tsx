import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Settings, Briefcase, Wallet, ClipboardList, Orbit, Lock, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { GardenTopBar } from "@/components/garden-top-bar";
import { motion } from "framer-motion";
import { useTheme } from "@/hooks/useTheme";
import { themePresets } from "@/lib/themePresets";
import { SetPasswordDialog } from "@/components/lock-screen";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface SidebarProps {
  className?: string;
}

import logoUrl from '@assets/ChatGPT_Image_Jan_10,_2026,_05_13_01_PM_1768050787078.png';

const AFFIRMATIONS = [
  "You're doing amazing, habibi! 💕",
  "One step at a time, you've got this! ✨",
  "Today is full of possibilities! 🌸",
  "Your energy is beautiful today! 🦋",
  "Small wins lead to big dreams! 🌟",
  "Be gentle with yourself today 💗",
  "You're exactly where you need to be 🌷",
  "Magic happens when you believe! ✨",
];

function getDailyAffirmation() {
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  return AFFIRMATIONS[dayOfYear % AFFIRMATIONS.length];
}

const PHILOSOPHER_QUOTES = [
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
  { text: "The unexamined life is not worth living.", author: "Socrates" },
  { text: "He who has a why to live can bear almost any how.", author: "Friedrich Nietzsche" },
  { text: "Happiness is not something ready made. It comes from your own actions.", author: "Dalai Lama" },
  { text: "No man is free who is not master of himself.", author: "Epictetus" },
  { text: "The soul becomes dyed with the color of its thoughts.", author: "Marcus Aurelius" },
  { text: "Knowing yourself is the beginning of all wisdom.", author: "Aristotle" },
  { text: "The mind is everything. What you think you become.", author: "Buddha" },
  { text: "Peace comes from within. Do not seek it without.", author: "Buddha" },
  { text: "This too shall pass.", author: "Persian Proverb" },
  { text: "The obstacle is the way.", author: "Marcus Aurelius" },
];

function getDailyQuote() {
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  return PHILOSOPHER_QUOTES[dayOfYear % PHILOSOPHER_QUOTES.length];
}

function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();

  const links = [
    { href: "/", label: "Daily Tracker", icon: ClipboardList },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/orbit", label: "Orbia", icon: Orbit },
    { href: "/career", label: "Goals & Vision", icon: Briefcase },
    { href: "/finance", label: "Finance", icon: Wallet },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className={cn(
      "flex flex-col h-full pt-0 pb-4 px-3",
      "bg-card/70 backdrop-blur-xl border-r border-border/60",
      className
    )}>
      <div className="-mb-2 -mx-3 -mt-4">
        <img 
          src={logoUrl} 
          alt="Orbia Logo" 
          className="w-[160%] max-w-none h-auto object-contain -ml-[30%]" 
        />
      </div>

      <nav className="space-y-1 flex-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
            >
              <Icon className={cn(
                "w-5 h-5 transition-transform",
                isActive ? "stroke-2" : "stroke-[1.5]",
                !isActive && "group-hover:scale-110"
              )} />
              <span className={cn(
                "text-sm",
                isActive ? "font-semibold" : "font-medium"
              )}>{link.label}</span>
              {isActive && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white/40 rounded-l-full" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-4 mt-4">
        {(() => {
          const quote = getDailyQuote();
          return (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-muted/50 to-primary/5 border border-border/60 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              <p className="text-xs font-semibold text-primary mb-2 uppercase tracking-wide">Quote of the day</p>
              <p className="text-sm italic text-foreground/80 font-serif leading-relaxed relative z-10">"{quote.text}"</p>
              <p className="text-xs text-muted-foreground mt-2 text-right font-medium">— {quote.author}</p>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

const mobileNavItems = [
  { href: "/", label: "Today", icon: ClipboardList },
  { href: "/dashboard", label: "Insights", icon: LayoutDashboard },
  { href: "/orbit", label: "Orbia", icon: Orbit, special: true },
  { href: "/career", label: "Goals", icon: Briefcase },
  { href: "/settings", label: "Settings", icon: Settings },
];

function MobileBottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="mx-3 mb-3">
        <div className="bg-background/90 backdrop-blur-2xl rounded-2xl border border-border/40 shadow-xl shadow-black/5">
          <div className="flex items-center justify-around h-16 px-1">
            {mobileNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              
              if (item.special) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="relative -mt-6"
                    data-testid={`nav-${item.label.toLowerCase()}`}
                  >
                    <motion.div
                      whileTap={{ scale: 0.9 }}
                      className={cn(
                        "w-14 h-14 rounded-full flex items-center justify-center shadow-lg",
                        "bg-gradient-to-br from-primary to-accent",
                        "border-4 border-background"
                      )}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </motion.div>
                    <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-medium text-primary whitespace-nowrap">
                      {item.label}
                    </span>
                  </Link>
                );
              }
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-all",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <motion.div
                    whileTap={{ scale: 0.85 }}
                    className="relative"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="mobile-nav-indicator"
                        className="absolute -inset-2 rounded-xl bg-primary/10"
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      />
                    )}
                    <Icon className={cn(
                      "w-5 h-5 relative z-10 transition-all",
                      isActive && "scale-110"
                    )} />
                  </motion.div>
                  <span className={cn(
                    "text-[10px] transition-all",
                    isActive ? "font-semibold" : "font-medium"
                  )}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}

interface MobileHeaderProps {
  lockContext?: {
    isLocked: boolean;
    hasPassword: boolean;
    lock: () => void;
    setPassword: (password: string) => void;
    removePassword: () => void;
  } | null;
}

function MobileHeader({ lockContext }: MobileHeaderProps) {
  const { themeId, setTheme, isDark, toggleDarkMode } = useTheme();
  const currentTheme = themePresets.find(t => t.id === themeId) || themePresets[0];
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const affirmation = getDailyAffirmation();

  return (
    <>
      <header className="sticky top-0 z-40 md:hidden">
        <div className="bg-gradient-to-b from-primary/5 via-background to-background/95 backdrop-blur-xl">
          <div className="px-4 pt-3 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img 
                  src={logoUrl} 
                  alt="Orbia" 
                  className="h-16 w-auto object-contain" 
                />
              </div>
              
              <div className="flex items-center gap-1.5">
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
                      "w-9 h-9 rounded-full flex items-center justify-center transition-colors",
                      "bg-white/60 backdrop-blur-sm border border-white/40",
                      lockContext.hasPassword ? "text-primary" : "text-muted-foreground"
                    )}
                    data-testid="button-mobile-lock"
                  >
                    <Lock className="w-4 h-4" />
                  </motion.button>
                )}
                
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleDarkMode}
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-white/60 backdrop-blur-sm border border-white/40 text-muted-foreground"
                >
                  {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </motion.button>
                
                <Popover open={showThemeMenu} onOpenChange={setShowThemeMenu}>
                  <PopoverTrigger asChild>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      className="w-9 h-9 rounded-full flex items-center justify-center bg-white/60 backdrop-blur-sm border border-white/40"
                      data-testid="button-mobile-theme"
                    >
                      <div 
                        className="w-5 h-5 rounded-full border border-white/30 shadow-inner"
                        style={{ 
                          background: `linear-gradient(135deg, hsl(${(isDark ? currentTheme.dark : currentTheme.light)['--primary']}), hsl(${(isDark ? currentTheme.dark : currentTheme.light)['--accent']}))` 
                        }}
                      />
                    </motion.button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3 mr-2" align="end" sideOffset={8}>
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-center">Choose your vibe ✨</h4>
                      <div className="grid grid-cols-5 gap-2">
                        {themePresets.map((theme) => {
                          const palette = isDark ? theme.dark : theme.light;
                          const isSelected = themeId === theme.id;
                          return (
                            <motion.button
                              key={theme.id}
                              whileTap={{ scale: 0.85 }}
                              onClick={() => { setTheme(theme.id); setShowThemeMenu(false); }}
                              className={cn(
                                "w-10 h-10 rounded-full transition-all shadow-md",
                                isSelected && "ring-2 ring-primary ring-offset-2 scale-110"
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
            
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 px-1"
            >
              <p className="text-sm font-medium text-primary/80 text-center">
                {affirmation}
              </p>
            </motion.div>
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

interface LayoutProps {
  children: React.ReactNode;
  lockContext?: MobileHeaderProps['lockContext'];
}

export function Layout({ children, lockContext }: LayoutProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
      <aside className="hidden md:block w-64 flex-shrink-0">
        <Sidebar />
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <MobileHeader lockContext={lockContext} />

        <div className="hidden md:block">
          <GardenTopBar />
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden pb-24 md:pb-0">
          <div className="w-full px-3 md:px-6 lg:px-8 xl:px-10 py-3 md:py-6 lg:py-8 space-y-4 md:space-y-6">
            {children}
          </div>
        </div>
        
        <MobileBottomNav />
      </main>
    </div>
  );
}
