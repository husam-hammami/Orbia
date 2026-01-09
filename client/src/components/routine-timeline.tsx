import { useMemo, useState } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Check, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Sunrise,
  Briefcase,
  Coffee,
  Moon,
  Utensils,
  Dumbbell,
  BookOpen,
  Home,
  Zap,
  Activity
} from "lucide-react";
import { useRoutineBlocks, useRoutineActivities, useRoutineLogs, useToggleRoutineActivity, useHabits, useAllHabitCompletions } from "@/lib/api-hooks";
import { cn } from "@/lib/utils";

const BLOCK_ICONS: Record<string, any> = {
  "morning": Sunrise,
  "work": Briefcase,
  "break": Coffee,
  "evening": Moon,
  "meal": Utensils,
  "exercise": Dumbbell,
  "learning": BookOpen,
  "home": Home,
  "default": Activity
};

function getBlockIcon(name: string, emoji?: string) {
  const nameLower = name.toLowerCase();
  if (nameLower.includes("morning") || nameLower.includes("wake")) return Sunrise;
  if (nameLower.includes("work") || nameLower.includes("block")) return Briefcase;
  if (nameLower.includes("break") || nameLower.includes("rest")) return Coffee;
  if (nameLower.includes("evening") || nameLower.includes("night") || nameLower.includes("afternoon")) return Moon;
  if (nameLower.includes("meal") || nameLower.includes("lunch") || nameLower.includes("dinner") || nameLower.includes("breakfast")) return Utensils;
  if (nameLower.includes("exercise") || nameLower.includes("gym") || nameLower.includes("workout")) return Dumbbell;
  if (nameLower.includes("learn") || nameLower.includes("study") || nameLower.includes("read")) return BookOpen;
  return Activity;
}

