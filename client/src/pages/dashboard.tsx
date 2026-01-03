import { Layout } from "@/components/layout";
import { SystemJournal } from "@/components/system-journal";
import { HeadspaceMap } from "@/components/headspace-map";
import { GroundingAnchor } from "@/components/grounding-anchor";
import { format, subDays, parseISO, isSameDay } from "date-fns";
import { NotebookPen, BrainCircuit, Smile, Frown, Meh, Zap, TrendingUp, TrendingDown, Minus, Activity, CheckCircle2, Clock, Loader2, CloudFog, HeartPulse, Moon, MessageSquare, Flame, Utensils } from "lucide-react";
import { useMembers } from "@/lib/api-hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useHabits, useTrackerEntries, useRoutineLogs, useRoutineActivities, useRoutineBlocks } from "@/lib/api-hooks";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { parseTrackerNotes } from "@/lib/parse-notes";

async function fetchAllCompletions(habitIds: string[]): Promise<Record<string, string[]>> {
  const results: Record<string, string[]> = {};
  await Promise.all(
    habitIds.map(async (id) => {
      try {
        const response = await fetch(`/api/habits/${id}/completions`);
        if (response.ok) {
          const completions = await response.json();
          results[id] = completions.map((c: any) => c.completedDate);
        } else {
          results[id] = [];
        }
      } catch {
        results[id] = [];
      }
    })
  );
  return results;
}

