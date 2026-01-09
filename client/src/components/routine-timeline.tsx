import { useMemo, useState } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Check, 
  Clock, 
  ChevronRight,
  Sunrise,
  Briefcase,
  Coffee,
  Moon,
  Utensils,
  Dumbbell,
  BookOpen,
  Activity,
  Zap,
  Target,
  TrendingUp
} from "lucide-react";
import { useRoutineBlocks, useRoutineActivities, useRoutineLogs, useToggleRoutineActivity, useHabits, useAllHabitCompletions } from "@/lib/api-hooks";
import { cn } from "@/lib/utils";

function getBlockIcon(name: string) {
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

  const completedCount = useMemo(() => {
    return activities?.filter(a => completedActivityIds.has(a.id)).length || 0;
  }, [activities, completedActivityIds]);

  const totalCount = activities?.length || 0;

  const getCurrentBlock = () => {
    if (!blocks) return null;
    const now = new Date();
    const currentTime = format(now, "HH:mm");
    return blocks.find(block => currentTime >= block.startTime && currentTime < block.endTime);
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
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="flex gap-4">
            <div className="h-16 bg-gray-100 rounded-xl flex-1"></div>
            <div className="h-16 bg-gray-100 rounded-xl flex-1"></div>
            <div className="h-16 bg-gray-100 rounded-xl flex-1"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!blocks || blocks.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-gray-300" />
        </div>
        <p className="text-gray-500 font-medium">No routine configured</p>
        <p className="text-gray-400 text-sm mt-1">Create time blocks to structure your day</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Strip */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-full px-4 py-2">
          <div className="relative w-8 h-8">
            <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="14" fill="none" stroke="#e5e7eb" strokeWidth="3" />
              <motion.circle 
                cx="16" cy="16" r="14" 
                fill="none" 
                stroke="url(#progressGradient)" 
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${totalProgress * 0.88} 88`}
                initial={{ strokeDasharray: "0 88" }}
                animate={{ strokeDasharray: `${totalProgress * 0.88} 88` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#14b8a6" />
                </linearGradient>
              </defs>
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-emerald-600" data-testid="routine-progress-percent">
              {totalProgress}%
            </span>
          </div>
          <div className="text-sm">
            <span className="font-semibold text-emerald-700">{completedCount}</span>
            <span className="text-emerald-600/70">/{totalCount} done</span>
          </div>
        </div>

        {currentBlock && (
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-3 py-1.5 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-sm text-gray-600">
              Now: <span className="font-medium text-gray-900">{currentBlock.name}</span>
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs text-gray-400 ml-auto">
          <Clock className="w-3.5 h-3.5" />
          <span>{format(new Date(), "h:mm a")}</span>
        </div>
      </div>

      {/* Timeline Ribbon - Full Width */}
      <div className="relative bg-white rounded-xl border border-gray-100 p-4">
        {/* Orbit Thread Line */}
        <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-gradient-to-r from-emerald-200 via-emerald-300 to-emerald-200 rounded-full -translate-y-1/2 z-0" />
        
        <div className="grid gap-2 relative z-10" style={{ gridTemplateColumns: `repeat(${blocks.length}, 1fr)` }}>
          {blocks.map((block, idx) => {
            const progress = blockProgress[block.id] || { completed: 0, total: 0 };
            const isCurrent = currentBlock?.id === block.id;
            const isComplete = progress.total > 0 && progress.completed === progress.total;
            const progressPercent = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
            const BlockIcon = getBlockIcon(block.name);
            const isExpanded = expandedBlock === block.id;

            return (
              <motion.button
                key={block.id}
                onClick={() => setExpandedBlock(isExpanded ? null : block.id)}
                className={cn(
                  "relative flex flex-col items-center p-3 rounded-xl transition-all duration-200",
                  "border bg-white hover:shadow-md",
                  isCurrent 
                    ? "border-emerald-300 shadow-lg shadow-emerald-100 ring-2 ring-emerald-100" 
                    : isComplete 
                      ? "border-emerald-200 bg-emerald-50/50" 
                      : isExpanded
                        ? "border-gray-300 shadow-md"
                        : "border-gray-100 hover:border-gray-200"
                )}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                data-testid={`routine-block-${block.id}`}
              >
                {/* Progress Ring */}
                <div className="relative mb-2">
                  <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
                    <circle cx="20" cy="20" r="16" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                    <motion.circle 
                      cx="20" cy="20" r="16" 
                      fill="none" 
                      stroke={isComplete ? "#10b981" : block.color}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={`${progressPercent * 1.005} 100.5`}
                      initial={{ strokeDasharray: "0 100.5" }}
                      animate={{ strokeDasharray: `${progressPercent * 1.005} 100.5` }}
                      transition={{ duration: 0.5 }}
                    />
                  </svg>
                  <div className={cn(
                    "absolute inset-0 flex items-center justify-center rounded-full m-1.5",
                    isCurrent && "animate-pulse"
                  )}>
                    <BlockIcon className={cn(
                      "w-4 h-4",
                      isComplete ? "text-emerald-500" : isCurrent ? "text-emerald-600" : "text-gray-400"
                    )} />
                  </div>
                  
                  {isCurrent && (
                    <motion.div 
                      className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    />
                  )}
                </div>

                <span className={cn(
                  "text-xs font-semibold text-center leading-tight",
                  isComplete ? "text-emerald-600" : isCurrent ? "text-gray-900" : "text-gray-700"
                )}>
                  {block.name}
                </span>
                
                {/* Clear Time Range */}
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                    {block.startTime.slice(0, 5)}
                  </span>
                  <span className="text-[10px] text-gray-400">→</span>
                  <span className="text-xs font-medium text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">
                    {block.endTime.slice(0, 5)}
                  </span>
                </div>

                {progress.total > 0 && (
                  <span className={cn(
                    "text-[10px] font-semibold mt-1.5 px-2 py-0.5 rounded-full",
                    isComplete ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-500"
                  )}>
                    {progress.completed}/{progress.total}
                  </span>
                )}

                {isExpanded && (
                  <motion.div 
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="w-2 h-2 bg-white border-b border-r border-gray-200 rotate-45 transform" />
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Expanded Activity Panel */}
      <AnimatePresence mode="wait">
        {expandedBlock && (() => {
          const block = blocks.find(b => b.id === expandedBlock);
          if (!block) return null;
          
          const blockActivities = activities?.filter(a => a.blockId === block.id) || [];
          const progress = blockProgress[block.id] || { completed: 0, total: 0 };
          const BlockIcon = getBlockIcon(block.name);

          return (
            <motion.div
              key={block.id}
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Block Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${block.color}15` }}
                    >
                      <BlockIcon className="w-4 h-4" style={{ color: block.color }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{block.name}</h3>
                      <p className="text-xs text-gray-500">
                        {block.startTime} — {block.endTime}
                        {block.purpose && <span className="mx-1.5">•</span>}
                        {block.purpose && <span className="italic">{block.purpose}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-sm font-semibold px-2.5 py-0.5 rounded-full",
                      progress.completed === progress.total 
                        ? "bg-emerald-100 text-emerald-700" 
                        : "bg-gray-100 text-gray-600"
                    )}>
                      {progress.completed}/{progress.total}
                    </span>
                  </div>
                </div>

                {/* Activities Timeline - Vertical with time markers */}
                <div className="p-4">
                  <div className="relative">
                    {/* Vertical timeline line */}
                    <div className="absolute left-[39px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-emerald-200 via-emerald-300 to-emerald-200 rounded-full" />
                    
                    <div className="space-y-2">
                      {blockActivities
                        .sort((a, b) => (a.time || "").localeCompare(b.time || ""))
                        .map((activity, idx) => {
                          const isActivityComplete = completedActivityIds.has(activity.id);
                          const linkedHabit = habits?.find(h => h.id === activity.habitId);

                          return (
                            <motion.div
                              key={activity.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.03 }}
                              className={cn(
                                "group flex items-start gap-3 p-2 pl-0 rounded-lg transition-all cursor-pointer"
                              )}
                              onClick={() => handleToggleActivity(activity.id, activity.habitId)}
                            >
                              {/* Time badge */}
                              <div className="w-[34px] shrink-0 text-right">
                                <span className={cn(
                                  "text-xs font-mono font-semibold",
                                  isActivityComplete ? "text-emerald-500" : "text-gray-400"
                                )}>
                                  {activity.time || "—"}
                                </span>
                              </div>

                              {/* Timeline node/checkbox */}
                              <button
                                className={cn(
                                  "relative z-10 w-5 h-5 rounded-full flex items-center justify-center transition-all shrink-0 border-2",
                                  isActivityComplete 
                                    ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-200" 
                                    : "bg-white border-gray-300 group-hover:border-emerald-400 group-hover:shadow-sm"
                                )}
                                data-testid={`activity-checkbox-${activity.id}`}
                              >
                                {isActivityComplete && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 500 }}
                                  >
                                    <Check className="w-3 h-3" />
                                  </motion.div>
                                )}
                              </button>
                              
                              {/* Activity content */}
                              <div className={cn(
                                "flex-1 min-w-0 p-2.5 rounded-lg transition-all",
                                isActivityComplete 
                                  ? "bg-emerald-50/70" 
                                  : "bg-gray-50 group-hover:bg-gray-100"
                              )}>
                                <span className={cn(
                                  "text-sm font-medium transition-all block",
                                  isActivityComplete ? "text-emerald-700 line-through" : "text-gray-700"
                                )}>
                                  {activity.name}
                                </span>
                                
                                {activity.description && (
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {activity.description}
                                  </p>
                                )}
                                
                                {linkedHabit && (
                                  <div className="flex items-center gap-1.5 mt-1.5">
                                    <div 
                                      className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: linkedHabit.color }}
                                    />
                                    <span className="text-[11px] text-gray-400 font-medium">
                                      {linkedHabit.title}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
