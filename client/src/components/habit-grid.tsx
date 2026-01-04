import { Habit } from "@/lib/types";
import { cn } from "@/lib/utils";
import { format, subDays, isSameDay, parseISO } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Flame, Trophy, Trash2, Heart, Briefcase, Brain, Palette, Users, PiggyBank, Accessibility, Sparkles } from "lucide-react";
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

interface HabitGridProps {
  habits: Habit[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit?: (id: string, data: Partial<Omit<Habit, "id" | "streak" | "completedToday" | "history">>) => void;
}

export function HabitGrid({ habits, onToggle, onDelete, onEdit }: HabitGridProps) {
  const today = new Date();
  const days = Array.from({ length: 5 }).map((_, i) => subDays(today, 4 - i));

  return (
    <div className="w-full space-y-6">
      {/* Header Row */}
      <div className="grid grid-cols-[1.5fr_repeat(5,1fr)_auto] gap-4 px-4">
        <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider self-end pb-2">Habit</div>
        {days.map((day, i) => {
          const isToday = isSameDay(day, today);
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-widest",
                isToday ? "text-primary" : "text-muted-foreground/60"
              )}>
                {format(day, "EEE")}
              </span>
              <div className={cn(
                "w-10 h-10 flex items-center justify-center rounded-full text-sm font-bold transition-all",
                isToday 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110" 
                  : "bg-transparent text-muted-foreground"
              )}>
                {format(day, "d")}
              </div>
            </div>
          );
        })}
        <div className="w-8"></div> {/* Spacer for delete button */}
      </div>

      {/* Habits */}
      <div className="space-y-3">
        {habits.map((habit, index) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            key={habit.id}
            className="group relative bg-card hover:bg-card/80 transition-colors rounded-2xl p-4 shadow-sm hover:shadow-md border border-border/40"
          >
            <div className="grid grid-cols-[1.5fr_repeat(5,1fr)_auto] gap-4 items-center">
              {/* Habit Info */}
              <div className="flex items-center gap-4 min-w-0 pr-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shadow-sm shrink-0"
                  style={{ backgroundColor: `${habit.color}15`, color: habit.color }}
                >
                  {(() => {
                    const Icon = getCategoryIcon(habit.category);
                    return <Icon className="w-6 h-6" />;
                  })()}
                </div>
                <div className="min-w-0">
                  <h3 className="font-display font-semibold text-foreground truncate">{habit.title}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground font-medium bg-secondary/50 px-2 py-0.5 rounded-md">
                      {habit.target} {habit.unit}
                    </span>
                    {habit.streak > 2 && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                        <Flame className="w-3 h-3 fill-current" />
                        {habit.streak}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Days Grid */}
              {days.map((day, i) => {
                const isToday = isSameDay(day, today);
                const isCompletedHistory = habit.history.some(h => isSameDay(parseISO(h), day));
                const isCompletedToday = isSameDay(day, today) && habit.completedToday;
                const isCompleted = isCompletedHistory || isCompletedToday;
                
                const nextDay = days[i + 1];
                const isNextCompleted = nextDay && (
                   habit.history.some(h => isSameDay(parseISO(h), nextDay)) || 
                   (isSameDay(nextDay, today) && habit.completedToday)
                );
                const showConnector = isCompleted && isNextCompleted && i < days.length - 1;

                return (
                  <div key={i} className="relative flex items-center justify-center h-12">
                     {/* Connector Line */}
                    {showConnector && (
                        <div className="absolute left-1/2 w-full h-1 bg-primary/20 -z-10" />
                    )}

                    <button
                      onClick={() => isToday && onToggle(habit.id)}
                      disabled={!isToday}
                      className={cn(
                        "relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 group/btn",
                        isCompleted 
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-100" 
                          : "bg-secondary/30 text-transparent hover:bg-secondary/50",
                        !isToday && !isCompleted && "opacity-40 scale-75",
                        isToday && !isCompleted && "ring-2 ring-primary/20 ring-offset-2 ring-offset-card hover:ring-primary/40 hover:scale-105 cursor-pointer bg-card"
                      )}
                    >
                      <AnimatePresence mode="wait">
                        {isCompleted ? (
                          <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 400, damping: 15 }}
                          >
                            <Check className="w-5 h-5 stroke-[3px]" />
                          </motion.div>
                        ) : (
                          isToday && (
                             <div className="w-3 h-3 rounded-full bg-primary/20 group-hover/btn:bg-primary/40 transition-colors" />
                          )
                        )}
                      </AnimatePresence>
                    </button>
                  </div>
                );
              })}

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {onEdit && <HabitEditForm habit={habit} onSubmit={onEdit} />}
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onDelete(habit.id)}>
                   <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      
      {/* Empty State / Encouragement */}
      {habits.length === 0 && (
          <div className="text-center py-12 bg-muted/10 rounded-2xl border border-dashed border-border">
              <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-20" />
              <p className="text-muted-foreground">No habits yet. Start small.</p>
          </div>
      )}
    </div>
  );
}
