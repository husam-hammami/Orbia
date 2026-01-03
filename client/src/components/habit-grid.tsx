import { useState } from "react";
import { Habit } from "@/lib/types";
import { cn } from "@/lib/utils";
import { format, subDays, isSameDay, parseISO, startOfWeek, addDays } from "date-fns";
import { motion } from "framer-motion";
import { Check, Flame, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HabitGridProps {
  habits: Habit[];
  onToggle: (id: string, date?: Date) => void;
}

export function HabitGrid({ habits, onToggle }: HabitGridProps) {
  // Use a 7-day rolling window or a strict Mon-Sun week? 
  // Let's use a rolling window of last 6 days + Today for the "Zen" feel of immediate progress.
  const today = new Date();
  const days = Array.from({ length: 7 }).map((_, i) => subDays(today, 6 - i));

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
      <table className="w-full min-w-[600px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border/50">
            <th className="p-4 text-left font-display font-semibold text-muted-foreground w-[30%] min-w-[200px]">Habit</th>
            {days.map((day, i) => {
              const isToday = isSameDay(day, today);
              return (
                <th key={i} className={cn("p-2 text-center w-[10%]", isToday && "bg-primary/5")}>
                  <div className={cn("flex flex-col items-center justify-center gap-1", isToday ? "text-primary font-bold" : "text-muted-foreground")}>
                    <span className="text-xs uppercase">{format(day, "EEE")}</span>
                    <span className={cn("text-lg font-display", isToday && "scale-110")}>{format(day, "d")}</span>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {habits.map((habit) => (
            <tr key={habit.id} className="group border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
              <td className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-8 rounded-full" style={{ backgroundColor: habit.color }} />
                  <div>
                    <p className={cn("font-medium text-foreground", habit.completedToday && "text-muted-foreground line-through decoration-primary/30")}>
                      {habit.title}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                       <span>{habit.target} {habit.unit}</span>
                       {habit.streak > 0 && (
                         <span className="flex items-center text-amber-500 bg-amber-500/10 px-1.5 rounded-full">
                           <Flame className="w-3 h-3 mr-0.5 fill-current" /> {habit.streak}
                         </span>
                       )}
                    </div>
                  </div>
                </div>
              </td>
              {days.map((day, i) => {
                // Check if completed on this date
                const isCompleted = habit.history.some(h => isSameDay(parseISO(h), day)) || (isSameDay(day, today) && habit.completedToday);
                const isToday = isSameDay(day, today);

                return (
                  <td key={i} className={cn("p-2 text-center relative", isToday && "bg-primary/5")}>
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => isToday && onToggle(habit.id)}
                        disabled={!isToday}
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200",
                          isCompleted 
                            ? "bg-primary text-primary-foreground shadow-sm scale-100" 
                            : "bg-muted/30 text-transparent hover:bg-muted",
                           !isToday && !isCompleted && "bg-transparent border border-dashed border-border",
                           !isToday && isCompleted && "opacity-60",
                           isToday && !isCompleted && "border-2 border-primary/20 hover:border-primary/50"
                        )}
                      >
                         {isCompleted && <Check className="w-5 h-5 stroke-[3px]" />}
                      </button>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
