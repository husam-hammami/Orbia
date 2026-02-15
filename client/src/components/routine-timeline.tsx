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
  Zap,
  Link2,
  Pencil,
  SkipForward,
  Droplet,
  CircleDot,
  Loader2
} from "lucide-react";
import { useRoutineBlocks, useRoutineActivities, useRoutineLogs, useToggleRoutineActivity, useHabits, useActiveRoutineTemplate, useRoutineTemplates } from "@/lib/api-hooks";
import { cn } from "@/lib/utils";
import { inferTimeSegment, getThemeBySegment, RoutineTheme } from "@/lib/routineThemes";

const iconMap: Record<string, any> = {
  Sunrise, Sun, Moon, Briefcase, Coffee, Utensils, Dumbbell, BookOpen, 
  Heart, Bed, Sparkles, Music, Users, Home, Zap, Activity
};

function formatTime24h(time24: string | null | undefined): string {
  if (!time24 || !time24.includes(':')) return time24 || '';
  const [hours, minutes] = time24.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return time24;
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

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

function getActivityIcon(name: string) {
  const nameLower = name.toLowerCase();
  if (nameLower.includes("wake") || nameLower.includes("sleep") || nameLower.includes("bed")) return Bed;
  if (nameLower.includes("meal") || nameLower.includes("eat") || nameLower.includes("food") || 
      nameLower.includes("breakfast") || nameLower.includes("lunch") || nameLower.includes("dinner")) return Utensils;
  if (nameLower.includes("water") || nameLower.includes("drink")) return Droplet;
  if (nameLower.includes("stretch") || nameLower.includes("exercise") || 
      nameLower.includes("workout") || nameLower.includes("gym")) return Dumbbell;
  if (nameLower.includes("journal") || nameLower.includes("write") || nameLower.includes("log")) return BookOpen;
  if (nameLower.includes("work") || nameLower.includes("prep")) return Briefcase;
  if (nameLower.includes("rest") || nameLower.includes("quiet")) return Coffee;
  return CircleDot;
}

function isActivityPast(activityTime: string | null): boolean {
  if (!activityTime) return false;
  const now = format(new Date(), "HH:mm");
  return activityTime < now; // Keep 24h format for comparison
}

export function RoutineTimeline() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);
  const [overrideTemplateId, setOverrideTemplateId] = useState<string | null>(null);
  
  const { data: activeTemplate } = useActiveRoutineTemplate();
  const { data: templates } = useRoutineTemplates();
  const currentTemplateId = overrideTemplateId || activeTemplate?.id;
  
  const { data: blocks, isLoading: blocksLoading } = useRoutineBlocks(currentTemplateId);
  const { data: activities, isLoading: activitiesLoading } = useRoutineActivities();
  const { data: logs } = useRoutineLogs(today);
  const { data: habits } = useHabits();
  
  const toggleMutation = useToggleRoutineActivity();
  const [togglingActivityId, setTogglingActivityId] = useState<string | null>(null);

  const completedActivityIds = useMemo(() => {
    return new Set(logs?.map(l => l.activityId) || []);
  }, [logs]);

  const blockIds = useMemo(() => {
    return new Set(blocks?.map(b => b.id) || []);
  }, [blocks]);

  const templateActivities = useMemo(() => {
    if (!activities || !blocks) return [];
    return activities.filter(a => blockIds.has(a.blockId));
  }, [activities, blocks, blockIds]);

  const blockProgress = useMemo(() => {
    if (!blocks) return {};
    const progress: Record<string, { completed: number; total: number }> = {};
    
    blocks.forEach(block => {
      const blockActivities = templateActivities.filter(a => a.blockId === block.id);
      const completed = blockActivities.filter(a => completedActivityIds.has(a.id)).length;
      progress[block.id] = { completed, total: blockActivities.length };
    });
    
    return progress;
  }, [blocks, templateActivities, completedActivityIds]);

  const totalProgress = useMemo(() => {
    if (!templateActivities.length) return 0;
    const completed = templateActivities.filter(a => completedActivityIds.has(a.id)).length;
    return Math.round((completed / templateActivities.length) * 100);
  }, [templateActivities, completedActivityIds]);

  const completedCount = useMemo(() => {
    return templateActivities.filter(a => completedActivityIds.has(a.id)).length;
  }, [templateActivities, completedActivityIds]);

  const totalCount = templateActivities.length;

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
    setTogglingActivityId(activityId);
    try {
      await toggleMutation.mutateAsync({ activityId, date: today, habitId, action });
    } catch (e) {
      console.error("Failed to toggle activity:", e);
    } finally {
      setTogglingActivityId(null);
    }
  };

  if (blocksLoading || activitiesLoading) {
    return (
      <div className="bg-gradient-to-br from-card to-muted/30 rounded-2xl border border-border/50 backdrop-blur-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="flex gap-4">
            <div className="h-16 bg-muted rounded-xl flex-1"></div>
            <div className="h-16 bg-muted rounded-xl flex-1"></div>
            <div className="h-16 bg-muted rounded-xl flex-1"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!blocks || blocks.length === 0) {
    return (
      <div className="bg-gradient-to-br from-card to-muted/30 rounded-2xl border border-border/50 backdrop-blur-sm p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground font-medium">No routine configured</p>
        <p className="text-muted-foreground/70 text-sm mt-1">Create time blocks to structure your day</p>
      </div>
    );
  }

  const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;

  return (
    <div className="space-y-4">
      {/* Template Selector */}
      {templates && templates.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          {templates.map((tmpl) => {
            const isActive = tmpl.id === currentTemplateId;
            const isAutoSelected = !overrideTemplateId && tmpl.id === activeTemplate?.id;
            return (
              <button
                key={tmpl.id}
                onClick={() => setOverrideTemplateId(isActive && overrideTemplateId ? null : tmpl.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                  isActive 
                    ? "bg-primary/15 border-primary/40 text-primary shadow-sm" 
                    : "bg-card/80 border-border hover:border-primary/30 text-muted-foreground hover:text-foreground"
                )}
                data-testid={`template-switch-${tmpl.id}`}
              >
                {tmpl.dayType === "weekend" ? "🌴" : tmpl.dayType === "holiday" ? "🎉" : "📅"}
                <span>{tmpl.name}</span>
                {isAutoSelected && (
                  <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">Auto</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Summary Strip - Futuristic */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-gradient-to-r from-card to-muted/50 border border-border/60 rounded-full px-4 py-2 backdrop-blur-sm">
          <div className="relative w-8 h-8">
            <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="14" fill="none" className="stroke-muted" strokeWidth="3" />
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
                  <stop offset="0%" className="[stop-color:hsl(var(--primary))]" />
                  <stop offset="100%" className="[stop-color:hsl(var(--accent))]" />
                </linearGradient>
              </defs>
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground" data-testid="routine-progress-percent">
              {totalProgress}%
            </span>
          </div>
          <div className="text-sm">
            <span className="font-semibold text-foreground">{completedCount}</span>
            <span className="text-muted-foreground">/{totalCount} done</span>
          </div>
        </div>

        {currentBlock && (
          <div className="flex items-center gap-2 bg-background/50 border border-primary/20 rounded-full px-3 py-1.5 backdrop-blur-xl shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-sm text-muted-foreground">
              Now: <span className="font-medium text-foreground">{currentBlock.name}</span>
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto font-mono">
          <Clock className="w-3.5 h-3.5" />
          <span>{format(new Date(), "h:mm a")}</span>
        </div>
      </div>

      {/* Timeline Ribbon - Futuristic Glassmorphic */}
      <div className="relative bg-gradient-to-br from-card/80 to-muted/30 rounded-xl border border-border/60 p-4 backdrop-blur-sm overflow-x-auto" data-swipe-ignore>
        {/* Orbit Thread Line - Gradient */}
        <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-gradient-to-r from-primary/30 via-accent/30 to-primary/30 rounded-full -translate-y-1/2 z-0 hidden md:block" />
        
        <div className="flex md:grid gap-3 md:gap-2 relative z-10 pb-2 md:pb-0" style={{ gridTemplateColumns: `repeat(${blocks.length}, 1fr)` }}>
          {[...blocks].sort((a, b) => a.startTime.localeCompare(b.startTime)).map((block, idx) => {
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
                  "border backdrop-blur-sm min-w-[100px] md:min-w-0 flex-shrink-0 md:flex-shrink",
                  isCurrent 
                    ? `bg-gradient-to-br ${theme.bgGradient} ${theme.borderColor} shadow-[0_0_30px_-8px_rgba(99,102,241,0.4)] ring-2 ring-opacity-50`
                    : isComplete 
                      ? `bg-gradient-to-br ${theme.bgGradient} ${theme.borderColor} shadow-[0_0_25px_-5px_rgba(6,182,212,0.5)]`
                      : isExpanded
                        ? `bg-gradient-to-br ${theme.bgGradient} ${theme.borderColor} shadow-md`
                        : `bg-card/80 border-border hover:${theme.borderColor} hover:shadow-md`
                )}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                data-testid={`routine-block-${block.id}`}
              >
                {/* Progress Ring */}
                <div className="relative mb-2">
                  <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
                    <circle cx="20" cy="20" r="16" fill="none" className="stroke-muted" strokeWidth="3" />
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
                  isComplete || isCurrent ? theme.iconColor : "text-foreground"
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
                    {formatTime24h(block.startTime)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">→</span>
                  <span className="text-[10px] font-mono font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                    {formatTime24h(block.endTime)}
                  </span>
                </div>

                {progress.total > 0 && (
                  <span className={cn(
                    "text-[10px] font-semibold mt-1.5 px-2 py-0.5 rounded-full",
                    isComplete ? `${theme.iconBg} ${theme.iconColor}` : "bg-muted text-muted-foreground"
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
                  "flex items-center justify-between px-4 py-3 border-b border-border/30",
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
                      <h3 className="font-semibold text-foreground">{block.name}</h3>
                      <p className="text-xs text-muted-foreground font-mono">
                        {formatTime24h(block.startTime)} — {formatTime24h(block.endTime)}
                        {block.purpose && <span className="mx-1.5 font-sans">•</span>}
                        {block.purpose && <span className="italic font-sans">{block.purpose}</span>}
                      </p>
                    </div>
                  </div>
                  <span className={cn(
                    "text-sm font-semibold px-2.5 py-0.5 rounded-full",
                    progress.completed === progress.total 
                      ? `${theme.iconBg} ${theme.iconColor}` 
                      : "bg-muted text-muted-foreground"
                  )}>
                    {progress.completed}/{progress.total}
                  </span>
                </div>

                {/* Activities - Vertical Timeline */}
                <div className="p-4 bg-card/90">
                  <div className="relative">
                    {sortedActivities.map((activity, idx) => {
                      const isActivityComplete = completedActivityIds.has(activity.id);
                      const isLast = idx === sortedActivities.length - 1;
                      const isPast = isActivityPast(activity.time);
                      const shouldFade = isPast && !isActivityComplete;
                      const ActivityIcon = getActivityIcon(activity.name);
                      const isToggling = togglingActivityId === activity.id;

                      return (
                        <motion.div
                          key={activity.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className={cn(
                            "flex gap-4 group cursor-pointer",
                            shouldFade && "opacity-60"
                          )}
                          onClick={() => handleToggleActivity(activity.id, activity.habitId)}
                          data-testid={`activity-card-${activity.id}`}
                        >
                          {/* Time Column */}
                          <div className="w-14 shrink-0 pt-1 text-right">
                            <span className={cn(
                              "text-sm font-mono font-bold",
                              isActivityComplete ? theme.iconColor : "text-muted-foreground"
                            )}>
                              {activity.time || "—"}
                            </span>
                          </div>

                          {/* Timeline Rail */}
                          <div className="relative flex flex-col items-center">
                            {/* Node */}
                            <div className="relative">
                              <motion.button
                                className={cn(
                                  "relative z-10 w-8 h-8 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center transition-all border-2 shrink-0",
                                  isActivityComplete 
                                    ? `${theme.nodeBg} border-card text-white shadow-sm` 
                                    : "bg-card border-border group-hover:border-muted-foreground group-hover:shadow-md"
                                )}
                                animate={isActivityComplete && !isToggling ? {
                                  scale: [1, 1.2, 1],
                                  boxShadow: [
                                    "0 0 0 0 rgba(99, 102, 241, 0)",
                                    "0 0 12px 4px rgba(99, 102, 241, 0.4)",
                                    "0 0 0 0 rgba(99, 102, 241, 0)"
                                  ]
                                } : {}}
                                transition={{ duration: 0.4 }}
                                data-testid={`activity-checkbox-${activity.id}`}
                              >
                                {isToggling ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : isActivityComplete ? (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 500 }}
                                  >
                                    <Check className="w-4 h-4" />
                                  </motion.div>
                                ) : null}
                              </motion.button>
                            </div>
                            
                            {/* Connector Line */}
                            {!isLast && (
                              <div className={cn(
                                "w-0.5 flex-1 min-h-[24px]",
                                isActivityComplete 
                                  ? `${theme.nodeBg}` 
                                  : "bg-gradient-to-b from-border to-muted"
                              )} />
                            )}
                          </div>

                          {/* Content Card */}
                          <div className={cn(
                            "flex-1 pb-4 min-w-0"
                          )}>
                            <div className="relative">
                              <div className={cn(
                                "relative p-3 rounded-xl border-l-4 border transition-all",
                                isActivityComplete 
                                  ? `${theme.completedBg} ${theme.completedBorder} shadow-sm` 
                                  : "bg-card border-border group-hover:border-muted-foreground group-hover:shadow-sm",
                                isActivityComplete ? theme.borderColor : theme.borderColor
                              )}
                              style={{ borderLeftColor: theme.accentColor }}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <ActivityIcon className={cn(
                                        "w-3.5 h-3.5 shrink-0",
                                        isActivityComplete ? theme.iconColor : "text-muted-foreground"
                                      )} />
                                      <span className={cn(
                                        "text-sm font-semibold",
                                        isActivityComplete ? `${theme.iconColor} line-through` : "text-foreground"
                                      )}>
                                        {activity.name}
                                      </span>
                                      {activity.habitId && (
                                        <span className={cn(
                                          "inline-flex items-center justify-center w-5 h-5 rounded-full shrink-0",
                                          theme.iconBg
                                        )}>
                                          <Link2 className={cn("w-3 h-3", theme.iconColor)} />
                                        </span>
                                      )}
                                    </div>
                              
                                    {activity.description && (
                                      <p className="text-xs text-muted-foreground italic mt-1">
                                        {activity.description}
                                      </p>
                                    )}
                                  </div>
                                  
                                  {/* Hover Actions */}
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); }}
                                      className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                                      data-testid={`activity-edit-${activity.id}`}
                                      aria-label="Edit activity"
                                      title="Edit"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); }}
                                      className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                                      data-testid={`activity-skip-${activity.id}`}
                                      aria-label="Skip activity"
                                      title="Skip"
                                    >
                                      <SkipForward className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
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
