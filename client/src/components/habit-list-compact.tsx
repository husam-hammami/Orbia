import { Habit } from "@/lib/types";
import { cn } from "@/lib/utils";
import { format, subDays, isSameDay, parseISO } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Flame, Trophy, Trash2, Heart, Briefcase, Brain, Palette, Users, PiggyBank, Accessibility, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HabitEditForm } from "./habit-edit-form";

// Map categories to icons (case-insensitive)
const CategoryIconsMap: Record<string, any> = {
  health: Heart,
  work: Briefcase,
  mindfulness: Brain,
  creativity: Palette,
  social: Users,
  finance: PiggyBank,
  recovery: Accessibility,
  system: Sparkles,
  movement: Heart,
  mental: Brain,
};

function getCategoryIcon(category: string) {
  return CategoryIconsMap[category.toLowerCase()] || Sparkles;
}

interface HabitListCompactProps {
  habits: Habit[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit?: (id: string, data: Partial<Omit<Habit, "id" | "streak" | "completedToday" | "history">>) => void;
  togglingHabitId?: string | null;
}

export function HabitListCompact({ habits, onToggle, onDelete, onEdit, togglingHabitId }: HabitListCompactProps) {
  const today = new Date();
  // Last 14 days for the mini heatmap
  const days = Array.from({ length: 14 }).map((_, i) => subDays(today, 13 - i));

  return (
    <div className="space-y-3">
      {habits.map((habit, index) => (
        <motion.div
          layout
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          key={habit.id}
          className="group flex items-center justify-between p-4 bg-card hover:bg-card/80 border border-border/40 rounded-2xl shadow-sm transition-all relative overflow-hidden"
        >
          {/* Left: Info */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
             <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shadow-sm shrink-0"
                style={{ backgroundColor: `${habit.color}15`, color: habit.color }}
              >
                {(() => {
                  const Icon = getCategoryIcon(habit.category);
                  return <Icon className="w-5 h-5" />;
                })()}
              </div>
              <div className="min-w-0">
                 <h3 className="font-display font-medium text-foreground truncate text-base">{habit.title}</h3>
                 <div className="flex items-center gap-3 mt-1">
                    {habit.streak > 0 && (
                      <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                        <Flame className="w-3 h-3 fill-current" />
                        {habit.streak} day streak
                      </div>
                    )}
                 </div>
              </div>
          </div>

          {/* Middle: Mini Heatmap (Desktop only) */}
          <div className="hidden md:flex items-center gap-1 mx-6">
             {days.map((day, i) => {
               const isCompleted = habit.history.some(h => isSameDay(parseISO(h), day)) || (isSameDay(day, today) && habit.completedToday);
               const isToday = isSameDay(day, today);
               return (
                 <div 
                    key={i} 
                    className={cn(
                      "w-1.5 h-6 rounded-full transition-colors",
                      isCompleted ? "bg-primary" : "bg-muted/50",
                      isToday && !isCompleted && "bg-primary/20 animate-pulse"
                    )}
                    title={format(day, "MMM d")}
                 />
               );
             })}
          </div>

          {/* Right: Action */}
          <div className="flex items-center gap-2">
            <button
                onClick={() => onToggle(habit.id)}
                disabled={togglingHabitId === habit.id}
                className={cn(
                  "relative h-12 min-h-[44px] px-6 rounded-xl flex items-center gap-2 transition-all duration-200 font-medium",
                  habit.completedToday 
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90" 
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                  togglingHabitId === habit.id && "opacity-70"
                )}
              >
                <AnimatePresence mode="wait">
                  {togglingHabitId === habit.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : habit.completedToday ? (
                    <motion.div
                      key="checked"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      className="flex items-center gap-2"
                    >
                      <Check className="w-5 h-5 stroke-[3px]" />
                      <span>Done</span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="unchecked"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      Check In
                    </motion.div>
                  )}
                </AnimatePresence>
            </button>
            
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              {onEdit && <HabitEditForm habit={habit} onSubmit={onEdit} />}
              <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-destructive" onClick={() => onDelete(habit.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      ))}

      {habits.length === 0 && (
          <div className="text-center py-12 bg-muted/10 rounded-2xl border border-dashed border-border">
              <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-20" />
              <p className="text-muted-foreground">No habits yet. Start small.</p>
          </div>
      )}
    </div>
  );
}
