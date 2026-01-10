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
        "group relative bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-all duration-300 cosmic-glow",
        completed && "bg-opacity-50 border-primary/20"
      )}
    >
      <div className="p-5 flex items-center gap-4">
        {/* Check Button */}
        <button
          onClick={handleToggle}
          className={cn(
            "relative flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300",
            completed
              ? "bg-primary text-primary-foreground shadow-sm scale-105"
              : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
          )}
        >
          <AnimatePresence mode="wait">
            {completed && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <Check className="w-6 h-6 stroke-[3px]" />
              </motion.div>
            )}
          </AnimatePresence>
          {!completed && (
             <div className="w-6 h-6 rounded-full border-2 border-current opacity-20 group-hover:opacity-40" />
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
                    day.isCompleted 
                        ? "bg-primary" 
                        : "bg-muted"
                  )}
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
