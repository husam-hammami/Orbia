import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Settings, Briefcase, Wallet, ClipboardList, Orbit, Lock, Sun, Moon, Newspaper, Clock, Stethoscope, Monitor } from "lucide-react";
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
import orbCleanUrl from '@assets/orbia_orb_clean.png';

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

function CurrentTime() {
  const [time, setTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  const hours24 = time.getHours();
  const hours12 = hours24 % 12 || 12;
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  
  return (
    <div className="flex items-center justify-center gap-2 py-2 -mt-4 mb-2">
      <Clock className="w-4 h-4 text-primary/70" />
      <span className="text-lg font-mono font-medium text-foreground/90">
        {hours12}:{minutes} <span className="text-sm">{ampm}</span>
      </span>
    </div>
  );
}

function MobileCurrentTime() {
  const [time, setTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  const hours24 = time.getHours();
  const hours12 = hours24 % 12 || 12;
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  
  return (
    <div className="flex items-center gap-0.5 mt-0.5">
      <Clock className="w-2.5 h-2.5 text-muted-foreground/50" />
      <span className="text-[10px] font-mono text-muted-foreground/70">
        {hours12}:{minutes} {ampm}
      </span>
    </div>
  );
}

function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();

  const links = [
    { href: "/orbit", label: "Orbia", icon: Orbit },
    { href: "/", label: "Daily Tracker", icon: ClipboardList },
    { href: "/work", label: "Workstation", icon: Monitor },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/career", label: "Vision & Coach", icon: Briefcase },
    { href: "/medical", label: "Medical", icon: Stethoscope },
    { href: "/finance", label: "Finance", icon: Wallet },
    { href: "/news", label: "Orbital News", icon: Newspaper },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className={cn(
      "flex flex-col h-full pt-0 pb-4 px-3",
      className
    )}>
      <div className="-mb-2 -mx-3 -mt-4">
        <img 
          src={logoUrl} 
          alt="Orbia Logo" 
          className="w-[160%] max-w-none h-auto object-contain -ml-[30%] animate-logo-pulse" 
        />
      </div>
      
      <CurrentTime />

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
  { href: "/news", label: "News", icon: Newspaper },
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

  return (
    <>
      <header className="sticky top-0 z-40 md:hidden overflow-hidden">
        <div className="relative">
          <div className="relative z-10 px-4 pt-3 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 w-16">
                {lockContext && (
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => {
                      if (lockContext.hasPassword) {
                        lockContext.lock();
                      } else {
                        setShowPasswordDialog(true);
                      }
                    }}
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                      "bg-card/80 backdrop-blur-md border border-primary/30 shadow-lg shadow-primary/10",
                      lockContext.hasPassword ? "text-primary" : "text-foreground"
                    )}
                    data-testid="button-mobile-lock"
                  >
                    <Lock className="w-5 h-5" />
                  </motion.button>
                )}
              </div>
              
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="relative flex flex-col justify-center items-center"
              >
                {/* Animated fog - dark mode only */}
                {isDark && (
                  <>
                    <motion.div
                      animate={{ 
                        opacity: [0.4, 0.6, 0.4],
                        scale: [1, 1.15, 1],
                        x: [-5, 5, -5]
                      }}
                      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute -inset-x-10 -inset-y-6 pointer-events-none -z-10"
                      style={{
                        background: 'radial-gradient(ellipse 80% 70% at 50% 45%, hsl(var(--primary)/0.25) 0%, hsl(var(--accent)/0.12) 50%, transparent 80%)',
                        filter: 'blur(20px)'
                      }}
                    />
                    <motion.div
                      animate={{ 
                        opacity: [0.3, 0.5, 0.3],
                        scale: [1.1, 1, 1.1],
                        x: [5, -5, 5]
                      }}
                      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute -inset-x-12 -inset-y-8 pointer-events-none -z-20"
                      style={{
                        background: 'radial-gradient(ellipse 90% 80% at 50% 40%, hsl(var(--accent)/0.2) 0%, hsl(var(--primary)/0.1) 60%, transparent 85%)',
                        filter: 'blur(25px)'
                      }}
                    />
                  </>
                )}
                
                {/* Light mode - clean minimal design, no fog */}
                
                {/* Mesmerizing orb with breathing scale + gentle rotation */}
                <motion.img 
                  src={orbCleanUrl} 
                  alt="Orbia" 
                  className="relative z-10 w-16 h-16 object-contain"
                  whileTap={{ scale: 0.95 }}
                  animate={{ 
                    scale: [1, 1.25, 1],
                    rotate: [0, 3, 0, -3, 0],
                    filter: isDark 
                      ? [
                          "drop-shadow(0 0 8px hsl(var(--primary)/0.4)) drop-shadow(0 0 15px hsl(var(--accent)/0.2))",
                          "drop-shadow(0 0 18px hsl(var(--primary)/0.7)) drop-shadow(0 0 30px hsl(var(--accent)/0.4))",
                          "drop-shadow(0 0 8px hsl(var(--primary)/0.4)) drop-shadow(0 0 15px hsl(var(--accent)/0.2))"
                        ]
                      : [
                          "drop-shadow(0 0 4px hsl(var(--primary)/0.2))",
                          "drop-shadow(0 0 10px hsl(var(--primary)/0.35))",
                          "drop-shadow(0 0 4px hsl(var(--primary)/0.2))"
                        ]
                  }}
                  transition={{ 
                    duration: 5,
                    repeat: Infinity, 
                    ease: "easeInOut",
                    times: [0, 0.5, 1]
                  }}
                />
                
                {/* ORBIA text with matching glow pulse */}
                <motion.div 
                  className="flex flex-col items-center relative z-10 mt-1"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                >
                  <motion.span 
                    className={cn(
                      "font-display text-lg font-bold tracking-[0.3em] uppercase",
                      isDark ? "text-white" : "text-foreground"
                    )}
                    animate={{ 
                      textShadow: isDark 
                        ? [
                            '0 0 8px hsl(var(--primary)/0.4), 0 0 20px hsl(var(--primary)/0.2)',
                            '0 0 20px hsl(var(--primary)/0.7), 0 0 40px hsl(var(--primary)/0.4)',
                            '0 0 8px hsl(var(--primary)/0.4), 0 0 20px hsl(var(--primary)/0.2)'
                          ]
                        : [
                            '0 1px 2px rgba(0,0,0,0.08)',
                            '0 1px 6px rgba(0,0,0,0.12)',
                            '0 1px 2px rgba(0,0,0,0.08)'
                          ]
                    }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    ORBIA
                  </motion.span>
                  <MobileCurrentTime />
                </motion.div>
              </motion.div>
              
              <div className="flex items-center gap-1.5 w-16 justify-end">
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={toggleDarkMode}
                  className="w-10 h-10 rounded-xl flex items-center justify-center bg-card/80 backdrop-blur-md border border-primary/30 shadow-lg shadow-primary/10 text-foreground"
                >
                  {isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </motion.button>
                
                <Popover open={showThemeMenu} onOpenChange={setShowThemeMenu}>
                  <PopoverTrigger asChild>
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      className="w-10 h-10 rounded-xl flex items-center justify-center bg-card/80 backdrop-blur-md border border-primary/30 shadow-lg shadow-primary/10"
                      data-testid="button-mobile-theme"
                    >
                      <div 
                        className="w-6 h-6 rounded-full border-2 border-white/50 shadow-lg"
                        style={{ 
                          background: `linear-gradient(135deg, hsl(${(isDark ? currentTheme.dark : currentTheme.light)['--primary']}), hsl(${(isDark ? currentTheme.dark : currentTheme.light)['--accent']}))` 
                        }}
                      />
                    </motion.button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-4 mr-2" align="end" sideOffset={8}>
                    <div className="space-y-4">
                      <h4 className="font-bold text-base text-center">Choose your vibe</h4>
                      <div className="grid grid-cols-5 gap-3">
                        {themePresets.map((theme) => {
                          const palette = isDark ? theme.dark : theme.light;
                          const isSelected = themeId === theme.id;
                          return (
                            <motion.button
                              key={theme.id}
                              whileTap={{ scale: 0.8 }}
                              whileHover={{ scale: 1.1 }}
                              onClick={() => { setTheme(theme.id); setShowThemeMenu(false); }}
                              className={cn(
                                "w-12 h-12 rounded-full transition-all shadow-lg",
                                isSelected && "ring-3 ring-primary ring-offset-2 scale-110"
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

function AnimatedBackground() {
  const { isDark } = useTheme();
  
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-background">
      {/* Dark mode: Rich aurora effect */}
      {isDark && (
        <>
          <motion.div
            animate={{ 
              x: [0, 30, 0],
              y: [0, -20, 0],
              rotate: [0, 3, 0],
              scale: [1, 1.05, 1]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-1/4 -left-1/4 w-[150%] h-[80%]"
            style={{
              background: `
                radial-gradient(ellipse 80% 60% at 20% 30%, hsl(var(--primary) / 0.35), transparent 60%),
                radial-gradient(ellipse 60% 50% at 70% 20%, hsl(var(--accent) / 0.3), transparent 55%),
                radial-gradient(ellipse 50% 40% at 40% 60%, hsl(var(--primary) / 0.2), transparent 50%)
              `,
              filter: 'blur(60px)',
            }}
          />
          
          <motion.div
            animate={{ 
              x: [0, -25, 0],
              y: [0, 15, 0],
              rotate: [0, -2, 0]
            }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute top-1/4 -right-1/4 w-[120%] h-[70%]"
            style={{
              background: `
                radial-gradient(ellipse 70% 55% at 80% 40%, hsl(var(--accent) / 0.3), transparent 55%),
                radial-gradient(ellipse 55% 45% at 30% 70%, hsl(var(--primary) / 0.25), transparent 50%)
              `,
              filter: 'blur(70px)',
            }}
          />
          
          <motion.div
            animate={{ 
              opacity: [0.4, 0.6, 0.4],
              scale: [1, 1.08, 1],
              y: [-10, 10, -10]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 4 }}
            className="absolute top-1/3 left-1/4 w-[80%] h-[60%]"
            style={{
              background: `
                radial-gradient(ellipse 60% 50% at 50% 50%, hsl(var(--primary) / 0.2), transparent 60%),
                radial-gradient(ellipse 40% 35% at 60% 40%, hsl(var(--accent) / 0.15), transparent 50%)
              `,
              filter: 'blur(80px)',
            }}
          />
          
          <motion.div
            animate={{ 
              x: [0, 20, 0],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 6 }}
            className="absolute bottom-0 left-0 w-full h-[50%]"
            style={{
              background: `
                radial-gradient(ellipse 90% 50% at 50% 100%, hsl(var(--primary) / 0.25), transparent 60%),
                radial-gradient(ellipse 60% 40% at 20% 80%, hsl(var(--accent) / 0.2), transparent 55%)
              `,
              filter: 'blur(50px)',
            }}
          />
          
          <div className="absolute inset-0">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  opacity: [0.2, 0.5, 0.2],
                  scale: [1, 1.2, 1],
                  y: [0, -10, 0]
                }}
                transition={{
                  duration: 8 + i * 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 1.5
                }}
                className="absolute rounded-full"
                style={{
                  width: `${20 + i * 8}px`,
                  height: `${20 + i * 8}px`,
                  left: `${15 + i * 15}%`,
                  top: `${20 + (i % 3) * 25}%`,
                  background: `radial-gradient(circle, hsl(var(--primary) / 0.4), transparent 70%)`,
                  filter: 'blur(8px)',
                }}
              />
            ))}
          </div>
        </>
      )}
      
      {/* Light mode: Visible animated gradients with stronger presence */}
      {!isDark && (
        <>
          <motion.div
            animate={{ 
              x: [0, 40, 0],
              y: [0, -25, 0],
              scale: [1, 1.08, 1]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-1/4 -left-1/4 w-[150%] h-[80%]"
            style={{
              background: `
                radial-gradient(ellipse 80% 60% at 20% 30%, hsl(var(--primary) / 0.22), transparent 60%),
                radial-gradient(ellipse 60% 50% at 70% 20%, hsl(var(--accent) / 0.18), transparent 55%)
              `,
              filter: 'blur(60px)',
            }}
          />
          
          <motion.div
            animate={{ 
              x: [0, -35, 0],
              y: [0, 20, 0]
            }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute top-1/4 -right-1/4 w-[120%] h-[70%]"
            style={{
              background: `
                radial-gradient(ellipse 70% 55% at 80% 40%, hsl(var(--accent) / 0.2), transparent 55%),
                radial-gradient(ellipse 55% 45% at 30% 70%, hsl(var(--primary) / 0.15), transparent 50%)
              `,
              filter: 'blur(70px)',
            }}
          />
          
          <motion.div
            animate={{ 
              opacity: [0.5, 0.8, 0.5],
              scale: [1, 1.06, 1],
              y: [-8, 8, -8]
            }}
            transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 3 }}
            className="absolute top-1/3 left-1/4 w-[80%] h-[60%]"
            style={{
              background: `
                radial-gradient(ellipse 60% 50% at 50% 50%, hsl(var(--primary) / 0.12), transparent 60%),
                radial-gradient(ellipse 40% 35% at 60% 40%, hsl(var(--accent) / 0.1), transparent 50%)
              `,
              filter: 'blur(80px)',
            }}
          />
          
          <motion.div
            animate={{ 
              opacity: [0.6, 1, 0.6],
              scale: [1, 1.1, 1],
              y: [-10, 10, -10]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 5 }}
            className="absolute bottom-0 left-0 w-full h-[50%]"
            style={{
              background: `
                radial-gradient(ellipse 90% 50% at 50% 100%, hsl(var(--primary) / 0.16), transparent 60%),
                radial-gradient(ellipse 60% 40% at 20% 80%, hsl(var(--accent) / 0.12), transparent 55%)
              `,
              filter: 'blur(50px)',
            }}
          />
        </>
      )}
      
      {/* Subtle grain overlay for texture */}
      <div 
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}

export function Layout({ children, lockContext }: LayoutProps) {
  return (
    <>
      <AnimatedBackground />

      {/* Main layout container - transparent to show animated background */}
      <div className="flex h-screen w-full overflow-hidden relative z-10">
        <aside className="hidden md:block w-64 flex-shrink-0">
          <Sidebar />
        </aside>

        <main className="flex-1 flex flex-col h-full overflow-hidden">
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
    </>
  );
}
