import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Flame, ChevronDown, MoreHorizontal, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Habit } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, subDays, isSameDay, parseISO } from "date-fns";

const TAILWIND_COLORS: Record<string, string> = {
  'bg-red-500': 'hsl(0 84% 60%)',
  'bg-orange-500': 'hsl(25 95% 53%)',
  'bg-amber-500': 'hsl(38 92% 50%)',
  'bg-yellow-500': 'hsl(48 96% 53%)',
  'bg-lime-500': 'hsl(84 81% 44%)',
  'bg-green-500': 'hsl(142 71% 45%)',
  'bg-emerald-500': 'hsl(160 84% 39%)',
  'bg-teal-500': 'hsl(173 80% 40%)',
  'bg-cyan-500': 'hsl(189 94% 43%)',
  'bg-sky-500': 'hsl(199 89% 48%)',
  'bg-blue-500': 'hsl(217 91% 60%)',
  'bg-indigo-500': 'hsl(239 84% 67%)',
  'bg-violet-500': 'hsl(258 90% 66%)',
  'bg-purple-500': 'hsl(271 91% 65%)',
  'bg-fuchsia-500': 'hsl(292 84% 61%)',
  'bg-pink-500': 'hsl(330 81% 60%)',
  'bg-rose-500': 'hsl(350 89% 60%)',
  'bg-slate-500': 'hsl(215 16% 47%)',
  'bg-gray-500': 'hsl(220 9% 46%)',
};

function resolveColor(color: string): string {
  if (!color) return 'hsl(217 91% 60%)';
  if (TAILWIND_COLORS[color]) return TAILWIND_COLORS[color];
  if (color.startsWith('hsl') || color.startsWith('#') || color.startsWith('rgb')) return color;
  const match = color.match(/bg-(\w+)-(\d+)/);
  if (match) return 'hsl(217 91% 60%)';
  return color;
}

function withAlpha(color: string, alpha: number): string {
  const resolved = resolveColor(color);
  const hslMatch = resolved.match(/hsl\((\d+)\s+(\d+)%\s+(\d+)%\)/);
  if (hslMatch) {
    return `hsla(${hslMatch[1]}, ${hslMatch[2]}%, ${hslMatch[3]}%, ${alpha})`;
  }
  if (resolved.startsWith('#')) {
    const hex = resolved.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return resolved;
}

interface HabitCardProps {
  habit: Habit;
  onToggle: (id: string) => void;
}

export function HabitCard({ habit, onToggle }: HabitCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const completed = habit.completedToday;

  const handleToggle = () => {
    onToggle(habit.id);
  };

  // Simple last 7 days visual
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const date = subDays(new Date(), 6 - i);
    const isCompleted = habit.history.some(h => isSameDay(parseISO(h), date)) || (i === 6 && completed);
    return { date, isCompleted };
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group relative bg-card rounded-2xl border shadow-sm hover:shadow-md transition-all duration-300",
        completed 
          ? "border-transparent" 
          : "border-border"
      )}
      style={completed ? { 
        borderColor: withAlpha(habit.color, 0.25),
        boxShadow: `0 0 20px -5px ${withAlpha(habit.color, 0.25)}, 0 0 40px -10px ${withAlpha(habit.color, 0.2)}`,
        background: `linear-gradient(to right, ${withAlpha(habit.color, 0.05)}, ${withAlpha(habit.color, 0.03)}, ${withAlpha(habit.color, 0.05)})`
      } : undefined}
    >
      <div className="p-5 flex items-center gap-4">
        <button
          onClick={handleToggle}
          data-testid={`button-habit-toggle-${habit.id}`}
          className={cn(
            "relative flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300",
            completed
              ? "text-white shadow-lg scale-110"
              : "hover:scale-105"
          )}
          style={completed
            ? { backgroundColor: resolveColor(habit.color), boxShadow: `0 0 15px ${withAlpha(habit.color, 0.5)}, 0 0 30px ${withAlpha(habit.color, 0.25)}` }
            : { backgroundColor: withAlpha(habit.color, 0.1), color: resolveColor(habit.color) }
          }
        >
          {completed && (
            <motion.div
              className="absolute inset-0 rounded-xl"
              style={{ backgroundColor: withAlpha(habit.color, 0.2) }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ 
                opacity: [0.5, 0.8, 0.5], 
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            />
          )}
          <AnimatePresence mode="wait">
            {completed && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className="relative z-10"
              >
                <Check className="w-6 h-6 stroke-[3px] drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
              </motion.div>
            )}
          </AnimatePresence>
          {!completed && (
             <div className="w-6 h-6 rounded-full border-2 border-current opacity-30 group-hover:opacity-50 transition-opacity" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="flex items-center gap-2 mb-1">
            <h3 className={cn(
              "font-display font-semibold text-lg truncate transition-colors",
              completed ? "text-muted-foreground line-through decoration-primary/30" : "text-foreground"
            )}>
              {habit.title}
            </h3>
            {habit.streak > 2 && (
              <div className="flex items-center gap-1 text-xs font-mono font-medium text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                <Flame className="w-3 h-3 fill-current" />
                {habit.streak}
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">{habit.description || "Daily goal"}</p>
        </div>

        {/* Actions / Stats */}
        <div className="flex items-center gap-2">
            {/* Desktop Only: Last 7 days dots */}
           <div className="hidden sm:flex items-center gap-1 mr-2">
              {last7Days.map((day, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    !day.isCompleted && "bg-muted"
                  )}
                  style={day.isCompleted ? { backgroundColor: resolveColor(habit.color) } : undefined}
                  title={format(day.date, "MMM d")}
                />
              ))}
           </div>

          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setIsExpanded(!isExpanded)}>
             <ChevronDown className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-180")} />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Edit</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border/50 bg-muted/20"
          >
            <div className="p-5">
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-background rounded-xl border border-border/50">
                     <p className="text-xs text-muted-foreground mb-1">Current Streak</p>
                     <p className="font-mono text-xl font-semibold">{habit.streak} days</p>
                  </div>
                  <div className="p-3 bg-background rounded-xl border border-border/50">
                     <p className="text-xs text-muted-foreground mb-1">Total Completions</p>
                     <p className="font-mono text-xl font-semibold">{habit.history.length}</p>
                  </div>
                   <div className="p-3 bg-background rounded-xl border border-border/50 col-span-2">
                     <p className="text-xs text-muted-foreground mb-1">Last 30 Days</p>
                     <div className="flex items-end gap-[2px] h-8 mt-2">
                         {/* Simple visual bar chart for last 30 days - mocked somewhat */}
                         {Array.from({length: 30}).map((_, i) => (
                             <div 
                                key={i} 
                                className={cn(
                                    "flex-1 rounded-t-sm", 
                                    Math.random() > 0.3 ? "bg-primary/20 h-full" : "bg-muted h-1"
                                )}
                             />
                         ))}
                     </div>
                  </div>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
