import React from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, BarChart2, Settings, Menu, CheckCircle2, Briefcase, BrainCircuit, Sparkles, Wallet, Users, ClipboardList, Orbit } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
interface SidebarProps {
  className?: string;
}

import logoUrl from '@assets/ChatGPT_Image_Jan_9,_2026,_05_19_32_PM_1767964785050.png';

const PHILOSOPHER_QUOTES = [
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
  { text: "The unexamined life is not worth living.", author: "Socrates" },
  { text: "He who has a why to live can bear almost any how.", author: "Friedrich Nietzsche" },
  { text: "Happiness is not something ready made. It comes from your own actions.", author: "Dalai Lama" },
  { text: "The only true wisdom is in knowing you know nothing.", author: "Socrates" },
  { text: "No man is free who is not master of himself.", author: "Epictetus" },
  { text: "It is not death that a man should fear, but he should fear never beginning to live.", author: "Marcus Aurelius" },
  { text: "The soul becomes dyed with the color of its thoughts.", author: "Marcus Aurelius" },
  { text: "To live is to suffer, to survive is to find some meaning in the suffering.", author: "Friedrich Nietzsche" },
  { text: "Knowing yourself is the beginning of all wisdom.", author: "Aristotle" },
  { text: "The mind is everything. What you think you become.", author: "Buddha" },
  { text: "Peace comes from within. Do not seek it without.", author: "Buddha" },
  { text: "Be kind, for everyone you meet is fighting a hard battle.", author: "Plato" },
  { text: "Life must be understood backward. But it must be lived forward.", author: "Søren Kierkegaard" },
  { text: "Man is condemned to be free; because once thrown into the world, he is responsible for everything he does.", author: "Jean-Paul Sartre" },
  { text: "The greatest glory in living lies not in never falling, but in rising every time we fall.", author: "Confucius" },
  { text: "Do not dwell in the past, do not dream of the future, concentrate the mind on the present moment.", author: "Buddha" },
  { text: "Waste no more time arguing about what a good man should be. Be one.", author: "Marcus Aurelius" },
  { text: "You have power over your mind — not outside events. Realize this, and you will find strength.", author: "Marcus Aurelius" },
  { text: "The wound is the place where the Light enters you.", author: "Rumi" },
  { text: "What lies behind us and what lies before us are tiny matters compared to what lies within us.", author: "Ralph Waldo Emerson" },
  { text: "Difficulties strengthen the mind, as labor does the body.", author: "Seneca" },
  { text: "It is during our darkest moments that we must focus to see the light.", author: "Aristotle" },
  { text: "The only thing I know is that I know nothing.", author: "Socrates" },
  { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment.", author: "Ralph Waldo Emerson" },
  { text: "The privilege of a lifetime is to become who you truly are.", author: "Carl Jung" },
  { text: "Until you make the unconscious conscious, it will direct your life and you will call it fate.", author: "Carl Jung" },
  { text: "Out of suffering have emerged the strongest souls.", author: "Kahlil Gibran" },
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
    { href: "/orbit", label: "Orbit", icon: Orbit },
    { href: "/headspace", label: "Headspace", icon: BrainCircuit },
    { href: "/deep-mind", label: "Deep Mind", icon: Sparkles },
    { href: "/career", label: "Career & Vision", icon: Briefcase },
    { href: "/finance", label: "Finance", icon: Wallet },
    { href: "/analytics", label: "Analytics", icon: BarChart2 },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className={cn("flex flex-col h-full py-8 px-4 bg-sidebar border-r border-sidebar-border", className)}>
      <div className="mb-6 px-2">
        <img 
          src={logoUrl} 
          alt="Orbia Logo" 
          className="w-full h-auto object-contain" 
        />
      </div>

      <nav className="space-y-2 flex-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive ? "stroke-2" : "stroke-1.5")} />
              <span className={cn("font-medium", isActive ? "font-semibold" : "")}>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 space-y-4">
        {(() => {
          const quote = getDailyQuote();
          return (
            <div className="p-4 rounded-xl bg-sidebar-accent/50 border border-sidebar-border">
              <p className="text-xs font-medium text-muted-foreground mb-2">Quote of the day</p>
              <p className="text-sm italic text-sidebar-foreground font-serif">"{quote.text}"</p>
              <p className="text-xs text-muted-foreground mt-2 text-right">— {quote.author}</p>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile Header & Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="md:hidden flex items-center justify-between p-3 border-b bg-sidebar">
          <div className="flex items-center">
            <img src={logoUrl} alt="Orbia Logo" className="h-10 w-auto object-contain" />
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 border-r-0">
              <Sidebar />
            </SheetContent>
          </Sheet>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="w-full px-4 md:px-6 lg:px-8 xl:px-10 py-4 md:py-6 lg:py-8 space-y-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
