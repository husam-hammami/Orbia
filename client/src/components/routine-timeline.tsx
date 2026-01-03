import { useMemo, useState } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Clock, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { useRoutineBlocks, useRoutineActivities, useRoutineLogs, useAddRoutineLog, useRemoveRoutineLog, useAddHabitCompletion, useRemoveHabitCompletion, useHabits, useAllHabitCompletions } from "@/lib/api-hooks";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export function RoutineTimeline() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);
  
  const { data: blocks, isLoading: blocksLoading } = useRoutineBlocks();
  const { data: activities, isLoading: activitiesLoading } = useRoutineActivities();
  const { data: logs } = useRoutineLogs(today);
  const { data: habits } = useHabits();
  const { data: allHabitCompletions } = useAllHabitCompletions();
  
  const addLogMutation = useAddRoutineLog();
  const removeLogMutation = useRemoveRoutineLog();
  const addHabitCompletionMutation = useAddHabitCompletion();
  const removeHabitCompletionMutation = useRemoveHabitCompletion();

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
    
    if (isCompleted) {
      await removeLogMutation.mutateAsync({ activityId, date: today });
      if (habitId && completedHabitIds.has(habitId)) {
        await removeHabitCompletionMutation.mutateAsync({ habitId, date: today });
      }
    } else {
      await addLogMutation.mutateAsync({ activityId, completedDate: today });
      if (habitId && !completedHabitIds.has(habitId)) {
        await addHabitCompletionMutation.mutateAsync({ habitId, date: today });
      }
    }
  };

  if (blocksLoading || activitiesLoading) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-full"></div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!blocks || blocks.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6 text-center text-muted-foreground">
        <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No routine configured yet</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="p-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">Today's Routine</h2>
          </div>
          <span className="text-sm font-medium text-primary" data-testid="routine-progress-percent">
            {totalProgress}% Complete
          </span>
        </div>
        <Progress value={totalProgress} className="h-2" />
      </div>

      <div className="divide-y divide-border">
        {blocks.map((block) => {
          const progress = blockProgress[block.id] || { completed: 0, total: 0 };
          const isExpanded = expandedBlock === block.id;
          const isCurrent = currentBlock?.id === block.id;
          const blockActivities = activities?.filter(a => a.blockId === block.id) || [];
          const isComplete = progress.total > 0 && progress.completed === progress.total;

          return (
            <div key={block.id} className={cn(
              "transition-colors",
              isCurrent && "bg-primary/5"
            )}>
              <button
                onClick={() => setExpandedBlock(isExpanded ? null : block.id)}
                className="w-full p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors"
                data-testid={`routine-block-${block.id}`}
              >
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={{ backgroundColor: `${block.color}20` }}
                >
                  {block.emoji}
                </div>
                
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{block.name}</span>
                    {isCurrent && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                        Now
                      </span>
                    )}
                    {isComplete && (
                      <Check className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {block.startTime} - {block.endTime}
                    <span className="mx-2">·</span>
                    {progress.completed}/{progress.total} done
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-24">
                    <Progress 
                      value={progress.total > 0 ? (progress.completed / progress.total) * 100 : 0} 
                      className="h-1.5"
                      style={{ 
                        backgroundColor: `${block.color}20`,
                      }}
                    />
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
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
                    <div className="px-4 pb-4 space-y-2">
                      <p className="text-xs text-muted-foreground italic px-2 mb-3">
                        {block.purpose}
                      </p>
                      
                      {blockActivities.map((activity) => {
                        const isActivityComplete = completedActivityIds.has(activity.id);
                        const linkedHabit = habits?.find(h => h.id === activity.habitId);
                        
                        return (
                          <div 
                            key={activity.id}
                            className={cn(
                              "flex items-start gap-3 p-3 rounded-lg transition-colors",
                              isActivityComplete ? "bg-green-500/10" : "bg-muted/30 hover:bg-muted/50"
                            )}
                          >
                            <Checkbox
                              checked={isActivityComplete}
                              onCheckedChange={() => handleToggleActivity(activity.id, activity.habitId)}
                              className="mt-0.5"
                              data-testid={`activity-checkbox-${activity.id}`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {activity.time && (
                                  <span className="text-xs text-muted-foreground font-mono">
                                    {activity.time}
                                  </span>
                                )}
                                <span className={cn(
                                  "font-medium",
                                  isActivityComplete && "line-through text-muted-foreground"
                                )}>
                                  {activity.name}
                                </span>
                              </div>
                              {activity.description && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {activity.description}
                                </p>
                              )}
                              {linkedHabit && (
                                <span 
                                  className="inline-flex items-center text-xs mt-1 px-2 py-0.5 rounded-full"
                                  style={{ backgroundColor: `${linkedHabit.color}20`, color: linkedHabit.color }}
                                >
                                  Links to: {linkedHabit.title}
                                </span>
                              )}
                            </div>
                          </div>
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
