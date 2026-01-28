import { useState, useEffect } from "react";
import { Habit } from "@/lib/types";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import * as LucideIcons from "lucide-react";
import { HabitEditForm } from "./habit-edit-form";

interface HabitGardenProps {
  habits: Habit[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit?: (id: string, data: Partial<Omit<Habit, "id" | "streak" | "completedToday" | "history">>) => void;
}

// Convert Tailwind bg-color classes to actual CSS color values
const tailwindColorMap: Record<string, string> = {
  'bg-blue-500': '#3b82f6',
  'bg-purple-500': '#a855f7',
  'bg-amber-500': '#f59e0b',
  'bg-pink-500': '#ec4899',
  'bg-green-500': '#22c55e',
  'bg-teal-500': '#14b8a6',
  'bg-orange-500': '#f97316',
  'bg-indigo-500': '#6366f1',
  'bg-red-500': '#ef4444',
  'bg-yellow-500': '#eab308',
  'bg-cyan-500': '#06b6d4',
  'bg-emerald-500': '#10b981',
  'bg-rose-500': '#f43f5e',
  'bg-violet-500': '#8b5cf6',
  'bg-sky-500': '#0ea5e9',
  'bg-lime-500': '#84cc16',
  'bg-fuchsia-500': '#d946ef',
};

function getActualColor(tailwindClass: string): string {
  return tailwindColorMap[tailwindClass] || '#14b8a6'; // Default to teal if not found
}

// Map categories to icons (case-insensitive)
const CategoryIconsMap: Record<string, any> = {
  health: LucideIcons.Heart,
  work: LucideIcons.Briefcase,
  mindfulness: LucideIcons.Brain,
  creativity: LucideIcons.Palette,
  social: LucideIcons.Users,
  finance: LucideIcons.PiggyBank,
  recovery: LucideIcons.Accessibility,
  system: LucideIcons.Sparkles,
  movement: LucideIcons.Heart,
  mental: LucideIcons.Brain,
};

function getIconByName(iconName: string): any {
  const icons = LucideIcons as any;
  return icons[iconName] || LucideIcons.Sparkles;
}

function getCategoryIcon(category: string) {
  return CategoryIconsMap[category.toLowerCase()] || LucideIcons.Sparkles;
}

// Procedural plant generator based on habit data
const PlantNode = ({ habit, onToggle, onDelete }: { habit: Habit; onToggle: () => void; onDelete: () => void }) => {
  const isCompleted = habit.completedToday;
  const streak = habit.streak;
  
  // Convert Tailwind class to actual CSS color
  const actualColor = getActualColor(habit.color);
  
  // Determine growth stage based on streak
  let stage = "seed";
  if (streak > 0) stage = "sprout";
  if (streak > 3) stage = "bloom";
  if (streak > 10) stage = "thrive";
  if (streak > 30) stage = "master";

  // Use AI-generated icon if available, otherwise fall back to category icon
  const HabitIcon = habit.icon ? getIconByName(habit.icon) : getCategoryIcon(habit.category);

  // Visual variants
  const variants = {
    seed: { scale: 0.8, opacity: 0.7 },
    sprout: { scale: 1, opacity: 1 },
    bloom: { scale: 1.1, opacity: 1 },
    thrive: { scale: 1.2, opacity: 1 },
    master: { scale: 1.3, opacity: 1 },
  };

  return (
    <div className="relative group flex flex-col items-center justify-center gap-1 md:gap-2 p-1 md:p-2">
       <button 
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute top-0 right-0 md:top-2 md:right-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity z-20"
       >
          <LucideIcons.Trash2 className="w-4 h-4" />
       </button>

       <motion.button
          onClick={onToggle}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          data-testid={`button-habit-garden-${habit.id}`}
          className="relative w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all duration-300"
       >
          {/* Main Circle */}
          <AnimatePresence mode="wait">
            {isCompleted ? (
              <motion.div
                key="completed"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="absolute inset-0 rounded-full"
                style={{ 
                  backgroundColor: actualColor,
                  boxShadow: `0 0 20px ${actualColor}99, 0 0 40px ${actualColor}50`
                }}
              />
            ) : (
              <motion.div
                key="uncompleted"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 rounded-full border-2 border-dashed border-muted bg-muted/5 group-hover:border-muted-foreground/30 transition-colors"
              />
            )}
          </AnimatePresence>

          <div className="relative z-10">
            {isCompleted ? (
              <motion.div
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >
                <HabitIcon className="w-5 h-5 md:w-7 md:h-7 text-white" />
              </motion.div>
            ) : (
              <HabitIcon 
                className="w-5 h-5 md:w-7 md:h-7 text-muted-foreground/40 group-hover:text-muted-foreground/60 transition-colors"
              />
            )}
          </div>
       </motion.button>

       <div className="text-center w-full px-0.5 md:px-1">
          <h3 className="font-medium text-[10px] md:text-xs leading-tight line-clamp-2">{habit.title}</h3>
          <p className="text-[8px] md:text-[9px] text-muted-foreground">
             {habit.streak}d{habit.streak > 5 && <span className="text-amber-500">🔥</span>}
          </p>
       </div>
    </div>
  );
};

export function HabitGarden({ habits, onToggle, onDelete, onEdit }: HabitGardenProps) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 md:gap-3 py-2 md:py-3">
      {habits.map((habit) => (
        <div key={habit.id} className="relative group">
          <PlantNode habit={habit} onToggle={() => onToggle(habit.id)} onDelete={() => onDelete(habit.id)} />
          {onEdit && (
            <div className="absolute top-1 left-1 md:top-2 md:left-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <HabitEditForm habit={habit} onSubmit={onEdit} />
            </div>
          )}
        </div>
      ))}
      
      <button className="group flex flex-col items-center justify-center gap-0.5 md:gap-1 p-1 opacity-40 hover:opacity-80 transition-opacity">
         <div className="w-12 h-12 md:w-16 md:h-16 rounded-full border-2 border-dashed border-muted flex items-center justify-center bg-muted/5 group-hover:bg-muted/10 transition-colors">
            <span className="text-lg md:text-xl text-muted-foreground font-light">+</span>
         </div>
         <div className="text-center">
            <h3 className="font-medium text-[9px] md:text-[10px] text-muted-foreground">New</h3>
         </div>
      </button>
    </div>
  );
}
