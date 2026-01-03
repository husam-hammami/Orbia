import React from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, BarChart2, Settings, Menu, CheckCircle2, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface SidebarProps {
  className?: string;
}

function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();

  const links = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/career", label: "Career & Vision", icon: Briefcase },
    { href: "/analytics", label: "Analytics", icon: BarChart2 },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className={cn("flex flex-col h-full py-8 px-4 bg-sidebar border-r border-sidebar-border", className)}>
      <div className="flex items-center gap-3 px-4 mb-12">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <span className="font-display font-bold text-xl tracking-tight text-sidebar-foreground">HabitCodex</span>
      </div>

      <nav className="space-y-2 flex-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location === link.href;
          return (
            <Link key={link.href} href={link.href}>
              <a
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "stroke-2" : "stroke-1.5")} />
                <span className={cn("font-medium", isActive ? "font-semibold" : "")}>{link.label}</span>
              </a>
            </Link>
          );
        })}
      </nav>

      <div className="px-4">
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
             <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="font-display font-bold text-lg">HabitCodex</span>
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
