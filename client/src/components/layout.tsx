import React from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, BarChart2, Settings, Menu, CheckCircle2, Briefcase, BrainCircuit, Sparkles, Wallet, Users, ClipboardList, Orbit } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LifeBuoy, Wind, Eye, Music, Phone, Anchor } from "lucide-react";

interface SidebarProps {
  className?: string;
}

import logoUrl from '@assets/generated_images/green_neurozen_logo.png';

function SafetyKit() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive" className="w-full gap-2 shadow-lg shadow-red-500/20 animate-pulse hover:animate-none">
            <Anchor className="w-4 h-4" />
            Grounding Anchor
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl text-destructive">
            <Anchor className="w-6 h-6" /> System Grounding Anchor
          </DialogTitle>
          <DialogDescription>
            Immediate tools to help you reconnect with the present moment.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="54321" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid grid-cols-4 mb-4">
                <TabsTrigger value="54321">5-4-3-2-1</TabsTrigger>
                <TabsTrigger value="breathe">Breathing</TabsTrigger>
                <TabsTrigger value="anchors">Anchors</TabsTrigger>
                <TabsTrigger value="help">Get Help</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 pr-4">
                <TabsContent value="54321" className="space-y-4 mt-0">
                    <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-xl border-2 border-slate-200 dark:border-slate-800 space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xl shrink-0">5</div>
                            <div>
                                <h3 className="font-bold text-lg text-indigo-700 dark:text-indigo-400">Things you can SEE</h3>
                                <p className="text-muted-foreground">Look around. Name 5 distinct objects. Notice their color, shape, and texture.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xl shrink-0">4</div>
                            <div>
                                <h3 className="font-bold text-lg text-emerald-700 dark:text-emerald-400">Things you can TOUCH</h3>
                                <p className="text-muted-foreground">Feel the chair, your clothes, or a wall. Focus on the sensation.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-xl shrink-0">3</div>
                            <div>
                                <h3 className="font-bold text-lg text-amber-700 dark:text-amber-400">Things you can HEAR</h3>
                                <p className="text-muted-foreground">Listen for distant traffic, a clock ticking, or your own breath.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-xl shrink-0">2</div>
                            <div>
                                <h3 className="font-bold text-lg text-rose-700 dark:text-rose-400">Things you can SMELL</h3>
                                <p className="text-muted-foreground">Coffee, soap, or fresh air. If you can't smell, imagine your favorite scent.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xl shrink-0">1</div>
                            <div>
                                <h3 className="font-bold text-lg text-blue-700 dark:text-blue-400">Thing you can TASTE</h3>
                                <p className="text-muted-foreground">A sip of water, a mint, or just the feeling of your mouth.</p>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="breathe" className="mt-0">
                    <div className="flex flex-col items-center justify-center py-12 space-y-8 bg-slate-50 dark:bg-slate-900 rounded-xl border-2 border-slate-200 dark:border-slate-800">
                        <Wind className="w-24 h-24 text-sky-400 animate-pulse duration-[4000ms]" />
                        <div className="text-center space-y-2">
                            <h3 className="text-2xl font-bold text-sky-600 dark:text-sky-400">Box Breathing</h3>
                            <p className="text-muted-foreground max-w-sm mx-auto">
                                Inhale for 4 seconds... Hold for 4... Exhale for 4... Hold for 4.
                            </p>
                        </div>
                        <Button variant="outline" size="lg" className="border-sky-500 text-sky-600 hover:bg-sky-50">Start Guided Session</Button>
                    </div>
                </TabsContent>

                <TabsContent value="anchors" className="mt-0 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                            <div className="flex items-center gap-2 mb-2 font-bold text-purple-700 dark:text-purple-400">
                                <Eye className="w-4 h-4" /> Visual Anchor
                            </div>
                            <div className="aspect-video rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-muted-foreground text-sm">
                                [Safe Place Image]
                            </div>
                        </div>
                         <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                            <div className="flex items-center gap-2 mb-2 font-bold text-amber-700 dark:text-amber-400">
                                <Music className="w-4 h-4" /> Safe Song
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg shadow-sm">
                                <div className="w-10 h-10 rounded bg-amber-100 flex items-center justify-center">
                                    <Music className="w-5 h-5 text-amber-600" />
                                </div>
                                <div>
                                    <div className="font-semibold text-sm">Weightless</div>
                                    <div className="text-xs text-muted-foreground">Marconi Union</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <h4 className="font-bold mb-2">Facts Check</h4>
                        <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                            <li>You are safe right now.</li>
                            <li>The trauma is in the past.</li>
                            <li>You are in the year {new Date().getFullYear()}.</li>
                            <li>Your body is {new Date().getFullYear() - 1995} years old (example).</li>
                        </ul>
                    </div>
                </TabsContent>

                <TabsContent value="help" className="mt-0">
                    <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 flex items-start gap-4">
                            <Phone className="w-6 h-6 text-rose-600 mt-1" />
                            <div>
                                <h3 className="font-bold text-rose-700 dark:text-rose-400">Crisis Hotline</h3>
                                <p className="text-sm text-muted-foreground mb-3">Available 24/7 for immediate support.</p>
                                <Button size="sm" variant="destructive">Call 988</Button>
                            </div>
                        </div>
                        <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 flex items-start gap-4">
                            <Users className="w-6 h-6 text-indigo-600 mt-1" />
                            <div>
                                <h3 className="font-bold text-indigo-700 dark:text-indigo-400">Therapist</h3>
                                <p className="text-sm text-muted-foreground mb-3">Dr. Smith (Appointments only)</p>
                                <Button size="sm" variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-100">Contact</Button>
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
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
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="w-full h-32 rounded-lg overflow-hidden flex items-center justify-center relative">
           <img 
            src={logoUrl} 
            alt="NeuroZen Logo" 
            className="w-full h-full object-contain mix-blend-multiply" 
           />
        </div>
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
        <SafetyKit />
        
        <div className="p-4 rounded-xl bg-sidebar-accent/50 border border-sidebar-border">
          <p className="text-xs font-medium text-muted-foreground mb-2">Quote of the day</p>
          <p className="text-sm italic text-sidebar-foreground font-serif">"We are what we repeatedly do. Excellence, then, is not an act, but a habit."</p>
        </div>
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
        <header className="md:hidden flex items-center justify-between p-4 border-b bg-sidebar">
          <div className="flex items-center gap-2">
             <div className="w-40 h-12 rounded-lg overflow-hidden flex items-center">
              <img src={logoUrl} alt="NeuroZen Logo" className="w-full h-full object-contain object-left mix-blend-multiply" />
            </div>
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
          <div className="max-w-5xl mx-auto p-4 md:p-8 lg:p-12 space-y-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