export default function Dashboard() {
  const today = format(new Date(), "yyyy-MM-dd");
  const todayDate = new Date();
  
  const { data: dbHabits, isLoading: habitsLoading } = useHabits();
  const { data: trackerEntries, isLoading: trackerLoading } = useTrackerEntries(30);
  const { data: routineLogs } = useRoutineLogs(today);
  const { data: routineActivities } = useRoutineActivities();
  const { data: routineBlocks } = useRoutineBlocks();
  const { data: members } = useMembers();
  const [showHeadspace, setShowHeadspace] = useState(false);
  
  const habitIds = dbHabits?.map(h => h.id) || [];
  
  const { data: allCompletions, isLoading: completionsLoading } = useQuery({
    queryKey: ["allCompletions", habitIds.join(",")],
    queryFn: () => fetchAllCompletions(habitIds),
    enabled: habitIds.length > 0,
  });

  const entriesToday = (trackerEntries || []).filter(entry => {
    const entryDate = format(new Date(entry.timestamp), "yyyy-MM-dd");
    return entryDate === today;
  });

  const last7DaysEntries = (trackerEntries || []).filter(entry => {
    const entryDate = new Date(entry.timestamp);
    const sevenDaysAgo = subDays(todayDate, 7);
    return entryDate >= sevenDaysAgo;
  });

  const avgMood = last7DaysEntries.length > 0 
    ? last7DaysEntries.reduce((sum, e) => sum + e.mood, 0) / last7DaysEntries.length 
    : 0;
  const avgEnergy = last7DaysEntries.length > 0 
    ? last7DaysEntries.reduce((sum, e) => sum + e.energy, 0) / last7DaysEntries.length 
    : 0;
  const avgStress = last7DaysEntries.length > 0 
    ? last7DaysEntries.reduce((sum, e) => sum + e.stress, 0) / last7DaysEntries.length 
    : 0;

  const habitsCompletedToday = habitIds.filter(id => 
    (allCompletions?.[id] || []).includes(today)
  ).length;

  const todayLogs = routineLogs || [];
  const completedActivitiesToday = todayLogs.filter((log: any) => log.completed).length;
  const totalActivities = routineActivities?.length || 0;

  const getMoodIcon = (mood: number) => {
    if (mood <= 3) return <Frown className="w-5 h-5 text-red-500" />;
    if (mood <= 5) return <Meh className="w-5 h-5 text-yellow-500" />;
    if (mood <= 7) return <Smile className="w-5 h-5 text-green-500" />;
    return <Zap className="w-5 h-5 text-blue-500" />;
  };

  const getMoodLabel = (mood: number) => {
    if (mood <= 2) return "Terrible";
    if (mood <= 4) return "Low";
    if (mood <= 6) return "Okay";
    if (mood <= 8) return "Good";
    return "Great";
  };

  const getTrend = (current: number, target: number) => {
    if (current > target) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (current < target) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const isLoading = habitsLoading || trackerLoading || completionsLoading;

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-muted-foreground font-medium mb-1">{format(new Date(), "EEEE, MMMM do")}</p>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">Your insights and patterns at a glance</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Button 
               variant={showHeadspace ? "default" : "outline"}
               size="sm" 
               className="gap-2"
               onClick={() => setShowHeadspace(!showHeadspace)}
               data-testid="button-toggle-headspace"
            >
               <BrainCircuit className="w-4 h-4" />
               {showHeadspace ? "Hide Headspace" : "Show Headspace"}
            </Button>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full h-12 w-12 border-primary/20 text-primary hover:bg-primary/5" title="System Journal" data-testid="button-open-journal">
                  <NotebookPen className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[400px] sm:w-[540px]">
                <SheetHeader className="mb-4">
                  <SheetTitle>System Journal</SheetTitle>
                  <SheetDescription>
                    A shared space for notes, reminders, and communication.
                  </SheetDescription>
                </SheetHeader>
                <SystemJournal />
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {showHeadspace && (
           <div className="animate-in slide-in-from-top-4 duration-300">
              <HeadspaceMap />
           </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Loading insights...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card data-testid="card-mood-summary">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Mood Today
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {entriesToday.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        {getMoodIcon(entriesToday[entriesToday.length - 1].mood)}
                        <span className="text-2xl font-bold">{getMoodLabel(entriesToday[entriesToday.length - 1].mood)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {entriesToday.length} entries today • Avg: {(entriesToday.reduce((sum, e) => sum + e.mood, 0) / entriesToday.length).toFixed(1)}/10
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No entries today</p>
                  )}
                </CardContent>
              </Card>

              <Card data-testid="card-habits-summary">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Habits Today
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold font-mono">{habitsCompletedToday}/{habitIds.length}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all"
                        style={{ width: habitIds.length > 0 ? `${(habitsCompletedToday / habitIds.length) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {habitsCompletedToday === habitIds.length && habitIds.length > 0 ? "All done! Great job!" : `${habitIds.length - habitsCompletedToday} remaining`}
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="card-routine-summary">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Routine Today
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold font-mono">{completedActivitiesToday}/{totalActivities}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 transition-all"
                        style={{ width: totalActivities > 0 ? `${(completedActivitiesToday / totalActivities) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {completedActivitiesToday === totalActivities && totalActivities > 0 ? "Routine complete!" : "Activities completed"}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card data-testid="card-mood-entries">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Recent Mood Entries
                  </CardTitle>
                  <CardDescription>Your mood and mental metrics over time</CardDescription>
                </CardHeader>
                <CardContent>
                  {(trackerEntries || []).length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No entries yet. Start tracking on the Daily Tracker!</p>
                  ) : (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                      {(trackerEntries || []).slice(0, 10).map((entry) => {
                        const parsed = parseTrackerNotes(entry.notes);
                        const fronter = members?.find(m => m.id === entry.frontingMemberId);
                        
                        return (
                          <div 
                            key={entry.id} 
                            className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-3"
                            data-testid={`entry-mood-${entry.id}`}
                          >
                            {/* Header: Mood, Time, Fronter */}
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                              <div className="flex items-center gap-3">
                                <div className={cn("p-2 rounded-lg", entry.mood <= 3 ? "bg-red-100 dark:bg-red-900/20" : entry.mood <= 5 ? "bg-yellow-100 dark:bg-yellow-900/20" : entry.mood <= 7 ? "bg-green-100 dark:bg-green-900/20" : "bg-blue-100 dark:bg-blue-900/20")}>
                                  {getMoodIcon(entry.mood)}
                                </div>
                                <div>
                                  <span className="font-semibold">{getMoodLabel(entry.mood)}</span>
                                  <span className="text-muted-foreground ml-2 text-sm">{entry.mood}/10</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                {fronter && (
                                  <span className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full text-xs">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: fronter.color }} />
                                    {fronter.name}
                                  </span>
                                )}
                                <span>{format(new Date(entry.timestamp), "MMM d, h:mm a")}</span>
                              </div>
                            </div>

                            {/* Metrics Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <div className="flex items-center gap-2 bg-background p-2 rounded-lg border">
                                <Zap className="w-4 h-4 text-yellow-500" />
                                <div className="text-xs">
                                  <span className="text-muted-foreground">Energy</span>
                                  <span className="font-semibold ml-1">{entry.energy}/10</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 bg-background p-2 rounded-lg border">
                                <Activity className="w-4 h-4 text-red-500" />
                                <div className="text-xs">
                                  <span className="text-muted-foreground">Stress</span>
                                  <span className="font-semibold ml-1">{entry.stress}%</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 bg-background p-2 rounded-lg border">
                                <CloudFog className="w-4 h-4 text-purple-500" />
                                <div className="text-xs">
                                  <span className="text-muted-foreground">Dissociation</span>
                                  <span className="font-semibold ml-1">{entry.dissociation}%</span>
                                </div>
                              </div>
                              {parsed.metrics["Comfort"] && (
                                <div className="flex items-center gap-2 bg-background p-2 rounded-lg border">
                                  <HeartPulse className="w-4 h-4 text-pink-500" />
                                  <div className="text-xs">
                                    <span className="text-muted-foreground">Pain</span>
                                    <span className="font-semibold ml-1">{parsed.metrics["Comfort"]}</span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Tags, Triggers, Meals */}
                            {(parsed.tags.length > 0 || parsed.triggers.length > 0 || parsed.meals.length > 0) && (
                              <div className="flex flex-wrap gap-1.5">
                                {parsed.tags.map((tag, i) => (
                                  <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                    {tag}
                                  </span>
                                ))}
                                {parsed.triggers.map((trigger, i) => (
                                  <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800">
                                    {trigger}
                                  </span>
                                ))}
                                {parsed.meals.map((meal, i) => (
                                  <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                                    <Utensils className="w-3 h-3 inline mr-1" />{meal}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Notes */}
                            {parsed.text && (
                              <p className="text-sm text-muted-foreground bg-background p-2 rounded-lg border italic">
                                "{parsed.text}"
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card data-testid="card-weekly-overview">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    7-Day Overview
                  </CardTitle>
                  <CardDescription>Average metrics from the past week</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Smile className="w-5 h-5 text-green-500" />
                        <span className="font-medium">Avg Mood</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-lg font-bold">{avgMood.toFixed(1)}/10</span>
                        {getTrend(avgMood, 5)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-yellow-500" />
                        <span className="font-medium">Avg Energy</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-lg font-bold">{avgEnergy.toFixed(1)}/10</span>
                        {getTrend(avgEnergy, 5)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-red-500" />
                        <span className="font-medium">Avg Stress</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-lg font-bold">{avgStress.toFixed(0)}%</span>
                        {getTrend(50, avgStress)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                        <span className="font-medium">Entries This Week</span>
                      </div>
                      <span className="font-mono text-lg font-bold">{last7DaysEntries.length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card data-testid="card-habit-history">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Habit Completion History
                </CardTitle>
                <CardDescription>Last 7 days of habit tracking</CardDescription>
              </CardHeader>
              <CardContent>
                {(dbHabits || []).length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No habits yet. Add habits on the Daily Tracker!</p>
                ) : (
                  <div className="space-y-3">
                    {(dbHabits || []).map((habit) => {
                      const history = allCompletions?.[habit.id] || [];
                      const last7Days = Array.from({ length: 7 }).map((_, i) => {
                        const date = subDays(todayDate, 6 - i);
                        const dateStr = format(date, "yyyy-MM-dd");
                        return { date, dateStr, completed: history.includes(dateStr) };
                      });
                      const completedCount = last7Days.filter(d => d.completed).length;
                      
                      return (
                        <div key={habit.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 border border-border/50" data-testid={`habit-history-${habit.id}`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: habit.color }}
                              />
                              <span className="font-medium truncate">{habit.title}</span>
                              <span className="text-xs text-muted-foreground ml-auto">{completedCount}/7 days</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {last7Days.map((day, i) => (
                              <div
                                key={i}
                                className={cn(
                                  "w-6 h-6 rounded-md flex items-center justify-center text-xs font-medium transition-colors",
                                  day.completed 
                                    ? "bg-primary text-primary-foreground" 
                                    : "bg-muted text-muted-foreground"
                                )}
                                title={format(day.date, "MMM d")}
                              >
                                {format(day.date, "d")}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
      <GroundingAnchor />
    </Layout>
  );
}
