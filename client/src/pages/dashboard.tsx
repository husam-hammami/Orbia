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
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Calendar,
  Sun,
  Moon,
  Sunset,
  DollarSign,
  Briefcase,
  Shield,
  Brain,
  Heart,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useMemo } from "react";
import { useDashboardInsights } from "@/lib/api-hooks";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
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

function getDomainIcon(domain: string) {
  switch (domain) {
    case "wellness": return <Heart className="w-4 h-4 text-[hsl(var(--chart-2))]" />;
    case "work": case "career": return <Briefcase className="w-4 h-4 text-[hsl(var(--chart-1))]" />;
    case "medical": return <Shield className="w-4 h-4 text-[hsl(var(--chart-3))]" />;
    case "finance": return <DollarSign className="w-4 h-4 text-[hsl(var(--success))]" />;
    case "identity": return <Brain className="w-4 h-4 text-[hsl(var(--chart-4))]" />;
    default: return <Sparkles className="w-4 h-4 text-primary" />;
  }
}

function getCategoryIcon(category: string) {
  switch (category) {
    case "mood": return <Activity className="w-5 h-5 text-[hsl(var(--chart-2))]" />;
    case "habits": return <CheckCircle2 className="w-5 h-5 text-primary" />;
    case "routine": return <Clock className="w-5 h-5 text-[hsl(var(--info))]" />;
    case "journal": return <BookOpen className="w-5 h-5 text-[hsl(var(--chart-2))]" />;
    default: return <Lightbulb className="w-5 h-5 text-[hsl(var(--warning))]" />;
  }
}

