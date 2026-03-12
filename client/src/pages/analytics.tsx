import { useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  LineChart, 
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis
} from "recharts";
import { 
  BrainCircuit, 
  Utensils, 
  Briefcase, 
  TrendingUp, 
  Activity, 
  Zap, 
  Smile, 
  Frown,
  Meh,
  Calendar,
  CheckCircle2,
  Target,
  AlertCircle,
  CloudFog,
  MessageSquare,
  Flame,
  Battery,
  Users,
  Clock,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTrackerEntries, useHabits, useAllHabitCompletions, useRoutineBlocks, useRoutineActivities, useRoutineLogs } from "@/lib/api-hooks";
import { format, subDays, startOfDay, isSameDay } from "date-fns";

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("weekly");
  
  const { data: trackerEntries, isLoading: entriesLoading } = useTrackerEntries(100);
  const { data: habits, isLoading: habitsLoading } = useHabits();
  const { data: allCompletions, isLoading: completionsLoading } = useAllHabitCompletions();
  const { data: routineBlocks } = useRoutineBlocks();
  const { data: routineActivities } = useRoutineActivities();
  const today = format(new Date(), "yyyy-MM-dd");
  const { data: todayRoutineLogs } = useRoutineLogs(today);
  
  const isLoading = entriesLoading || habitsLoading || completionsLoading;
  const hasData = (trackerEntries?.length || 0) > 0;
  
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  const chartData = useMemo(() => {
    if (!trackerEntries || trackerEntries.length === 0) return { moodData: [], detailedMetrics: [], habitData: [], moodDistribution: [] };
    
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return { date, name: dayNames[date.getDay()] };
    });
    
    const moodData = last7Days.map(({ date, name }) => {
      const dayEntries = trackerEntries.filter(e => isSameDay(new Date(e.timestamp), date));
      const avgMood = dayEntries.length ? dayEntries.reduce((sum, e) => sum + e.mood, 0) / dayEntries.length : 0;
      const avgEnergy = dayEntries.length ? dayEntries.reduce((sum, e) => sum + e.energy, 0) / dayEntries.length : 0;
      const avgStress = dayEntries.length ? dayEntries.reduce((sum, e) => sum + e.stress, 0) / dayEntries.length : 0;
      return { 
        name, 
        mood: Math.round(avgMood / 2),
        focus: Math.round(avgEnergy / 2),
        anxiety: Math.round(avgStress / 20)
      };
    });
    
    const detailedMetrics = last7Days.map(({ date, name }) => {
      const dayEntries = trackerEntries.filter(e => isSameDay(new Date(e.timestamp), date));
      const avgStressDetail = dayEntries.length ? dayEntries.reduce((sum, e) => sum + e.stress, 0) / dayEntries.length : 0;
      const avgEnergy = dayEntries.length ? dayEntries.reduce((sum, e) => sum + e.energy, 0) / dayEntries.length : 0;
      return { 
        name, 
        stress: Math.round(avgStressDetail / 10),
        energy: Math.round(avgEnergy),
      };
    });
    
    const habitData = last7Days.map(({ date, name }) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const completedCount = (allCompletions || []).filter(c => c.completedDate === dateStr).length;
      return {
        name,
        completed: completedCount,
        total: habits?.length || 0
      };
    });

    const moodCounts = { great: 0, good: 0, okay: 0, low: 0 };
    trackerEntries.forEach(e => {
      if (e.mood >= 8) moodCounts.great++;
      else if (e.mood >= 6) moodCounts.good++;
      else if (e.mood >= 4) moodCounts.okay++;
      else moodCounts.low++;
    });
    const moodDistribution = [
      { name: 'Great', value: moodCounts.great, color: '#10b981' },
      { name: 'Good', value: moodCounts.good, color: '#3b82f6' },
      { name: 'Okay', value: moodCounts.okay, color: '#f59e0b' },
      { name: 'Low', value: moodCounts.low, color: '#ef4444' },
    ].filter(d => d.value > 0);
    
    return { moodData, detailedMetrics, habitData, moodDistribution };
  }, [trackerEntries, habits, allCompletions]);
  
  const avgMood = useMemo(() => {
    if (!trackerEntries || trackerEntries.length === 0) return null;
    const total = trackerEntries.reduce((sum, e) => sum + e.mood, 0);
    return (total / trackerEntries.length / 2).toFixed(1);
  }, [trackerEntries]);
  
  const avgStress = useMemo(() => {
    if (!trackerEntries || trackerEntries.length === 0) return null;
    const total = trackerEntries.reduce((sum, e) => sum + e.stress, 0);
    return Math.round(total / trackerEntries.length / 10);
  }, [trackerEntries]);
  
  const habitRate = useMemo(() => {
    if (!habits || habits.length === 0 || !allCompletions) return null;
    const last7Days = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), i), "yyyy-MM-dd"));
    const totalOpportunities = habits.length * 7;
    const completionsInRange = allCompletions.filter(c => last7Days.includes(c.completedDate)).length;
    return totalOpportunities > 0 ? Math.round((completionsInRange / totalOpportunities) * 100) : 0;
  }, [habits, allCompletions]);

  const routineAdherence = useMemo(() => {
    if (!routineActivities || routineActivities.length === 0) return null;
    const completedToday = todayRoutineLogs?.length || 0;
    const totalActivities = routineActivities.length;
    return Math.round((completedToday / totalActivities) * 100);
  }, [routineActivities, todayRoutineLogs]);

  const blockProgress = useMemo(() => {
    if (!routineBlocks || !routineActivities) return [];
    const completedIds = new Set((todayRoutineLogs || []).map(l => l.activityId));
    return routineBlocks
      .sort((a, b) => a.order - b.order)
      .map(block => {
        const blockActivities = routineActivities
          .filter(a => a.blockId === block.id)
          .sort((a, b) => a.order - b.order);
        const completed = blockActivities.filter(a => completedIds.has(a.id)).length;
        const total = blockActivities.length;
        return {
          name: block.emoji,
          fullName: block.name,
          completed,
          total,
          percent: total > 0 ? Math.round((completed / total) * 100) : 0,
          color: block.color,
        };
      })
      .filter(block => block.total > 0);
  }, [routineBlocks, routineActivities, todayRoutineLogs]);

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500 pb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/40 pb-6">
          <div className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight">System Analytics</h1>
            <p className="text-muted-foreground text-lg">Comprehensive telemetry for your life OS.</p>
          </div>
          
          <div className="flex bg-muted/50 p-1 rounded-lg border border-border/50 self-start md:self-end">
            {["daily", "weekly", "monthly"].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-all capitalize",
                  timeRange === range
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Top Level KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           <Card className="bg-indigo-500/5 border-indigo-500/20 md:col-span-2">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                 <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                            <BrainCircuit className="w-3.5 h-3.5" /> Mental Stability
                        </span>
                        <div className="text-3xl font-mono font-bold flex items-baseline gap-2">
                            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : avgStress !== null ? `${100 - avgStress * 10}%` : "—"} 
                            <span className="text-sm font-normal text-muted-foreground">Baseline</span>
                        </div>
                    </div>
                    <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-200">
                      {hasData ? (avgStress !== null && avgStress < 3 ? "Optimal" : avgStress !== null && avgStress < 6 ? "Moderate" : "Elevated") : "Awaiting Data"}
                    </Badge>
                 </div>
                 <div className="space-y-1 mt-4">
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Stress</span>
                        <span>{avgStress !== null ? `${avgStress}/10` : "—"}</span>
                    </div>
                    <Progress value={avgStress ? avgStress * 10 : 0} className="h-1.5 bg-indigo-500/10" indicatorClassName="bg-indigo-500" />
                 </div>
              </CardContent>
           </Card>

           <Card className="bg-emerald-500/5 border-emerald-500/20">
              <CardContent className="p-4 flex flex-col gap-2">
                 <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Habit Rate
                 </span>
                 <div className="text-2xl font-mono font-bold">
                   {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : habitRate !== null ? `${habitRate}%` : "—"}
                 </div>
                 <Progress value={habitRate || 0} className="h-1 bg-emerald-500/20" indicatorClassName="bg-emerald-500" />
              </CardContent>
           </Card>

           <Card className="bg-rose-500/5 border-rose-500/20">
              <CardContent className="p-4 flex flex-col gap-2">
                 <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5" /> Avg Mood
                 </span>
                 <div className="text-2xl font-mono font-bold flex items-center gap-2">
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : avgMood ?? "—"} 
                    <span className="text-sm font-normal text-muted-foreground">/ 5.0</span>
                 </div>
                 <div className="flex gap-1">
                    {[1,2,3,4,5].map(n => (
                       <div key={n} className={`h-1.5 flex-1 rounded-full ${avgMood && n <= Math.round(Number(avgMood)) ? 'bg-rose-500' : 'bg-rose-500/20'}`} />
                    ))}
                 </div>
              </CardContent>
           </Card>
        </div>

        {/* Today's Routine Progress */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Today's Routine
            </CardTitle>
            <CardDescription>
              {routineAdherence !== null ? `${routineAdherence}% complete` : "No routine data"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {blockProgress.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-6 gap-2">
                  {blockProgress.map((block, i) => (
                    <div key={i} className="text-center">
                      <div 
                        className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center text-xl mb-2"
                        style={{ backgroundColor: `${block.color}20` }}
                      >
                        {block.name}
                      </div>
                      <div className="text-xs font-medium truncate">{block.fullName}</div>
                      <div className="text-xs text-muted-foreground">{block.completed}/{block.total}</div>
                      <Progress 
                        value={block.percent} 
                        className="h-1 mt-1"
                        style={{ backgroundColor: `${block.color}20` }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <span className="text-sm text-muted-foreground">Overall Progress</span>
                  <div className="flex items-center gap-2">
                    <Progress value={routineAdherence || 0} className="w-32 h-2" />
                    <span className="text-sm font-medium">{routineAdherence}%</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No routine activities logged yet today</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mental & Mood Section (Primary Focus) */}
        <div className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2 border-b border-border/40 pb-2">
                <BrainCircuit className="w-5 h-5 text-indigo-500" />
                Mental State & Metrics
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-border/50 shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        Mental Telemetry
                    </CardTitle>
                    <CardDescription>Mood stability vs. Anxiety & Focus levels</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[350px] w-full">
                        {!hasData ? (
                          <div className="h-full flex items-center justify-center text-muted-foreground">
                            <div className="text-center">
                              <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p>Log entries to see mental telemetry</p>
                            </div>
                          </div>
                        ) : (
                        <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData.moodData}>
                            <defs>
                                <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorFocus" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                            <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: 'hsl(var(--background))' }}
                            />
                            <Area type="monotone" dataKey="mood" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorMood)" strokeWidth={2} name="Mood" />
                            <Area type="monotone" dataKey="focus" stroke="#10b981" fillOpacity={1} fill="url(#colorFocus)" strokeWidth={2} name="Focus" />
                            <Line type="monotone" dataKey="anxiety" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Anxiety" />
                        </AreaChart>
                        </ResponsiveContainer>
                        )}
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-6">
                <Card className="border-border/50 shadow-sm flex-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            Mood Distribution
                        </CardTitle>
                        <CardDescription>Weekly emotional summary</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center items-center">
                        <div className="h-[200px] w-full relative">
                            {chartData.moodDistribution.length === 0 ? (
                              <div className="h-full flex items-center justify-center text-muted-foreground">
                                <p className="text-sm">No mood data yet</p>
                              </div>
                            ) : (
                            <>
                            <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData.moodDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={70}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {chartData.moodDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="text-center">
                                    <div className="text-2xl font-bold">{avgMood ?? "—"}</div>
                                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Avg Score</div>
                                </div>
                            </div>
                            </>
                            )}
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="bg-muted/10 border-border/50">
                    <CardContent className="p-4">
                        <h4 className="font-semibold text-sm mb-3">Key Insights</h4>
                        {!hasData ? (
                          <p className="text-sm text-muted-foreground">Log more entries to generate insights.</p>
                        ) : (
                          <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="flex gap-2 items-start">
                                <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                <span>You have logged <strong>{trackerEntries?.length || 0}</strong> entries total.</span>
                            </li>
                            <li className="flex gap-2 items-start">
                                <Smile className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                <span>Your average mood is <strong>{avgMood ?? "—"}/5</strong>.</span>
                            </li>
                          </ul>
                        )}
                    </CardContent>
                </Card>
            </div>
            </div>
        </div>

        {/* Detailed Metrics Breakdown */}
        <div className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2 border-b border-border/40 pb-2">
                <Activity className="w-5 h-5 text-indigo-500" />
                Physical & System Telemetry
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {/* Internal System Chart */}
               <Card className="border-border/50 shadow-sm">
                  <CardHeader>
                     <CardTitle className="flex items-center gap-2 text-base">
                        <CloudFog className="w-4 h-4 text-purple-500" />
                        Internal System State
                     </CardTitle>
                     <CardDescription>Stress & Energy levels</CardDescription>
                  </CardHeader>
                  <CardContent>
                     <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                           <LineChart data={chartData.detailedMetrics}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                              <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                              <Tooltip 
                                 contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: 'hsl(var(--background))' }}
                              />
                              <Line type="monotone" dataKey="stress" stroke="#9333ea" strokeWidth={2} dot={{r:3}} name="Stress" />
                              <Line type="monotone" dataKey="energy" stroke="#6366f1" strokeWidth={2} dot={{r:3}} name="Energy" />
                           </LineChart>
                        </ResponsiveContainer>
                     </div>
                  </CardContent>
               </Card>

               {/* Body Vitals Chart */}
               <Card className="border-border/50 shadow-sm">
                  <CardHeader>
                     <CardTitle className="flex items-center gap-2 text-base">
                        <Battery className="w-4 h-4 text-emerald-500" />
                        Body Vitals
                     </CardTitle>
                     <CardDescription>Energy, Sleep & Pain Correlation</CardDescription>
                  </CardHeader>
                  <CardContent>
                     <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={chartData.detailedMetrics}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                              <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                              <Tooltip 
                                 cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                                 contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: 'hsl(var(--background))' }}
                              />
                              <Bar dataKey="energy" fill="#10b981" radius={[4, 4, 0, 0]} name="Energy" barSize={12} />
                              <Bar dataKey="sleep" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Sleep Quality" barSize={12} />
                              <Line type="monotone" dataKey="pain" stroke="#f59e0b" strokeWidth={2} dot={{r:3}} name="Pain Level" />
                           </BarChart>
                        </ResponsiveContainer>
                     </div>
                  </CardContent>
               </Card>
            </div>
        </div>

        {/* Habit Tracking (Secondary Focus) */}
        <div className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2 border-b border-border/40 pb-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Habit Tracking
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="col-span-2 border-border/50 shadow-sm">
                    <CardHeader>
                        <CardTitle>Habit Consistency</CardTitle>
                        <CardDescription>Daily completion vs Total habits</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData.habitData} barGap={0} barSize={32}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                                <Tooltip 
                                    cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: 'hsl(var(--background))' }}
                                />
                                <Bar dataKey="completed" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Completed" />
                                <Bar dataKey="total" fill="hsl(var(--muted)/0.3)" radius={[4, 4, 0, 0]} name="Total Target" />
                            </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
                
                 {/* Mini Stats for Habits */}
                 <div className="space-y-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="text-sm font-medium text-muted-foreground mb-1">Longest Streak</div>
                            <div className="text-2xl font-bold flex items-center gap-2">
                                12 Days <TrendingUp className="w-4 h-4 text-emerald-500" />
                            </div>
                            <div className="text-xs text-emerald-600 mt-1">Personal Best!</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="text-sm font-medium text-muted-foreground mb-1">Completion Rate</div>
                            <div className="text-2xl font-bold">{habitRate !== null ? `${habitRate}%` : "—"}</div>
                            <Progress value={habitRate || 0} className="h-1 mt-2" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="text-sm font-medium text-muted-foreground mb-1">Total Habits</div>
                            <div className="text-2xl font-bold">{habits?.length || 0} Active</div>
                        </CardContent>
                    </Card>
                 </div>
            </div>
        </div>

        {/* Data Summary (Tertiary) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 opacity-80 hover:opacity-100 transition-opacity">
           <Card className="border-border/50 shadow-sm">
              <CardHeader>
                 <CardTitle className="flex items-center gap-2 text-base">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    Entry Summary
                 </CardTitle>
                 <CardDescription>Total logged entries breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                 <div className="h-[200px] w-full relative">
                    {chartData.moodDistribution.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        <p className="text-sm">No entries logged yet</p>
                      </div>
                    ) : (
                    <>
                    <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                          <Pie
                             data={chartData.moodDistribution}
                             cx="50%"
                             cy="50%"
                             innerRadius={60}
                             outerRadius={80}
                             paddingAngle={5}
                             dataKey="value"
                          >
                             {chartData.moodDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                             ))}
                          </Pie>
                          <Tooltip 
                             contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: 'hsl(var(--background))' }}
                          />
                          <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                       </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none -ml-24">
                        <div className="text-center">
                            <div className="text-2xl font-bold">{trackerEntries?.length || 0}</div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wide">Entries</div>
                        </div>
                    </div>
                    </>
                    )}
                 </div>
              </CardContent>
           </Card>
        </div>

      </div>
    </Layout>
  );
}