export function RoutineTimeline() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);
  
  const { data: blocks, isLoading: blocksLoading } = useRoutineBlocks();
  const { data: activities, isLoading: activitiesLoading } = useRoutineActivities();
  const { data: logs } = useRoutineLogs(today);
  const { data: habits } = useHabits();
  const { data: allHabitCompletions } = useAllHabitCompletions();
  
  const toggleMutation = useToggleRoutineActivity();

  const completedActivityIds = useMemo(() => {
    return new Set(logs?.map(l => l.activityId) || []);
  }, [logs]);

  const completedHabitIds = useMemo(() => {
    return new Set(
      allHabitCompletions?.filter(c => c.completedDate === today).map(c => c.habitId) || []
    );
  }, [allHabitCompletions, today]);

  const blockProgress = useMemo(() => {
    if (!blocks || !activities) return {};
    const progress: Record<string, { completed: number; total: number }> = {};
    
    blocks.forEach(block => {
      const blockActivities = activities.filter(a => a.blockId === block.id);
      const completed = blockActivities.filter(a => completedActivityIds.has(a.id)).length;
      progress[block.id] = { completed, total: blockActivities.length };
    });
    
    return progress;
  }, [blocks, activities, completedActivityIds]);

  const totalProgress = useMemo(() => {
    if (!activities) return 0;
    const completed = activities.filter(a => completedActivityIds.has(a.id)).length;
    return activities.length > 0 ? Math.round((completed / activities.length) * 100) : 0;
  }, [activities, completedActivityIds]);

  const getCurrentBlock = () => {
    if (!blocks) return null;
    const now = new Date();
    const currentTime = format(now, "HH:mm");
    
    return blocks.find(block => {
      return currentTime >= block.startTime && currentTime < block.endTime;
    });
  };

  const currentBlock = getCurrentBlock();

  const handleToggleActivity = async (activityId: string, habitId: string | null) => {
    const isCompleted = completedActivityIds.has(activityId);
    const action = isCompleted ? "remove" : "add";
    
    try {
      await toggleMutation.mutateAsync({ activityId, date: today, habitId, action });
    } catch (e) {
      console.error("Failed to toggle activity:", e);
    }
  };

  if (blocksLoading || activitiesLoading) {
    return (
      <div className="bg-slate-950 rounded-xl border border-slate-800 p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f46e510_1px,transparent_1px),linear-gradient(to_bottom,#4f46e510_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="animate-pulse space-y-4 relative z-10">
          <div className="h-6 bg-slate-800 rounded w-1/3"></div>
          <div className="h-2 bg-slate-800 rounded w-full"></div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-slate-900 rounded-lg border border-slate-800"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!blocks || blocks.length === 0) {
    return (
      <div className="bg-slate-950 rounded-xl border border-slate-800 p-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f46e510_1px,transparent_1px),linear-gradient(to_bottom,#4f46e510_1px,transparent_1px)] bg-[size:24px_24px]" />
        <Clock className="w-12 h-12 mx-auto mb-4 text-slate-700" />
        <p className="text-slate-500 font-mono text-sm">NO ROUTINE CONFIGURED</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden relative">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f46e508_1px,transparent_1px),linear-gradient(to_bottom,#4f46e508_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      
      <div className="relative z-10 p-4 border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-mono font-bold text-slate-100 text-sm tracking-wide">DAILY ROUTINE</h2>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Protocol Status</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700">
            <span className="text-[10px] text-slate-500 font-mono uppercase">Progress</span>
            <span className={cn(
              "font-mono font-bold text-lg",
              totalProgress >= 80 ? "text-emerald-400" : totalProgress >= 50 ? "text-amber-400" : "text-slate-400"
            )} data-testid="routine-progress-percent">
              {totalProgress}%
            </span>
          </div>
        </div>
        
        <div className="relative h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <motion.div 
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              background: totalProgress >= 80 
                ? "linear-gradient(90deg, #10b981, #14b8a6)" 
                : totalProgress >= 50 
                  ? "linear-gradient(90deg, #f59e0b, #eab308)"
                  : "linear-gradient(90deg, #6366f1, #8b5cf6)",
              boxShadow: totalProgress >= 80 
                ? "0 0 12px #10b981" 
                : totalProgress >= 50 
                  ? "0 0 12px #f59e0b"
                  : "0 0 12px #6366f1"
            }}
            initial={{ width: 0 }}
            animate={{ width: `${totalProgress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>

      <div className="relative z-10 divide-y divide-slate-800/50">
        {blocks.map((block) => {
          const progress = blockProgress[block.id] || { completed: 0, total: 0 };
          const isExpanded = expandedBlock === block.id;
          const isCurrent = currentBlock?.id === block.id;
          const blockActivities = activities?.filter(a => a.blockId === block.id) || [];
          const isComplete = progress.total > 0 && progress.completed === progress.total;
          const progressPercent = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
          const BlockIcon = getBlockIcon(block.name, block.emoji);

          return (
            <div key={block.id} className={cn(
              "transition-all duration-300",
              isCurrent && "bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent"
            )}>
              <button
                onClick={() => setExpandedBlock(isExpanded ? null : block.id)}
                className={cn(
                  "w-full p-4 flex items-center gap-4 transition-all duration-200 group",
                  "hover:bg-slate-900/50",
                  isCurrent && "border-l-2 border-emerald-500"
                )}
                data-testid={`routine-block-${block.id}`}
              >
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300",
                  "border",
                  isComplete 
                    ? "bg-emerald-500/20 border-emerald-500/50" 
                    : isCurrent
                      ? "bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-emerald-500/30 animate-pulse"
                      : "bg-slate-800/50 border-slate-700"
                )}>
                  <BlockIcon className={cn(
                    "w-5 h-5",
                    isComplete ? "text-emerald-400" : isCurrent ? "text-emerald-400" : "text-slate-400"
                  )} />
                </div>
                
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-medium text-sm",
                      isComplete ? "text-emerald-400" : "text-slate-200"
                    )}>{block.name}</span>
                    {isCurrent && (
                      <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold uppercase tracking-wider border border-emerald-500/30 animate-pulse">
                        LIVE
                      </span>
                    )}
                    {isComplete && (
                      <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-emerald-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500 font-mono">
                      {block.startTime} — {block.endTime}
                    </span>
                    <span className="text-slate-700">•</span>
                    <span className={cn(
                      "text-xs font-mono",
                      isComplete ? "text-emerald-500" : "text-slate-500"
                    )}>
                      {progress.completed}/{progress.total}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-20 relative">
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full rounded-full"
                        style={{
                          background: isComplete 
                            ? "linear-gradient(90deg, #10b981, #14b8a6)" 
                            : `linear-gradient(90deg, ${block.color}, ${block.color}cc)`,
                          boxShadow: isComplete ? "0 0 8px #10b981" : `0 0 8px ${block.color}66`
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  </motion.div>
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-1">
                      {block.purpose && (
                        <p className="text-[10px] text-slate-600 font-mono uppercase tracking-wider px-3 py-2 mb-2 bg-slate-900/50 rounded border-l-2 border-slate-700">
                          {block.purpose}
                        </p>
                      )}
                      
                      {blockActivities.map((activity, idx) => {
                        const isActivityComplete = completedActivityIds.has(activity.id);
                        const linkedHabit = habits?.find(h => h.id === activity.habitId);
                        
                        return (
                          <motion.div 
                            key={activity.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className={cn(
                              "flex items-start gap-3 p-3 rounded-lg transition-all duration-200 group/item",
                              "border-l-2",
                              isActivityComplete 
                                ? "bg-emerald-500/5 border-emerald-500" 
                                : "bg-slate-900/30 border-slate-700 hover:bg-slate-900/50 hover:border-slate-600"
                            )}
                          >
                            <button
                              onClick={() => handleToggleActivity(activity.id, activity.habitId)}
                              className={cn(
                                "mt-0.5 w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200 shrink-0",
                                "border",
                                isActivityComplete 
                                  ? "bg-emerald-500 border-emerald-400 shadow-[0_0_10px_#10b98155]" 
                                  : "bg-slate-800 border-slate-600 hover:border-slate-500 group-hover/item:border-emerald-500/50"
                              )}
                              data-testid={`activity-checkbox-${activity.id}`}
                            >
                              {isActivityComplete && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ type: "spring", stiffness: 500 }}
                                >
                                  <Check className="w-3 h-3 text-white" />
                                </motion.div>
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {activity.time && (
                                  <span className="text-[10px] text-slate-600 font-mono bg-slate-800/50 px-1.5 py-0.5 rounded">
                                    {activity.time}
                                  </span>
                                )}
                                <span className={cn(
                                  "text-sm font-medium transition-all",
                                  isActivityComplete 
                                    ? "text-emerald-400/70 line-through" 
                                    : "text-slate-300"
                                )}>
                                  {activity.name}
                                </span>
                              </div>
                              {activity.description && (
                                <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                                  {activity.description}
                                </p>
                              )}
                              {linkedHabit && (
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  <div 
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ backgroundColor: linkedHabit.color, boxShadow: `0 0 6px ${linkedHabit.color}` }}
                                  />
                                  <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500">
                                    Linked → {linkedHabit.title}
                                  </span>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