function getPriorityBadge(priority: string) {
  if (priority === "high") {
    return <Badge className="bg-destructive/15 text-destructive border-destructive/30">High</Badge>;
  }
  if (priority === "medium") {
    return <Badge className="bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.3)]">Med</Badge>;
  }
  return <Badge className="bg-muted text-muted-foreground border-border">Low</Badge>;
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

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

  const longestStreak = useMemo(() => {
    if (!insights?.habits.currentStreaks?.length) return 0;
    return Math.max(...insights.habits.currentStreaks.map(s => s.streak));
  }, [insights]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = insights?.displayName;
    const base = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    return name ? `${base}, ${name}` : base;
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

  const cs = insights.currentState;
  const finance = insights.finance;
  const career = insights.career;
  const narratives = insights.narratives || [];

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Header with greeting and current state */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
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
                <p className="text-muted-foreground">Wellness score</p>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-border rounded-full overflow-hidden">
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
          </div>

          {/* Current state banner — only show when we have something meaningful */}
          {cs && cs.driver !== "Unknown" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={cn(
                "flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border",
                cs.riskFlag
                  ? "bg-destructive/10 border-destructive/30"
                  : cs.stability >= 70
                  ? "bg-[hsl(var(--success)/0.08)] border-[hsl(var(--success)/0.2)]"
                  : "bg-muted/50 border-border"
              )}
              data-testid="banner-current-state"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {cs.riskFlag ? (
                  <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
                ) : (
                  <Brain className="w-5 h-5 text-primary shrink-0" />
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">
                    Main driver: <span className="text-primary">{cs.driver}</span>
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-sm text-muted-foreground">
                    Stability {cs.stability}%
                  </span>
                  {cs.riskFlag && (
                    <>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-sm text-destructive font-medium">{cs.riskFlag}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                <span className="text-[hsl(var(--success))]">Try: {cs.suggestion.do}</span>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div custom={0} initial="hidden" animate="visible" variants={cardVariants}>
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
                  {insights.mood.averages.mood.toFixed(1)}/10 avg
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div custom={1} initial="hidden" animate="visible" variants={cardVariants}>
            <Card className="bg-card/80 backdrop-blur-xl border border-border/60 shadow-lg h-full" data-testid="card-habits-today">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground font-medium">Habits</span>
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12">
                    <svg className="w-12 h-12 -rotate-90">
                      <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="none" className="text-border" />
                      <circle cx="24" cy="24" r="20" stroke="url(#gradient)" strokeWidth="4" fill="none"
                        strokeDasharray={`${insights.habits.completionRate7Day * 1.256} 125.6`} strokeLinecap="round" />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="hsl(var(--primary))" />
                          <stop offset="100%" stopColor="hsl(var(--accent))" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  <div>
                    <span className="text-2xl font-bold" data-testid="text-habits-rate">{insights.habits.completionRate7Day}%</span>
                    <p className="text-sm text-muted-foreground">7-day rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div custom={2} initial="hidden" animate="visible" variants={cardVariants}>
            <Card className="bg-card/80 backdrop-blur-xl border border-border/60 shadow-lg h-full" data-testid="card-routine-today">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground font-medium">Routine</span>
                  <Clock className="w-5 h-5 text-[hsl(var(--chart-1))]" />
                </div>
                <div className="space-y-2">
                  <span className="text-2xl font-bold" data-testid="text-routine-rate">{insights.routine.dailyCompletionRate}%</span>
                  <Progress value={insights.routine.dailyCompletionRate} className="h-2" />
                  <p className="text-sm text-muted-foreground">completion rate</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div custom={3} initial="hidden" animate="visible" variants={cardVariants}>
            <Card className="bg-card/80 backdrop-blur-xl border border-border/60 shadow-lg h-full" data-testid="card-streak">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground font-medium">Best Streak</span>
                  <Flame className="w-5 h-5 text-[hsl(var(--chart-3))]" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold gradient-text" data-testid="text-streak-count">{longestStreak}</span>
                  <span className="text-lg text-muted-foreground">days</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">current streak</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Mood Trends */}
          <motion.div custom={4} initial="hidden" animate="visible" variants={cardVariants}>
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
                  {moodChartData.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                      <div className="text-center">
                        <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p>Start tracking to see trends</p>
                      </div>
                    </div>
                  ) : (
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
                        <Area type="monotone" dataKey="mood" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#moodGradient)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-2.5 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-0.5">Mood</p>
                    <p className="text-lg font-bold" data-testid="text-avg-mood">{insights.mood.averages.mood}</p>
                  </div>
                  <div className="text-center p-2.5 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-0.5">Energy</p>
                    <p className="text-lg font-bold" data-testid="text-avg-energy">{insights.mood.averages.energy}</p>
                  </div>
                  <div className="text-center p-2.5 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-0.5">Stress</p>
                    <p className="text-lg font-bold" data-testid="text-avg-stress">{insights.mood.averages.stress}%</p>
                  </div>
                </div>
                {(insights.mood.bestTimeOfDay || insights.mood.worstTimeOfDay) && (
                  <div className="flex gap-3 mt-3">
                    {insights.mood.bestTimeOfDay && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[hsl(var(--success)/0.1)] border border-[hsl(var(--success)/0.2)]">
                        {getTimeIcon(insights.mood.bestTimeOfDay)}
                        <span className="text-xs text-[hsl(var(--success))]">Best: {insights.mood.bestTimeOfDay}</span>
                      </div>
                    )}
                    {insights.mood.worstTimeOfDay && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20">
                        {getTimeIcon(insights.mood.worstTimeOfDay)}
                        <span className="text-xs text-destructive">Lowest: {insights.mood.worstTimeOfDay}</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Finance Snapshot */}
          <motion.div custom={5} initial="hidden" animate="visible" variants={cardVariants}>
            {finance && (finance.monthlyIncome > 0 || finance.monthlyExpenses > 0 || finance.totalDebt > 0) ? (
              <Card className="bg-card/80 backdrop-blur-xl border border-border/60 shadow-lg" data-testid="card-finance">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-[hsl(var(--success))]" />
                    Finance Snapshot
                  </CardTitle>
                  <CardDescription>This month's overview</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-2.5 rounded-lg bg-[hsl(var(--success)/0.1)] border border-[hsl(var(--success)/0.2)] text-center">
                      <p className="text-xs text-[hsl(var(--success))] mb-0.5">Income</p>
                      <p className="text-lg font-bold text-[hsl(var(--success))]">{formatCurrency(finance.monthlyIncome, finance.currency)}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-center">
                      <p className="text-xs text-destructive mb-0.5">Expenses</p>
                      <p className="text-lg font-bold text-destructive">{formatCurrency(finance.monthlyExpenses, finance.currency)}</p>
                    </div>
                    <div className={cn(
                      "p-2.5 rounded-lg border text-center",
                      finance.netFlow >= 0
                        ? "bg-[hsl(var(--success)/0.1)] border-[hsl(var(--success)/0.2)]"
                        : "bg-destructive/10 border-destructive/20"
                    )}>
                      <p className="text-xs text-muted-foreground mb-0.5">Net</p>
                      <p className={cn("text-lg font-bold", finance.netFlow >= 0 ? "text-[hsl(var(--success))]" : "text-destructive")}>
                        {finance.netFlow >= 0 ? "+" : ""}{formatCurrency(finance.netFlow, finance.currency)}
                      </p>
                    </div>
                  </div>

                  {finance.monthlyBudget > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-muted-foreground">Budget used</span>
                        <span className={cn(
                          "text-xs font-mono font-medium",
                          finance.budgetUsed > 90 ? "text-destructive" : finance.budgetUsed > 70 ? "text-[hsl(var(--warning))]" : "text-muted-foreground"
                        )}>{finance.budgetUsed}%</span>
                      </div>
                      <Progress
                        value={Math.min(finance.budgetUsed, 100)}
                        className={cn("h-2", finance.budgetUsed > 90 && "[&>div]:bg-destructive")}
                      />
                    </div>
                  )}

                  {finance.topCategories.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Top Spending</p>
                      <div className="space-y-1.5">
                        {finance.topCategories.slice(0, 3).map((cat) => (
                          <div key={cat.category} className="flex items-center justify-between">
                            <span className="text-sm truncate flex-1">{cat.category}</span>
                            <span className="text-sm font-mono text-muted-foreground">{formatCurrency(cat.amount, finance.currency)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {finance.totalDebt > 0 && (
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-[hsl(var(--warning)/0.1)] border border-[hsl(var(--warning)/0.2)]">
                      <span className="text-xs text-[hsl(var(--warning))]">Total Active Debt</span>
                      <span className="text-sm font-bold text-[hsl(var(--warning))]">{formatCurrency(finance.totalDebt, finance.currency)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card/80 backdrop-blur-xl border border-border/60 shadow-lg" data-testid="card-habits-insights">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    Habits & Routine
                  </CardTitle>
                  <CardDescription>Your consistency patterns</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-xs text-primary mb-0.5">7-Day Rate</p>
                      <p className="text-2xl font-bold text-primary">{insights.habits.completionRate7Day}%</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-muted/50 border border-border">
                      <p className="text-xs text-muted-foreground mb-0.5">30-Day Rate</p>
                      <p className="text-2xl font-bold">{insights.habits.completionRate30Day}%</p>
                    </div>
                  </div>
                  {insights.habits.mostConsistent.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Most Consistent</p>
                      <div className="space-y-1.5">
                        {insights.habits.mostConsistent.slice(0, 3).map((habit) => (
                          <div key={habit.habitId} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                            <span className="text-sm truncate flex-1">{habit.title}</span>
                            <Badge className="bg-primary/15 text-primary border-primary/30">{habit.rate}%</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </motion.div>

          {/* Career & Projects */}
          {career && (career.activeProjects > 0 || career.openTasks > 0) && (
            <motion.div custom={6} initial="hidden" animate="visible" variants={cardVariants}>
              <Card className="bg-card/80 backdrop-blur-xl border border-border/60 shadow-lg" data-testid="card-career">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-[hsl(var(--chart-1))]" />
                    Career & Projects
                  </CardTitle>
                  <CardDescription>{career.activeProjects} active project{career.activeProjects !== 1 ? "s" : ""} · {career.openTasks} open task{career.openTasks !== 1 ? "s" : ""}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {career.projectsSummary.length > 0 && (
                    <div className="space-y-3">
                      {career.projectsSummary.map((p) => (
                        <div key={p.title} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium truncate flex-1">{p.title}</span>
                            <Badge variant="outline" className="capitalize text-xs">{p.status}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress value={p.progress} className="h-1.5 flex-1" />
                            <span className="text-xs font-mono text-muted-foreground w-8 text-right">{p.progress}%</span>
                          </div>
                          {p.deadline && (
                            <p className="text-xs text-muted-foreground">Due {p.deadline}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {career.upcomingDeadlines.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Upcoming Deadlines</p>
                      <div className="space-y-1.5">
                        {career.upcomingDeadlines.map((d) => (
                          <div key={d.title} className="flex items-center gap-2">
                            <ChevronRight className="w-3 h-3 text-[hsl(var(--warning))]" />
                            <span className="text-sm truncate flex-1">{d.title}</span>
                            <span className="text-xs text-muted-foreground">{d.due}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{career.completedTasks} completed</span>
                    <span>·</span>
                    <span>{career.openTasks} remaining</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Productivity Pulse */}
          <motion.div custom={7} initial="hidden" animate="visible" variants={cardVariants}>
            <Card className="bg-card/80 backdrop-blur-xl border border-border/60 shadow-lg" data-testid="card-productivity">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-[hsl(var(--chart-1))]" />
                  Productivity
                </CardTitle>
                <CardDescription>{insights.todos.completedTodos}/{insights.todos.totalTodos} tasks completed</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 rounded-lg bg-[hsl(var(--info)/0.1)] border border-[hsl(var(--info)/0.2)] text-center">
                    <p className="text-xs text-[hsl(var(--info))] mb-0.5">Completion</p>
                    <p className="text-3xl font-bold text-[hsl(var(--info))]" data-testid="text-todo-rate">{insights.todos.completionRate}%</p>
                  </div>
                  <div className={cn(
                    "p-3 rounded-lg border text-center",
                    insights.todos.overdueCount > 0
                      ? "bg-destructive/10 border-destructive/20"
                      : "bg-[hsl(var(--success)/0.1)] border-[hsl(var(--success)/0.2)]"
                  )}>
                    <p className={cn("text-xs mb-0.5", insights.todos.overdueCount > 0 ? "text-destructive" : "text-[hsl(var(--success))]")}>Overdue</p>
                    <p className={cn("text-3xl font-bold", insights.todos.overdueCount > 0 ? "text-destructive" : "text-[hsl(var(--success))]")} data-testid="text-overdue-count">
                      {insights.todos.overdueCount}
                    </p>
                    <p className={cn("text-xs", insights.todos.overdueCount > 0 ? "text-destructive" : "text-[hsl(var(--success))]")}>
                      {insights.todos.overdueCount > 0 ? "needs attention" : "all caught up!"}
                    </p>
                  </div>
                </div>

                {insights.habits.moodCorrelation.correlation !== "insufficient_data" && (
                  <div className="p-2.5 rounded-lg bg-accent/30 border border-accent/50" data-testid="text-mood-correlation">
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-accent-foreground mt-0.5 shrink-0" />
                      <p className="text-xs text-accent-foreground/80">
                        {insights.habits.moodCorrelation.correlation === "positive"
                          ? `Habits boost your mood: ${insights.habits.moodCorrelation.highCompletionAvgMood} avg on high-habit days vs ${insights.habits.moodCorrelation.lowCompletionAvgMood}`
                          : insights.habits.moodCorrelation.correlation === "neutral"
                          ? "Habit completion doesn't strongly affect your mood"
                          : "Lower habit completion correlates with better mood — interesting"}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Journal & Wellness */}
          <motion.div custom={8} initial="hidden" animate="visible" variants={cardVariants}>
            <Card className="bg-card/80 backdrop-blur-xl border border-border/60 shadow-lg" data-testid="card-journal-wellness">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[hsl(var(--chart-4))]" />
                  Journal & Wellness
                </CardTitle>
                <CardDescription>Reflection and self-care</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2.5 rounded-lg bg-[hsl(var(--chart-4)/0.1)] border border-[hsl(var(--chart-4)/0.2)] text-center">
                    <p className="text-xs text-[hsl(var(--chart-4))] mb-0.5">Entries (7d)</p>
                    <p className="text-2xl font-bold text-[hsl(var(--chart-4))]" data-testid="text-journal-frequency">{insights.journal.entryFrequency7Day}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[hsl(var(--chart-3)/0.1)] border border-[hsl(var(--chart-3)/0.2)] text-center">
                    <p className="text-xs text-[hsl(var(--chart-3))] mb-0.5">Food Logging</p>
                    <p className="text-2xl font-bold text-[hsl(var(--chart-3))]" data-testid="text-food-consistency">{insights.food.mealLoggingConsistency}%</p>
                  </div>
                </div>

                {insights.journal.topDrivers && insights.journal.topDrivers.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Top Drivers</p>
                    <div className="flex flex-wrap gap-1.5">
                      {insights.journal.topDrivers.slice(0, 4).map((driver: any) => (
                        <Badge key={driver.driver} variant="outline" className="text-xs" data-testid={`journal-driver-${driver.driver}`}>
                          {driver.driver} ({driver.count})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Daily Feeling</p>
                  <div className="flex gap-2">
                    <div className="flex-1 p-1.5 rounded-lg bg-[hsl(var(--success)/0.1)] border border-[hsl(var(--success)/0.2)] text-center" data-testid="feeling-lighter">
                      <p className="text-xs text-[hsl(var(--success))]">Lighter</p>
                      <p className="text-lg font-bold text-[hsl(var(--success))]">{insights.food.feelingDistribution.lighter}</p>
                    </div>
                    <div className="flex-1 p-1.5 rounded-lg bg-muted/50 border border-border text-center" data-testid="feeling-average">
                      <p className="text-xs text-muted-foreground">Average</p>
                      <p className="text-lg font-bold">{insights.food.feelingDistribution.average}</p>
                    </div>
                    <div className="flex-1 p-1.5 rounded-lg bg-[hsl(var(--warning)/0.1)] border border-[hsl(var(--warning)/0.2)] text-center" data-testid="feeling-heavier">
                      <p className="text-xs text-[hsl(var(--warning))]">Heavier</p>
                      <p className="text-lg font-bold text-[hsl(var(--warning))]">{insights.food.feelingDistribution.heavier}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Habits & Routine (when finance card is shown above) */}
          {finance && (finance.monthlyIncome > 0 || finance.monthlyExpenses > 0 || finance.totalDebt > 0) && (
            <motion.div custom={9} initial="hidden" animate="visible" variants={cardVariants}>
              <Card className="bg-card/80 backdrop-blur-xl border border-border/60 shadow-lg" data-testid="card-habits-insights">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    Habits & Routine
                  </CardTitle>
                  <CardDescription>Your consistency patterns</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-xs text-primary mb-0.5">7-Day Rate</p>
                      <p className="text-2xl font-bold text-primary" data-testid="text-habit-7day">{insights.habits.completionRate7Day}%</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-muted/50 border border-border">
                      <p className="text-xs text-muted-foreground mb-0.5">30-Day Rate</p>
                      <p className="text-2xl font-bold" data-testid="text-habit-30day">{insights.habits.completionRate30Day}%</p>
                    </div>
                  </div>

                  {insights.habits.mostConsistent.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Most Consistent</p>
                      <div className="space-y-1.5">
                        {insights.habits.mostConsistent.slice(0, 3).map((habit) => (
                          <div key={habit.habitId} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                            <span className="text-sm truncate flex-1">{habit.title}</span>
                            <Badge className="bg-primary/15 text-primary border-primary/30">{habit.rate}%</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {insights.routine.blockEffectiveness.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Routine Blocks</p>
                      <div className="space-y-1.5">
                        {insights.routine.blockEffectiveness.slice(0, 3).map((block) => (
                          <div key={block.blockId} className="flex items-center gap-3">
                            <span className="text-sm truncate flex-1">{block.name}</span>
                            <div className="w-16">
                              <Progress value={block.completionRate} className="h-1.5" />
                            </div>
                            <span className="text-xs font-mono text-muted-foreground w-8 text-right">{block.completionRate}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Orbia Insights (Memory Narratives) */}
        {narratives.length > 0 && (
          <motion.div custom={10} initial="hidden" animate="visible" variants={cardVariants}>
            <Card className="bg-gradient-to-br from-card/90 to-primary/5 backdrop-blur-xl border border-primary/20 shadow-lg" data-testid="card-narratives">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  What Orbia Has Learned
                </CardTitle>
                <CardDescription>Patterns and insights from your data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {narratives.map((n, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + i * 0.1 }}
                      className="flex items-start gap-3 p-3 rounded-xl bg-card/80 border border-border/60"
                    >
                      <div className="p-1.5 rounded-lg bg-muted shrink-0 mt-0.5">
                        {getDomainIcon(n.domain)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground leading-relaxed">{n.narrative}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant="outline" className="text-xs capitalize">{n.domain.replace("_", " ")}</Badge>
                          <span className="text-xs text-muted-foreground">{Math.round(n.confidence * 100)}% confidence</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Recommendations */}
        {insights.recommendations.length > 0 && (
          <motion.div custom={11} initial="hidden" animate="visible" variants={cardVariants}>
            <Card className="bg-card/80 backdrop-blur-xl border border-border/60 shadow-lg" data-testid="card-recommendations">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-[hsl(var(--warning))]" />
                  Recommendations
                </CardTitle>
                <CardDescription>Actionable insights based on your data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {insights.recommendations.slice(0, 3).map((rec, i) => (
                    <motion.div
                      key={rec.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.8 + i * 0.1 }}
                      className="p-3 rounded-xl bg-muted/50 border border-border/60"
                      data-testid={`recommendation-${i}`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 rounded-lg bg-card shrink-0">
                          {getCategoryIcon(rec.category)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <h4 className="font-semibold text-sm truncate">{rec.title}</h4>
                            {getPriorityBadge(rec.priority)}
                          </div>
                          <p className="text-xs text-muted-foreground mb-1.5">{rec.description}</p>
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
