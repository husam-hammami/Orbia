import { Layout } from "@/components/layout";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { 
  Smile, 
  Frown, 
  Meh, 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Activity, 
  CheckCircle2, 
  Clock, 
  Loader2, 
  Flame,
  Target,
  AlertTriangle,
  BookOpen,
  Utensils,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Calendar,
  Sun,
  Moon,
  Sunset
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useState, useMemo } from "react";
import { useDashboardInsights } from "@/lib/api-hooks";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from "recharts";

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1] as const
    }
  })
};

function getMoodEmoji(mood: number) {
  if (mood <= 3) return "😔";
  if (mood <= 5) return "😐";
  if (mood <= 7) return "🙂";
  return "😊";
}

function getMoodIcon(mood: number) {
  if (mood <= 3) return <Frown className="w-5 h-5 text-destructive" />;
  if (mood <= 5) return <Meh className="w-5 h-5 text-[hsl(var(--warning))]" />;
  if (mood <= 7) return <Smile className="w-5 h-5 text-[hsl(var(--success))]" />;
  return <Zap className="w-5 h-5 text-primary" />;
}

function getMoodLabel(mood: number) {
  if (mood <= 2) return "Struggling";
  if (mood <= 4) return "Low";
  if (mood <= 6) return "Okay";
  if (mood <= 8) return "Good";
  return "Great";
}

function getTimeIcon(time: string | null) {
  if (!time) return <Clock className="w-4 h-4" />;
  if (time === "morning") return <Sun className="w-4 h-4 text-[hsl(var(--warning))]" />;
  if (time === "afternoon") return <Sunset className="w-4 h-4 text-[hsl(var(--chart-3))]" />;
  if (time === "evening" || time === "night") return <Moon className="w-4 h-4 text-[hsl(var(--chart-4))]" />;
  return <Clock className="w-4 h-4" />;
}

function getTrendIcon(direction: string) {
  if (direction === "improving") return <TrendingUp className="w-4 h-4 text-[hsl(var(--success))]" />;
  if (direction === "declining") return <TrendingDown className="w-4 h-4 text-destructive" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}

function getTrendBadge(direction: string) {
  if (direction === "improving") {
    return (
      <Badge className="bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.3)] gap-1">
        <ArrowUpRight className="w-3 h-3" />
        Improving
      </Badge>
    );
  }
  if (direction === "declining") {
    return (
      <Badge className="bg-destructive/15 text-destructive border-destructive/30 gap-1">
        <ArrowDownRight className="w-3 h-3" />
        Declining
      </Badge>
    );
  }
  return (
    <Badge className="bg-muted text-muted-foreground border-border gap-1">
      <Minus className="w-3 h-3" />
      Stable
    </Badge>
  );
}

function getPriorityBadge(priority: string) {
  if (priority === "high") {
    return <Badge className="bg-destructive/15 text-destructive border-destructive/30">High Priority</Badge>;
  }
  if (priority === "medium") {
    return <Badge className="bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.3)]">Medium</Badge>;
  }
  return <Badge className="bg-muted text-muted-foreground border-border">Low</Badge>;
}

function getCategoryIcon(category: string) {
  switch (category) {
    case "mood": return <Activity className="w-5 h-5 text-[hsl(var(--chart-2))]" />;
    case "habits": return <CheckCircle2 className="w-5 h-5 text-primary" />;
    case "routine": return <Clock className="w-5 h-5 text-[hsl(var(--info))]" />;
    case "journal": return <BookOpen className="w-5 h-5 text-[hsl(var(--chart-2))]" />;
    case "food": return <Utensils className="w-5 h-5 text-[hsl(var(--chart-3))]" />;
    default: return <Lightbulb className="w-5 h-5 text-[hsl(var(--warning))]" />;
  }
}

const PRIORITY_COLORS = {
  high: "hsl(var(--destructive))",
  medium: "hsl(var(--warning))", 
  low: "hsl(var(--success))"
};

