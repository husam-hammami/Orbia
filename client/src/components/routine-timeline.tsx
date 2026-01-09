import { useMemo, useState } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Check, 
  Clock, 
  Sunrise,
  Sun,
  Briefcase,
  Coffee,
  Moon,
  Utensils,
  Dumbbell,
  BookOpen,
  Activity,
  Heart,
  Bed,
  Sparkles,
  Music,
  Users,
  Home,
  Zap
} from "lucide-react";
import { useRoutineBlocks, useRoutineActivities, useRoutineLogs, useToggleRoutineActivity, useHabits } from "@/lib/api-hooks";
import { cn } from "@/lib/utils";
import { inferTimeSegment, getThemeBySegment, RoutineTheme } from "@/lib/routineThemes";

const iconMap: Record<string, any> = {
  Sunrise, Sun, Moon, Briefcase, Coffee, Utensils, Dumbbell, BookOpen, 
  Heart, Bed, Sparkles, Music, Users, Home, Zap, Activity
};

function getBlockIcon(name: string, storedIcon?: string | null) {
  if (storedIcon && iconMap[storedIcon]) {
    return iconMap[storedIcon];
  }
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
      <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 rounded-2xl border border-slate-200/50 backdrop-blur-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="flex gap-4">
            <div className="h-16 bg-slate-100 rounded-xl flex-1"></div>
            <div className="h-16 bg-slate-100 rounded-xl flex-1"></div>
            <div className="h-16 bg-slate-100 rounded-xl flex-1"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!blocks || blocks.length === 0) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 rounded-2xl border border-slate-200/50 backdrop-blur-sm p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-slate-300" />
        </div>
        <p className="text-slate-500 font-medium">No routine configured</p>
        <p className="text-slate-400 text-sm mt-1">Create time blocks to structure your day</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Strip - Futuristic */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-gradient-to-r from-slate-50 to-indigo-50 border border-slate-200/60 rounded-full px-4 py-2 backdrop-blur-sm">
          <div className="relative w-8 h-8">
            <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="14" fill="none" stroke="#e2e8f0" strokeWidth="3" />
              <motion.circle 
                cx="16" cy="16" r="14" 
                fill="none" 
                stroke="url(#futuristicGradient)" 
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${totalProgress * 0.88} 88`}
                initial={{ strokeDasharray: "0 88" }}
                animate={{ strokeDasharray: `${totalProgress * 0.88} 88` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
              <defs>
                <linearGradient id="futuristicGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0891b2" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-600" data-testid="routine-progress-percent">
              {totalProgress}%
            </span>
          </div>
          <div className="text-sm">
            <span className="font-semibold text-slate-700">{completedCount}</span>
            <span className="text-slate-500">/{totalCount} done</span>
          </div>
        </div>

        {currentBlock && (
          <div className="flex items-center gap-2 bg-white/80 border border-cyan-200/60 rounded-full px-3 py-1.5 backdrop-blur-sm shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span className="text-sm text-slate-600">
              Now: <span className="font-medium text-slate-800">{currentBlock.name}</span>
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs text-slate-400 ml-auto font-mono">
          <Clock className="w-3.5 h-3.5" />
          <span>{format(new Date(), "HH:mm")}</span>
        </div>
      </div>

      {/* Timeline Ribbon - Futuristic Glassmorphic */}
      <div className="relative bg-gradient-to-br from-white/80 to-slate-50/80 rounded-xl border border-slate-200/60 p-4 backdrop-blur-sm">
        {/* Orbit Thread Line - Gradient */}
        <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-gradient-to-r from-cyan-300/50 via-indigo-300/50 to-violet-300/50 rounded-full -translate-y-1/2 z-0" />
        
        <div className="grid gap-2 relative z-10" style={{ gridTemplateColumns: `repeat(${blocks.length}, 1fr)` }}>
          {blocks.map((block, idx) => {
            const progress = blockProgress[block.id] || { completed: 0, total: 0 };
            const isCurrent = currentBlock?.id === block.id;
            const isComplete = progress.total > 0 && progress.completed === progress.total;
            const progressPercent = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
            const BlockIcon = getBlockIcon(block.name, block.icon);
            const isExpanded = expandedBlock === block.id;
            const timeSegment = inferTimeSegment(block.name, block.startTime);
            const theme = getThemeBySegment(timeSegment);

            return (
              <motion.button
                key={block.id}
                onClick={() => setExpandedBlock(isExpanded ? null : block.id)}
                className={cn(
                  "relative flex flex-col items-center p-3 rounded-xl transition-all duration-200",
                  "border backdrop-blur-sm",
                  isCurrent 
                    ? `bg-gradient-to-br ${theme.bgGradient} ${theme.borderColor} shadow-[0_0_30px_-8px_rgba(99,102,241,0.4)] ring-2 ring-opacity-50`
                    : isComplete 
                      ? `bg-gradient-to-br ${theme.bgGradient} ${theme.borderColor} shadow-[0_0_25px_-5px_rgba(6,182,212,0.5)]`
                      : isExpanded
                        ? `bg-gradient-to-br ${theme.bgGradient} ${theme.borderColor} shadow-md`
                        : `bg-white/80 border-slate-200 hover:${theme.borderColor} hover:shadow-md`
                )}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                data-testid={`routine-block-${block.id}`}
              >
                {/* Progress Ring */}
                <div className="relative mb-2">
                  <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
                    <circle cx="20" cy="20" r="16" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                    <motion.circle 
                      cx="20" cy="20" r="16" 
                      fill="none" 
                      stroke={theme.progressColor}
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
                    theme.iconBg,
                    isCurrent && "animate-pulse"
                  )}>
                    <BlockIcon className={cn(
                      "w-4 h-4",
                      theme.iconColor
                    )} />
                  </div>
                  
                  {isCurrent && (
                    <motion.div 
                      className={cn(
                        "absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white",
                        theme.nodeBg
                      )}
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    />
                  )}
                </div>

                <span className={cn(
                  "text-xs font-semibold text-center leading-tight",
                  isComplete || isCurrent ? theme.iconColor : "text-slate-700"
                )}>
                  {block.name}
                </span>
                
                {/* Time Range */}
                <div className="flex items-center gap-1 mt-1">
                  <span className={cn(
                    "text-[10px] font-mono font-medium px-1.5 py-0.5 rounded",
                    theme.iconColor,
                    theme.iconBg
                  )}>
                    {block.startTime.slice(0, 5)}
                  </span>
                  <span className="text-[10px] text-slate-400">→</span>
                  <span className="text-[10px] font-mono font-medium text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded">
                    {block.endTime.slice(0, 5)}
                  </span>
                </div>

                {progress.total > 0 && (
                  <span className={cn(
                    "text-[10px] font-semibold mt-1.5 px-2 py-0.5 rounded-full",
                    isComplete ? `${theme.iconBg} ${theme.iconColor}` : "bg-slate-100 text-slate-500"
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
                    <div className={cn(
                      "w-2 h-2 bg-white border-b border-r rotate-45 transform",
                      theme.borderColor
                    )} />
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Expanded Activity Panel - Proportional Timeline */}
      <AnimatePresence mode="wait">
        {expandedBlock && (() => {
          const block = blocks.find(b => b.id === expandedBlock);
          if (!block) return null;
          
          const blockActivities = activities?.filter(a => a.blockId === block.id) || [];
          const progress = blockProgress[block.id] || { completed: 0, total: 0 };
          const BlockIcon = getBlockIcon(block.name, block.icon);
          const timeSegment = inferTimeSegment(block.name, block.startTime);
          const theme = getThemeBySegment(timeSegment);

          const sortedActivities = [...blockActivities].sort((a, b) => 
            (a.time || "").localeCompare(b.time || "")
          );

          return (
            <motion.div
              key={block.id}
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className={cn(
                "rounded-xl border backdrop-blur-sm shadow-sm overflow-hidden",
                theme.borderColor
              )}>
                {/* Block Header */}
                <div className={cn(
                  "flex items-center justify-between px-4 py-3 border-b border-slate-100",
                  `bg-gradient-to-r ${theme.bgGradient}`
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      theme.iconBg
                    )}>
                      <BlockIcon className={cn("w-4 h-4", theme.iconColor)} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">{block.name}</h3>
                      <p className="text-xs text-slate-500 font-mono">
                        {block.startTime} — {block.endTime}
                        {block.purpose && <span className="mx-1.5 font-sans">•</span>}
                        {block.purpose && <span className="italic font-sans">{block.purpose}</span>}
                      </p>
                    </div>
                  </div>
                  <span className={cn(
                    "text-sm font-semibold px-2.5 py-0.5 rounded-full",
                    progress.completed === progress.total 
                      ? `${theme.iconBg} ${theme.iconColor}` 
                      : "bg-slate-100 text-slate-600"
                  )}>
                    {progress.completed}/{progress.total}
                  </span>
                </div>

                {/* Activities - Vertical Timeline */}
                <div className="p-4 bg-white/90">
                  <div className="relative">
                    {sortedActivities.map((activity, idx) => {
                      const isActivityComplete = completedActivityIds.has(activity.id);
                      const isLast = idx === sortedActivities.length - 1;

                      return (
                        <motion.div
                          key={activity.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className="flex gap-4 group cursor-pointer"
                          onClick={() => handleToggleActivity(activity.id, activity.habitId)}
                          data-testid={`activity-card-${activity.id}`}
                        >
                          {/* Time Column */}
                          <div className="w-14 shrink-0 pt-1 text-right">
                            <span className={cn(
                              "text-sm font-mono font-bold",
                              isActivityComplete ? theme.iconColor : "text-slate-500"
                            )}>
                              {activity.time || "—"}
                            </span>
                          </div>

                          {/* Timeline Rail */}
                          <div className="relative flex flex-col items-center">
                            {/* Node */}
                            <div className="relative">
                              <button
                                className={cn(
                                  "relative z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all border-2 shrink-0",
                                  isActivityComplete 
                                    ? `${theme.nodeBg} border-white text-white shadow-sm` 
                                    : "bg-white border-slate-300 group-hover:border-slate-400 group-hover:shadow-md"
                                )}
                                data-testid={`activity-checkbox-${activity.id}`}
                              >
                                {isActivityComplete && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 500 }}
                                  >
                                    <Check className="w-4 h-4" />
                                  </motion.div>
                                )}
                              </button>
                            </div>
                            
                            {/* Connector Line */}
                            {!isLast && (
                              <div className={cn(
                                "w-0.5 flex-1 min-h-[24px]",
                                isActivityComplete 
                                  ? `${theme.nodeBg}` 
                                  : "bg-gradient-to-b from-slate-200 to-slate-100"
                              )} />
                            )}
                          </div>

                          {/* Content Card */}
                          <div className={cn(
                            "flex-1 pb-4 min-w-0"
                          )}>
                            <div className="relative">
                              <div className={cn(
                                "relative p-3 rounded-xl border transition-all",
                                isActivityComplete 
                                  ? `${theme.completedBg} ${theme.completedBorder} shadow-sm` 
                                  : "bg-white border-slate-200 group-hover:border-slate-300 group-hover:shadow-sm"
                              )}>
                              <span className={cn(
                                "text-sm font-semibold block",
                                isActivityComplete ? `${theme.iconColor} line-through` : "text-slate-800"
                              )}>
                                {activity.name}
                              </span>
                              
                              {activity.description && (
                                <p className="text-xs text-slate-500 mt-1">
                                  {activity.description}
                                </p>
                              )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
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
