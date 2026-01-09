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
    <div className="relative group flex flex-col items-center justify-center gap-2 p-2">
       {/* Delete Button - Appears on hover */}
       <button 
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute top-2 right-2 p-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity z-20"
       >
          <LucideIcons.Trash2 className="w-4 h-4" />
       </button>

       {/* The "Plant" Orb */}
       <motion.button
          onClick={onToggle}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
             "relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500",
             isCompleted ? "shadow-[0_0_40px_-10px_var(--shadow-color)]" : "bg-muted/10 border-2 border-dashed border-muted"
          )}
          style={{ 
             "--shadow-color": habit.color,
             borderColor: isCompleted ? "transparent" : undefined
          } as any}
       >
          {/* Background Glow when completed */}
          <AnimatePresence>
            {isCompleted && (
               <motion.div
                 initial={{ opacity: 0, scale: 0.5 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.5 }}
                 className="absolute inset-0 rounded-full blur-xl opacity-40"
                 style={{ backgroundColor: habit.color }}
               />
            )}
          </AnimatePresence>

          {/* Central Core */}
          <div 
             className={cn(
                "relative z-10 w-14 h-14 rounded-full flex items-center justify-center overflow-hidden transition-all duration-500",
                isCompleted ? "bg-card" : "bg-muted/20"
             )}
          >
              {/* Liquid Fill Effect */}
              {isCompleted && (
                 <motion.div 
                    layoutId={`liquid-${habit.id}`}
                    className="absolute inset-0 z-0"
                    initial={{ y: "100%" }}
                    animate={{ y: "0%" }}
                    transition={{ type: "spring", stiffness: 50, damping: 15 }}
                    style={{ backgroundColor: `${habit.color}20` }}
                 />
              )}

              {/* Icon / Abstract Shape */}
              <div className="z-10 text-center">
                 {isCompleted ? (
                    <motion.div
                       initial={{ scale: 0.5, rotate: -45 }}
                       animate={{ scale: 1, rotate: 0 }}
                       className="text-foreground"
                    >
                       <HabitIcon 
                          className="mx-auto w-6 h-6"
                          style={{ color: habit.color }}
                       />
                    </motion.div>
                 ) : (
                    <div className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
                       <HabitIcon 
                          className={cn(
                            "mx-auto grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500", 
                            stage === "seed" || stage === "sprout" ? "w-8 h-8" : "w-10 h-10",
                            stage === "thrive" || stage === "master" ? "w-12 h-12" : ""
                          )}
                          style={{ color: 'currentColor' }} 
                       />
                    </div>
                 )}
              </div>
          </div>

          {/* Orbiting Streak Rings (Only if streak > 0) */}
          {habit.streak > 0 && (
             <svg className="absolute inset-0 w-full h-full pointer-events-none rotate-90">
                <circle
                   cx="50%"
                   cy="50%"
                   r="48%"
                   fill="none"
                   stroke={habit.color}
                   strokeWidth="2"
                   strokeLinecap="round"
                   strokeDasharray="280"
                   strokeDashoffset={280 - (Math.min(habit.streak, 30) / 30) * 280} // Max streak visual is 30
                   className="opacity-50 transition-all duration-1000 ease-out"
                />
             </svg>
          )}
          
          {/* Floating Particles for high streaks */}
          {habit.streak > 10 && isCompleted && (
             <>
               <motion.div 
                 animate={{ rotate: 360 }}
                 transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                 className="absolute -inset-4 border border-dashed border-primary/20 rounded-full"
               />
             </>
          )}
       </motion.button>

       {/* Label */}
       <div className="text-center w-full px-1">
          <h3 className="font-medium text-xs leading-tight line-clamp-2">{habit.title}</h3>
          <p className="text-[9px] text-muted-foreground">
             {habit.streak}d{habit.streak > 5 && <span className="text-amber-500">🔥</span>}
          </p>
       </div>
    </div>
  );
};

export function HabitGarden({ habits, onToggle, onDelete, onEdit }: HabitGardenProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 py-3">
      {habits.map((habit) => (
        <div key={habit.id} className="relative group">
          <PlantNode habit={habit} onToggle={() => onToggle(habit.id)} onDelete={() => onDelete(habit.id)} />
          {onEdit && (
            <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <HabitEditForm habit={habit} onSubmit={onEdit} />
            </div>
          )}
        </div>
      ))}
      
      {/* Empty Plot for "New Habit" visualization */}
      <button className="group flex flex-col items-center justify-center gap-1 p-1 opacity-40 hover:opacity-80 transition-opacity">
         <div className="w-16 h-16 rounded-full border-2 border-dashed border-muted flex items-center justify-center bg-muted/5 group-hover:bg-muted/10 transition-colors">
            <span className="text-xl text-muted-foreground font-light">+</span>
         </div>
         <div className="text-center">
            <h3 className="font-medium text-[10px] text-muted-foreground">New</h3>
         </div>
      </button>
    </div>
  );
}