export default function Dashboard() {
  const { data: insights, isLoading, error } = useDashboardInsights();

  const wellnessScore = useMemo(() => {
    if (!insights) return 0;
    const moodScore = (insights.mood.averages.mood / 10) * 40;
    const habitScore = (insights.habits.completionRate7Day / 100) * 30;
    const routineScore = (insights.routine.dailyCompletionRate / 100) * 30;
    return Math.round(moodScore + habitScore + routineScore);
  }, [insights]);

  const moodChartData = useMemo(() => {
    if (!insights?.mood.trend7Day.dataPoints) return [];
    return insights.mood.trend7Day.dataPoints.map(dp => ({
      date: format(new Date(dp.date), "EEE"),
      mood: dp.mood
    }));
  }, [insights]);

  const priorityPieData = useMemo(() => {
    if (!insights) return [];
    const { high, medium, low } = insights.todos.priorityDistribution;
    return [
      { name: "High", value: high, color: PRIORITY_COLORS.high },
      { name: "Medium", value: medium, color: PRIORITY_COLORS.medium },
      { name: "Low", value: low, color: PRIORITY_COLORS.low }
    ].filter(d => d.value > 0);
  }, [insights]);

  const longestStreak = useMemo(() => {
    if (!insights?.habits.currentStreaks?.length) return 0;
    return Math.max(...insights.habits.currentStreaks.map(s => s.streak));
  }, [insights]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading your insights...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !insights) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-[hsl(var(--warning))] mx-auto" />
            <h2 className="text-xl font-semibold">Unable to load insights</h2>
            <p className="text-muted-foreground">Please try again later</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <p className="text-muted-foreground font-medium" data-testid="text-current-date">
                {format(new Date(), "EEEE, MMMM do, yyyy")}
              </p>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground" data-testid="text-greeting">
              {getGreeting()}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-muted-foreground">Your wellness score</p>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${wellnessScore}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-primary"
                  />
                </div>
                <span className="font-mono font-bold text-primary" data-testid="text-wellness-score">{wellnessScore}%</span>
              </div>
            </div>
          </div>
          
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div
            custom={0}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
          >
            <Card className="bg-card/80 backdrop-blur-xl border border-border/60 shadow-lg h-full" data-testid="card-mood-today">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground font-medium">Today's Mood</span>
                  <span className="text-2xl">{getMoodEmoji(insights.mood.averages.mood)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {getMoodIcon(insights.mood.averages.mood)}
                  <span className="text-2xl font-bold" data-testid="text-mood-label">
                    {getMoodLabel(insights.mood.averages.mood)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {insights.mood.averages.mood.toFixed(1)}/10 average
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            custom={1}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
          >
            <Card className="bg-card/80 backdrop-blur-xl border border-border/60 shadow-lg h-full" data-testid="card-habits-today">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground font-medium">Habits Today</span>
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12">
                    <svg className="w-12 h-12 -rotate-90">
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        className="text-slate-200"
                      />
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        stroke="url(#gradient)"
                        strokeWidth="4"
                        fill="none"
                        strokeDasharray={`${insights.habits.completionRate7Day * 1.256} 125.6`}
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="hsl(var(--primary))" />
                          <stop offset="100%" stopColor="hsl(var(--accent))" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  <div>
                    <span className="text-2xl font-bold" data-testid="text-habits-rate">
                      {insights.habits.completionRate7Day}%
                    </span>
                    <p className="text-sm text-muted-foreground">7-day rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            custom={2}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
          >
            <Card className="bg-card/80 backdrop-blur-xl border border-border/60 shadow-lg h-full" data-testid="card-routine-today">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground font-medium">Routine</span>
                  <Clock className="w-5 h-5 text-[hsl(var(--chart-1))]" />
                </div>
                <div className="space-y-2">
                  <span className="text-2xl font-bold" data-testid="text-routine-rate">
                    {insights.routine.dailyCompletionRate}%
                  </span>
                  <Progress value={insights.routine.dailyCompletionRate} className="h-2" />
                  <p className="text-sm text-muted-foreground">completion rate</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            custom={3}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
          >
            <Card className="bg-card/80 backdrop-blur-xl border border-border/60 shadow-lg h-full" data-testid="card-streak">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground font-medium">Best Streak</span>
                  <Flame className="w-5 h-5 text-[hsl(var(--chart-3))]" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold gradient-text" data-testid="text-streak-count">
                    {longestStreak}
                  </span>
                  <span className="text-lg text-muted-foreground">days</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">current streak</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            custom={4}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
          >
            <Card className="bg-card/80 backdrop-blur-xl border border-border/60 shadow-lg" data-testid="card-mood-trends">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-[hsl(var(--chart-4))]" />
                    Mood Trends
                  </CardTitle>
                  {getTrendBadge(insights.mood.trend7Day.direction)}
                </div>
                <CardDescription>7-day mood trajectory</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-40 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={moodChartData}>
                      <defs>
                        <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                      <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ 
                          background: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="mood" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        fill="url(#moodGradient)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">Avg Mood</p>
                    <p className="text-lg font-bold text-foreground" data-testid="text-avg-mood">{insights.mood.averages.mood}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">Avg Energy</p>
                    <p className="text-lg font-bold text-foreground" data-testid="text-avg-energy">{insights.mood.averages.energy}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">Avg Stress</p>
                    <p className="text-lg font-bold text-foreground" data-testid="text-avg-stress">{insights.mood.averages.stress}%</p>
                  </div>
                </div>
                {(insights.mood.bestTimeOfDay || insights.mood.worstTimeOfDay) && (
                  <div className="flex gap-4 mt-4">
                    {insights.mood.bestTimeOfDay && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[hsl(var(--success)/0.1)] border border-[hsl(var(--success)/0.2)]">
                        {getTimeIcon(insights.mood.bestTimeOfDay)}
                        <span className="text-sm text-[hsl(var(--success))]">Best: {insights.mood.bestTimeOfDay}</span>
                      </div>
                    )}
                    {insights.mood.worstTimeOfDay && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20">
                        {getTimeIcon(insights.mood.worstTimeOfDay)}
                        <span className="text-sm text-destructive">Lowest: {insights.mood.worstTimeOfDay}</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            custom={5}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
          >
            <Card className="bg-card/80 backdrop-blur-xl border border-border/60 shadow-lg" data-testid="card-habits-insights">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Habits & Routine Insights
                </CardTitle>
                <CardDescription>Your consistency patterns</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-sm text-primary mb-1">7-Day Rate</p>
                    <p className="text-2xl font-bold text-primary" data-testid="text-habit-7day">{insights.habits.completionRate7Day}%</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 border border-border">
                    <p className="text-sm text-muted-foreground mb-1">30-Day Rate</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-habit-30day">{insights.habits.completionRate30Day}%</p>
                  </div>
                </div>

                {insights.habits.mostConsistent.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Most Consistent</p>
                    <div className="space-y-2">
                      {insights.habits.mostConsistent.slice(0, 3).map((habit, i) => (
                        <div key={habit.habitId} className="flex items-center justify-between p-2 rounded-lg bg-muted/50" data-testid={`habit-consistent-${i}`}>
                          <span className="text-sm font-medium truncate flex-1">{habit.title}</span>
                          <Badge className="bg-primary/15 text-primary border-primary/30">{habit.rate}%</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {insights.habits.moodCorrelation.correlation !== "insufficient_data" && (
                  <div className="p-3 rounded-lg bg-accent/30 border border-accent/50" data-testid="text-mood-correlation">
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-accent-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-accent-foreground">Mood Correlation</p>
                        <p className="text-xs text-accent-foreground/80">
                          {insights.habits.moodCorrelation.correlation === "positive" 
                            ? `You're happier on high-habit days (${insights.habits.moodCorrelation.highCompletionAvgMood} vs ${insights.habits.moodCorrelation.lowCompletionAvgMood})`
                            : insights.habits.moodCorrelation.correlation === "neutral"
                            ? "Habit completion doesn't strongly affect your mood"
                            : "Interesting - lower habit completion correlates with better mood"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {insights.routine.blockEffectiveness.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Routine Block Effectiveness</p>
                    <div className="space-y-2">
                      {insights.routine.blockEffectiveness.slice(0, 3).map((block, i) => (
                        <div key={block.blockId} className="flex items-center gap-3" data-testid={`block-effectiveness-${i}`}>
                          <span className="text-sm truncate flex-1">{block.name}</span>
                          <div className="w-20">
                            <Progress value={block.completionRate} className="h-2" />
                          </div>
                          <span className="text-xs font-mono text-muted-foreground w-10 text-right">{block.completionRate}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            custom={6}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
          >
            <Card className="bg-card/80 backdrop-blur-xl border border-border/60 shadow-lg" data-testid="card-productivity">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-[hsl(var(--chart-1))]" />
                  Productivity Pulse
                </CardTitle>
                <CardDescription>Task completion overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-4 rounded-lg bg-[hsl(var(--info)/0.1)] border border-[hsl(var(--info)/0.2)] text-center">
                    <p className="text-sm text-[hsl(var(--info))] mb-1">Completion Rate</p>
                    <p className="text-3xl font-bold text-[hsl(var(--info))]" data-testid="text-todo-rate">{insights.todos.completionRate}%</p>
                    <p className="text-xs text-[hsl(var(--info))]">{insights.todos.completedTodos}/{insights.todos.totalTodos} tasks</p>
                  </div>
                  <div className={cn(
                    "p-4 rounded-lg border text-center",
                    insights.todos.overdueCount > 0 
                      ? "bg-destructive/10 border-destructive/20" 
                      : "bg-[hsl(var(--success)/0.1)] border-[hsl(var(--success)/0.2)]"
                  )}>
                    <p className={cn(
                      "text-sm mb-1",
                      insights.todos.overdueCount > 0 ? "text-destructive" : "text-[hsl(var(--success))]"
                    )}>Overdue</p>
                    <p className={cn(
                      "text-3xl font-bold",
                      insights.todos.overdueCount > 0 ? "text-destructive" : "text-[hsl(var(--success))]"
                    )} data-testid="text-overdue-count">{insights.todos.overdueCount}</p>
                    <p className={cn(
                      "text-xs",
                      insights.todos.overdueCount > 0 ? "text-destructive" : "text-[hsl(var(--success))]"
                    )}>{insights.todos.overdueCount > 0 ? "needs attention" : "all caught up!"}</p>
                  </div>
                </div>

                {priorityPieData.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Priority Distribution</p>
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-24">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={priorityPieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={25}
                              outerRadius={40}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {priorityPieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex-1 space-y-2">
                        {priorityPieData.map((item) => (
                          <div key={item.name} className="flex items-center justify-between" data-testid={`priority-${item.name.toLowerCase()}`}>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                              <span className="text-sm">{item.name}</span>
                            </div>
                            <span className="text-sm font-mono font-medium">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            custom={7}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
          >
            <Card className="bg-card/80 backdrop-blur-xl border border-border/60 shadow-lg" data-testid="card-journal-wellness">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[hsl(var(--chart-4))]" />
                  Journal & Wellness
                </CardTitle>
                <CardDescription>Reflection and self-care tracking</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-[hsl(var(--chart-4)/0.1)] border border-[hsl(var(--chart-4)/0.2)] text-center">
                    <p className="text-sm text-[hsl(var(--chart-4))] mb-1">Entries (7 days)</p>
                    <p className="text-2xl font-bold text-[hsl(var(--chart-4))]" data-testid="text-journal-frequency">{insights.journal.entryFrequency7Day}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[hsl(var(--chart-3)/0.1)] border border-[hsl(var(--chart-3)/0.2)] text-center">
                    <p className="text-sm text-[hsl(var(--chart-3))] mb-1">Food Logging</p>
                    <p className="text-2xl font-bold text-[hsl(var(--chart-3))]" data-testid="text-food-consistency">{insights.food.mealLoggingConsistency}%</p>
                  </div>
                </div>

                {insights.journal.topDrivers && insights.journal.topDrivers.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Top Drivers</p>
                    <div className="flex flex-wrap gap-2">
                      {insights.journal.topDrivers.slice(0, 4).map((driver: any) => (
                        <Badge key={driver.driver} variant="outline" className="bg-white" data-testid={`journal-driver-${driver.driver}`}>
                          {driver.driver} ({driver.count})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Daily Feeling Distribution</p>
                  <div className="flex gap-2">
                    <div className="flex-1 p-2 rounded-lg bg-[hsl(var(--success)/0.1)] border border-[hsl(var(--success)/0.2)] text-center" data-testid="feeling-lighter">
                      <p className="text-xs text-[hsl(var(--success))]">Lighter</p>
                      <p className="text-lg font-bold text-[hsl(var(--success))]">{insights.food.feelingDistribution.lighter}</p>
                    </div>
                    <div className="flex-1 p-2 rounded-lg bg-muted/50 border border-border text-center" data-testid="feeling-average">
                      <p className="text-xs text-muted-foreground">Average</p>
                      <p className="text-lg font-bold text-foreground">{insights.food.feelingDistribution.average}</p>
                    </div>
                    <div className="flex-1 p-2 rounded-lg bg-[hsl(var(--warning)/0.1)] border border-[hsl(var(--warning)/0.2)] text-center" data-testid="feeling-heavier">
                      <p className="text-xs text-[hsl(var(--warning))]">Heavier</p>
                      <p className="text-lg font-bold text-[hsl(var(--warning))]">{insights.food.feelingDistribution.heavier}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {insights.recommendations.length > 0 && (
          <motion.div
            custom={8}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
          >
            <Card className="bg-gradient-to-br from-card/90 to-primary/5 backdrop-blur-xl border border-primary/20 shadow-lg" data-testid="card-recommendations">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-[hsl(var(--warning))]" />
                  Personalized Recommendations
                </CardTitle>
                <CardDescription>Actionable insights based on your data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {insights.recommendations.slice(0, 3).map((rec, i) => (
                    <motion.div
                      key={rec.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.8 + i * 0.1 }}
                      className="p-4 rounded-xl bg-card/80 border border-border/60 shadow-sm hover:shadow-md transition-shadow"
                      data-testid={`recommendation-${i}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                          {getCategoryIcon(rec.category)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-sm truncate">{rec.title}</h4>
                            {getPriorityBadge(rec.priority)}
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{rec.description}</p>
                          <p className="text-xs font-medium text-primary">{rec.actionable}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
