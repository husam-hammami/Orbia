import { z } from "zod";
import type { 
  TrackerEntry, 
  Habit, 
  HabitCompletion, 
  RoutineBlock, 
  RoutineActivity, 
  RoutineActivityLog,
  Todo,
  JournalEntry,
  DailySummary,
  FoodOption
} from "@shared/schema";

export const MoodInsightsSchema = z.object({
  trend7Day: z.object({
    direction: z.enum(["improving", "declining", "stable"]),
    change: z.number(),
    dataPoints: z.array(z.object({ date: z.string(), mood: z.number() })),
  }),
  trend30Day: z.object({
    direction: z.enum(["improving", "declining", "stable"]),
    change: z.number(),
    dataPoints: z.array(z.object({ date: z.string(), mood: z.number() })),
  }),
  averages: z.object({
    mood: z.number(),
    energy: z.number(),
    stress: z.number(),
    dissociation: z.number(),
  }),
  volatility: z.number(),
  bestTimeOfDay: z.string().nullable(),
  worstTimeOfDay: z.string().nullable(),
  topTriggers: z.array(z.object({ tag: z.string(), count: z.number() })),
});

export const HabitInsightsSchema = z.object({
  completionRate7Day: z.number(),
  completionRate30Day: z.number(),
  currentStreaks: z.array(z.object({ habitId: z.string(), title: z.string(), streak: z.number() })),
  longestStreaks: z.array(z.object({ habitId: z.string(), title: z.string(), streak: z.number() })),
  mostConsistent: z.array(z.object({ habitId: z.string(), title: z.string(), rate: z.number() })),
  leastConsistent: z.array(z.object({ habitId: z.string(), title: z.string(), rate: z.number() })),
  moodCorrelation: z.object({
    highCompletionAvgMood: z.number().nullable(),
    lowCompletionAvgMood: z.number().nullable(),
    correlation: z.enum(["positive", "negative", "neutral", "insufficient_data"]),
  }),
});

export const RoutineInsightsSchema = z.object({
  dailyCompletionRate: z.number(),
  mostSkippedActivities: z.array(z.object({ 
    activityId: z.string(), 
    name: z.string(), 
    skipRate: z.number() 
  })),
  blockEffectiveness: z.array(z.object({ 
    blockId: z.string(), 
    name: z.string(), 
    completionRate: z.number() 
  })),
  moodCorrelation: z.object({
    highRoutineAvgMood: z.number().nullable(),
    lowRoutineAvgMood: z.number().nullable(),
    correlation: z.enum(["positive", "negative", "neutral", "insufficient_data"]),
  }),
});

export const TodoInsightsSchema = z.object({
  completionRate: z.number(),
  overdueCount: z.number(),
  avgTimeToCompletionDays: z.number().nullable(),
  priorityDistribution: z.object({
    high: z.number(),
    medium: z.number(),
    low: z.number(),
  }),
  totalTodos: z.number(),
  completedTodos: z.number(),
});

export const JournalInsightsSchema = z.object({
  entryFrequency7Day: z.number(),
  mostCommonTypes: z.array(z.object({ type: z.string(), count: z.number() })),
  mostUsedTags: z.array(z.object({ tag: z.string(), count: z.number() })),
  averageMood: z.number().nullable(),
  averageEnergy: z.number().nullable(),
  totalEntries: z.number(),
});

export const FoodInsightsSchema = z.object({
  mealLoggingConsistency: z.number(),
  mostCommonMeals: z.array(z.object({ meal: z.string(), count: z.number() })),
  feelingDistribution: z.object({
    lighter: z.number(),
    average: z.number(),
    heavier: z.number(),
  }),
  daysLogged: z.number(),
});

export const RecommendationSchema = z.object({
  id: z.string(),
  category: z.enum(["mood", "habits", "routine", "journal", "food", "general"]),
  priority: z.enum(["high", "medium", "low"]),
  title: z.string(),
  description: z.string(),
  actionable: z.string(),
});

export const DashboardInsightsSchema = z.object({
  generatedAt: z.string(),
  mood: MoodInsightsSchema,
  habits: HabitInsightsSchema,
  routine: RoutineInsightsSchema,
  todos: TodoInsightsSchema,
  journal: JournalInsightsSchema,
  food: FoodInsightsSchema,
  recommendations: z.array(RecommendationSchema),
});

export type DashboardInsights = z.infer<typeof DashboardInsightsSchema>;
export type MoodInsights = z.infer<typeof MoodInsightsSchema>;
export type HabitInsights = z.infer<typeof HabitInsightsSchema>;
export type RoutineInsights = z.infer<typeof RoutineInsightsSchema>;
export type TodoInsights = z.infer<typeof TodoInsightsSchema>;
export type JournalInsights = z.infer<typeof JournalInsightsSchema>;
export type FoodInsights = z.infer<typeof FoodInsightsSchema>;
export type Recommendation = z.infer<typeof RecommendationSchema>;

function getDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

function getDaysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date;
}

function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

export function computeMoodInsights(entries: TrackerEntry[]): MoodInsights {
  const now = new Date();
  const sevenDaysAgo = getDaysAgo(7);
  const thirtyDaysAgo = getDaysAgo(30);

  const entries7Day = entries.filter(e => new Date(e.timestamp) >= sevenDaysAgo);
  const entries30Day = entries.filter(e => new Date(e.timestamp) >= thirtyDaysAgo);

  const computeTrend = (data: TrackerEntry[]) => {
    if (data.length < 2) {
      return { 
        direction: "stable" as const, 
        change: 0, 
        dataPoints: data.map(e => ({ date: getDateString(new Date(e.timestamp)), mood: e.mood })) 
      };
    }

    const sorted = [...data].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    const dailyMoods = new Map<string, number[]>();
    for (const entry of sorted) {
      const date = getDateString(new Date(entry.timestamp));
      if (!dailyMoods.has(date)) dailyMoods.set(date, []);
      dailyMoods.get(date)!.push(entry.mood);
    }

    const dataPoints = Array.from(dailyMoods.entries()).map(([date, moods]) => ({
      date,
      mood: moods.reduce((a, b) => a + b, 0) / moods.length,
    })).sort((a, b) => a.date.localeCompare(b.date));

    if (dataPoints.length < 2) {
      return { direction: "stable" as const, change: 0, dataPoints };
    }

    const firstHalf = dataPoints.slice(0, Math.floor(dataPoints.length / 2));
    const secondHalf = dataPoints.slice(Math.floor(dataPoints.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b.mood, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b.mood, 0) / secondHalf.length;
    const change = secondAvg - firstAvg;

    let direction: "improving" | "declining" | "stable";
    if (change > 0.5) direction = "improving";
    else if (change < -0.5) direction = "declining";
    else direction = "stable";

    return { direction, change: Math.round(change * 100) / 100, dataPoints };
  };

  const moods = entries.map(e => e.mood);
  const energies = entries.map(e => e.energy);
  const stresses = entries.map(e => e.stress);
  const dissociations = entries.map(e => e.dissociation);

  const avg = (arr: number[]) => arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0;

  const timeOfDayMoods = new Map<string, number[]>();
  for (const entry of entries) {
    if (entry.timeOfDay) {
      if (!timeOfDayMoods.has(entry.timeOfDay)) timeOfDayMoods.set(entry.timeOfDay, []);
      timeOfDayMoods.get(entry.timeOfDay)!.push(entry.mood);
    }
  }

  let bestTime: string | null = null;
  let worstTime: string | null = null;
  let bestAvg = -1;
  let worstAvg = 11;

  Array.from(timeOfDayMoods.entries()).forEach(([time, timeMoods]) => {
    const timeAvg = avg(timeMoods);
    if (timeAvg > bestAvg) {
      bestAvg = timeAvg;
      bestTime = time;
    }
    if (timeAvg < worstAvg) {
      worstAvg = timeAvg;
      worstTime = time;
    }
  });

  const triggerCounts = new Map<string, number>();
  for (const entry of entries) {
    if (entry.triggerTag) {
      triggerCounts.set(entry.triggerTag, (triggerCounts.get(entry.triggerTag) || 0) + 1);
    }
  }

  const topTriggers = Array.from(triggerCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    trend7Day: computeTrend(entries7Day),
    trend30Day: computeTrend(entries30Day),
    averages: {
      mood: avg(moods),
      energy: avg(energies),
      stress: avg(stresses),
      dissociation: avg(dissociations),
    },
    volatility: Math.round(calculateStandardDeviation(moods) * 100) / 100,
    bestTimeOfDay: bestTime,
    worstTimeOfDay: worstTime,
    topTriggers,
  };
}

export function computeHabitInsights(
  habits: Habit[], 
  completions: HabitCompletion[],
  trackerEntries: TrackerEntry[]
): HabitInsights {
  const sevenDaysAgo = getDaysAgo(7);
  const thirtyDaysAgo = getDaysAgo(30);

  const dates7Day = new Set<string>();
  const dates30Day = new Set<string>();
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates7Day.add(getDateString(d));
  }
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates30Day.add(getDateString(d));
  }

  const completions7Day = completions.filter(c => dates7Day.has(c.completedDate));
  const completions30Day = completions.filter(c => dates30Day.has(c.completedDate));

  const activeHabits = habits.filter(h => h.frequency === "daily").length;
  const maxPossible7Day = activeHabits * 7;
  const maxPossible30Day = activeHabits * 30;

  const completionRate7Day = maxPossible7Day > 0 
    ? Math.round((completions7Day.length / maxPossible7Day) * 100) 
    : 0;
  const completionRate30Day = maxPossible30Day > 0 
    ? Math.round((completions30Day.length / maxPossible30Day) * 100) 
    : 0;

  const currentStreaks = habits.map(h => ({
    habitId: h.id,
    title: h.title,
    streak: h.streak,
  })).sort((a, b) => b.streak - a.streak);

  const computeLongestStreak = (habitId: string): number => {
    const habitCompletions = completions
      .filter(c => c.habitId === habitId)
      .map(c => c.completedDate)
      .sort();
    
    if (habitCompletions.length === 0) return 0;
    
    let maxStreak = 1;
    let currentStreak = 1;
    
    for (let i = 1; i < habitCompletions.length; i++) {
      const prev = new Date(habitCompletions[i - 1]);
      const curr = new Date(habitCompletions[i]);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }
    
    return maxStreak;
  };

  const longestStreaks = habits.map(h => ({
    habitId: h.id,
    title: h.title,
    streak: computeLongestStreak(h.id),
  })).sort((a, b) => b.streak - a.streak);

  const habitCompletionRates = habits.map(h => {
    const habitCompletions30Day = completions30Day.filter(c => c.habitId === h.id);
    const rate = Math.round((habitCompletions30Day.length / 30) * 100);
    return { habitId: h.id, title: h.title, rate };
  });

  const mostConsistent = [...habitCompletionRates].sort((a, b) => b.rate - a.rate).slice(0, 3);
  const leastConsistent = [...habitCompletionRates].sort((a, b) => a.rate - b.rate).slice(0, 3);

  const dailyCompletionCounts = new Map<string, number>();
  for (const c of completions30Day) {
    dailyCompletionCounts.set(c.completedDate, (dailyCompletionCounts.get(c.completedDate) || 0) + 1);
  }

  const dailyMoods = new Map<string, number[]>();
  for (const entry of trackerEntries) {
    const date = getDateString(new Date(entry.timestamp));
    if (dates30Day.has(date)) {
      if (!dailyMoods.has(date)) dailyMoods.set(date, []);
      dailyMoods.get(date)!.push(entry.mood);
    }
  }

  const highCompletionDays: number[] = [];
  const lowCompletionDays: number[] = [];
  const medianCompletion = activeHabits * 0.5;

  Array.from(dailyMoods.entries()).forEach(([date, moods]: [string, number[]]) => {
    const avgMood = moods.reduce((a: number, b: number) => a + b, 0) / moods.length;
    const completionCount = dailyCompletionCounts.get(date) || 0;
    
    if (completionCount >= medianCompletion) {
      highCompletionDays.push(avgMood);
    } else {
      lowCompletionDays.push(avgMood);
    }
  });

  const highAvgHabit = highCompletionDays.length > 0 
    ? Math.round((highCompletionDays.reduce((a: number, b: number) => a + b, 0) / highCompletionDays.length) * 10) / 10 
    : null;
  const lowAvgHabit = lowCompletionDays.length > 0 
    ? Math.round((lowCompletionDays.reduce((a: number, b: number) => a + b, 0) / lowCompletionDays.length) * 10) / 10 
    : null;

  let habitCorrelation: "positive" | "negative" | "neutral" | "insufficient_data";
  if (highAvgHabit === null || lowAvgHabit === null) {
    habitCorrelation = "insufficient_data";
  } else if (highAvgHabit - lowAvgHabit > 0.5) {
    habitCorrelation = "positive";
  } else if (lowAvgHabit - highAvgHabit > 0.5) {
    habitCorrelation = "negative";
  } else {
    habitCorrelation = "neutral";
  }

  return {
    completionRate7Day,
    completionRate30Day,
    currentStreaks: currentStreaks.slice(0, 5),
    longestStreaks: longestStreaks.slice(0, 5),
    mostConsistent,
    leastConsistent,
    moodCorrelation: {
      highCompletionAvgMood: highAvgHabit,
      lowCompletionAvgMood: lowAvgHabit,
      correlation: habitCorrelation,
    },
  };
}

export function computeRoutineInsights(
  blocks: RoutineBlock[],
  activities: RoutineActivity[],
  logs: RoutineActivityLog[],
  trackerEntries: TrackerEntry[]
): RoutineInsights {
  const thirtyDaysAgo = getDaysAgo(30);
  const dates30Day = new Set<string>();
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates30Day.add(getDateString(d));
  }

  const logs30Day = logs.filter(l => dates30Day.has(l.completedDate));

  const totalActivities = activities.length;
  const maxPossibleLogs = totalActivities * 30;
  const dailyCompletionRate = maxPossibleLogs > 0 
    ? Math.round((logs30Day.length / maxPossibleLogs) * 100) 
    : 0;

  const activityLogCounts = new Map<string, number>();
  for (const log of logs30Day) {
    activityLogCounts.set(log.activityId, (activityLogCounts.get(log.activityId) || 0) + 1);
  }

  const mostSkippedActivities = activities.map(a => ({
    activityId: a.id,
    name: a.name,
    skipRate: Math.round(((30 - (activityLogCounts.get(a.id) || 0)) / 30) * 100),
  })).sort((a, b) => b.skipRate - a.skipRate).slice(0, 5);

  const blockActivityCounts = new Map<string, { total: number; completed: number }>();
  for (const activity of activities) {
    if (!blockActivityCounts.has(activity.blockId)) {
      blockActivityCounts.set(activity.blockId, { total: 0, completed: 0 });
    }
    const block = blockActivityCounts.get(activity.blockId)!;
    block.total += 30;
    block.completed += activityLogCounts.get(activity.id) || 0;
  }

  const blockEffectiveness = blocks.map(b => {
    const stats = blockActivityCounts.get(b.id) || { total: 0, completed: 0 };
    return {
      blockId: b.id,
      name: b.name,
      completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
    };
  }).sort((a, b) => b.completionRate - a.completionRate);

  const dailyLogCounts = new Map<string, number>();
  for (const log of logs30Day) {
    dailyLogCounts.set(log.completedDate, (dailyLogCounts.get(log.completedDate) || 0) + 1);
  }

  const dailyMoods = new Map<string, number[]>();
  for (const entry of trackerEntries) {
    const date = getDateString(new Date(entry.timestamp));
    if (dates30Day.has(date)) {
      if (!dailyMoods.has(date)) dailyMoods.set(date, []);
      dailyMoods.get(date)!.push(entry.mood);
    }
  }

  const highRoutineDays: number[] = [];
  const lowRoutineDays: number[] = [];
  const medianLogs = totalActivities * 0.5;

  Array.from(dailyMoods.entries()).forEach(([date, moods]: [string, number[]]) => {
    const avgMood = moods.reduce((a: number, b: number) => a + b, 0) / moods.length;
    const logCount = dailyLogCounts.get(date) || 0;
    
    if (logCount >= medianLogs) {
      highRoutineDays.push(avgMood);
    } else {
      lowRoutineDays.push(avgMood);
    }
  });

  const highAvg = highRoutineDays.length > 0 
    ? Math.round((highRoutineDays.reduce((a, b) => a + b, 0) / highRoutineDays.length) * 10) / 10 
    : null;
  const lowAvg = lowRoutineDays.length > 0 
    ? Math.round((lowRoutineDays.reduce((a, b) => a + b, 0) / lowRoutineDays.length) * 10) / 10 
    : null;

  let correlation: "positive" | "negative" | "neutral" | "insufficient_data";
  if (highAvg === null || lowAvg === null) {
    correlation = "insufficient_data";
  } else if (highAvg - lowAvg > 0.5) {
    correlation = "positive";
  } else if (lowAvg - highAvg > 0.5) {
    correlation = "negative";
  } else {
    correlation = "neutral";
  }

  return {
    dailyCompletionRate,
    mostSkippedActivities,
    blockEffectiveness,
    moodCorrelation: {
      highRoutineAvgMood: highAvg,
      lowRoutineAvgMood: lowAvg,
      correlation,
    },
  };
}

export function computeTodoInsights(todos: Todo[]): TodoInsights {
  const now = new Date();
  const completed = todos.filter(t => t.completed === 1);
  const completionRate = todos.length > 0 
    ? Math.round((completed.length / todos.length) * 100) 
    : 0;

  const overdueCount = todos.filter(t => 
    t.completed === 0 && t.dueDate && new Date(t.dueDate) < now
  ).length;

  let avgTimeToCompletionDays: number | null = null;
  const completedWithDates = completed.filter(t => t.dueDate && t.createdAt);
  if (completedWithDates.length > 0) {
    const totalDays = completedWithDates.reduce((sum, t) => {
      const created = new Date(t.createdAt);
      const dueOrNow = t.dueDate ? new Date(t.dueDate) : now;
      return sum + Math.max(0, Math.round((dueOrNow.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
    }, 0);
    avgTimeToCompletionDays = Math.round((totalDays / completedWithDates.length) * 10) / 10;
  }

  const priorityDistribution = {
    high: todos.filter(t => t.priority === "high").length,
    medium: todos.filter(t => t.priority === "medium").length,
    low: todos.filter(t => t.priority === "low").length,
  };

  return {
    completionRate,
    overdueCount,
    avgTimeToCompletionDays,
    priorityDistribution,
    totalTodos: todos.length,
    completedTodos: completed.length,
  };
}

export function computeJournalInsights(entries: JournalEntry[]): JournalInsights {
  const sevenDaysAgo = getDaysAgo(7);
  const entries7Day = entries.filter(e => new Date(e.createdAt) >= sevenDaysAgo);

  const typeCounts = new Map<string, number>();
  for (const entry of entries) {
    typeCounts.set(entry.entryType, (typeCounts.get(entry.entryType) || 0) + 1);
  }

  const mostCommonTypes = Array.from(typeCounts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const tagCounts = new Map<string, number>();
  for (const entry of entries) {
    const tags = entry.tags as string[] | null;
    if (tags) {
      for (const tag of tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }
  }

  const mostUsedTags = Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const moodsWithValue = entries.filter(e => e.mood !== null).map(e => e.mood as number);
  const energiesWithValue = entries.filter(e => e.energy !== null).map(e => e.energy as number);

  const averageMood = moodsWithValue.length > 0 
    ? Math.round((moodsWithValue.reduce((a, b) => a + b, 0) / moodsWithValue.length) * 10) / 10 
    : null;
  const averageEnergy = energiesWithValue.length > 0 
    ? Math.round((energiesWithValue.reduce((a, b) => a + b, 0) / energiesWithValue.length) * 10) / 10 
    : null;

  return {
    entryFrequency7Day: entries7Day.length,
    mostCommonTypes,
    mostUsedTags,
    averageMood,
    averageEnergy,
    totalEntries: entries.length,
  };
}

export function computeFoodInsights(
  summaries: DailySummary[],
  foodOptions: FoodOption[]
): FoodInsights {
  const thirtyDaysAgo = getDaysAgo(30);
  const dates30Day = new Set<string>();
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates30Day.add(getDateString(d));
  }

  const summaries30Day = summaries.filter(s => dates30Day.has(s.date));

  const logsWithMeals = summaries30Day.filter(s => 
    (s.breakfast && s.breakfast.length > 0) || 
    (s.lunch && s.lunch.length > 0) || 
    (s.dinner && s.dinner.length > 0)
  );

  const mealLoggingConsistency = Math.round((logsWithMeals.length / 30) * 100);

  const mealCounts = new Map<string, number>();
  for (const summary of summaries30Day) {
    if (summary.breakfast) mealCounts.set(summary.breakfast, (mealCounts.get(summary.breakfast) || 0) + 1);
    if (summary.lunch) mealCounts.set(summary.lunch, (mealCounts.get(summary.lunch) || 0) + 1);
    if (summary.dinner) mealCounts.set(summary.dinner, (mealCounts.get(summary.dinner) || 0) + 1);
  }

  const mostCommonMeals = Array.from(mealCounts.entries())
    .filter(([meal]) => meal.length > 0)
    .map(([meal, count]) => ({ meal, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const feelingDistribution = {
    lighter: summaries30Day.filter(s => s.feeling === "lighter").length,
    average: summaries30Day.filter(s => s.feeling === "average").length,
    heavier: summaries30Day.filter(s => s.feeling === "heavier").length,
  };

  return {
    mealLoggingConsistency,
    mostCommonMeals,
    feelingDistribution,
    daysLogged: logsWithMeals.length,
  };
}

export function generateRecommendations(
  moodInsights: MoodInsights,
  habitInsights: HabitInsights,
  routineInsights: RoutineInsights,
  todoInsights: TodoInsights,
  journalInsights: JournalInsights,
  foodInsights: FoodInsights
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  if (moodInsights.trend7Day.direction === "declining") {
    recommendations.push({
      id: "mood_declining",
      category: "mood",
      priority: "high",
      title: "Mood Trend Alert",
      description: "Your mood has been declining over the past week.",
      actionable: "Consider scheduling a self-care activity today. Even 10 minutes of your favorite relaxing activity can help.",
    });
  }

  if (moodInsights.volatility > 2.5) {
    recommendations.push({
      id: "mood_volatile",
      category: "mood",
      priority: "medium",
      title: "High Mood Variability",
      description: "Your mood varies significantly day to day.",
      actionable: "Try establishing a consistent morning routine to stabilize your baseline.",
    });
  }

  if (moodInsights.worstTimeOfDay && moodInsights.bestTimeOfDay !== moodInsights.worstTimeOfDay) {
    recommendations.push({
      id: "time_of_day",
      category: "mood",
      priority: "low",
      title: `${moodInsights.worstTimeOfDay.charAt(0).toUpperCase() + moodInsights.worstTimeOfDay.slice(1)} Challenges`,
      description: `Your mood tends to be lower during ${moodInsights.worstTimeOfDay}.`,
      actionable: `Plan lighter tasks or energizing activities for your ${moodInsights.worstTimeOfDay}s.`,
    });
  }

  if (habitInsights.completionRate7Day < 50) {
    recommendations.push({
      id: "habit_low_completion",
      category: "habits",
      priority: "medium",
      title: "Habit Consistency",
      description: "Your habit completion rate is below 50% this week.",
      actionable: "Focus on just 1-2 core habits to rebuild momentum. Small wins compound.",
    });
  }

  if (habitInsights.moodCorrelation.correlation === "positive") {
    recommendations.push({
      id: "habit_mood_boost",
      category: "habits",
      priority: "medium",
      title: "Habits Boost Your Mood",
      description: "Days with more habit completions show higher mood scores.",
      actionable: "Prioritize your habits first thing in the morning for a mood boost all day.",
    });
  }

  if (routineInsights.mostSkippedActivities.length > 0 && routineInsights.mostSkippedActivities[0].skipRate > 70) {
    const skipped = routineInsights.mostSkippedActivities[0];
    recommendations.push({
      id: "routine_skipped",
      category: "routine",
      priority: "low",
      title: "Routine Adjustment Needed",
      description: `"${skipped.name}" is skipped ${skipped.skipRate}% of the time.`,
      actionable: "Consider removing it or moving it to a better time slot.",
    });
  }

  if (todoInsights.overdueCount > 3) {
    recommendations.push({
      id: "todo_overdue",
      category: "general",
      priority: "high",
      title: "Overdue Tasks Piling Up",
      description: `You have ${todoInsights.overdueCount} overdue tasks.`,
      actionable: "Spend 15 minutes today to either complete, reschedule, or delete these tasks.",
    });
  }

  if (journalInsights.entryFrequency7Day < 2) {
    recommendations.push({
      id: "journal_frequency",
      category: "journal",
      priority: "low",
      title: "Journaling Check-in",
      description: "You've journaled less than usual this week.",
      actionable: "Try a quick 2-minute gratitude entry to maintain the practice.",
    });
  }

  if (foodInsights.mealLoggingConsistency < 30) {
    recommendations.push({
      id: "food_logging",
      category: "food",
      priority: "low",
      title: "Track Your Meals",
      description: "Meal logging has been inconsistent.",
      actionable: "Set a daily reminder after dinner to log your meals for the day.",
    });
  }

  if (foodInsights.feelingDistribution.heavier > foodInsights.feelingDistribution.lighter * 2) {
    recommendations.push({
      id: "food_feeling",
      category: "food",
      priority: "medium",
      title: "Body Awareness",
      description: "You've been feeling heavier more often than lighter recently.",
      actionable: "Review your most common meals and consider lighter alternatives.",
    });
  }

  return recommendations
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })
    .slice(0, 3);
}

export async function computeDashboardInsights(data: {
  trackerEntries: TrackerEntry[];
  habits: Habit[];
  habitCompletions: HabitCompletion[];
  routineBlocks: RoutineBlock[];
  routineActivities: RoutineActivity[];
  routineActivityLogs: RoutineActivityLog[];
  todos: Todo[];
  journalEntries: JournalEntry[];
  dailySummaries: DailySummary[];
  foodOptions: FoodOption[];
}): Promise<DashboardInsights> {
  const moodInsights = computeMoodInsights(data.trackerEntries);
  const habitInsights = computeHabitInsights(data.habits, data.habitCompletions, data.trackerEntries);
  const routineInsights = computeRoutineInsights(
    data.routineBlocks, 
    data.routineActivities, 
    data.routineActivityLogs, 
    data.trackerEntries
  );
  const todoInsights = computeTodoInsights(data.todos);
  const journalInsights = computeJournalInsights(data.journalEntries);
  const foodInsights = computeFoodInsights(data.dailySummaries, data.foodOptions);

  const recommendations = generateRecommendations(
    moodInsights,
    habitInsights,
    routineInsights,
    todoInsights,
    journalInsights,
    foodInsights
  );

  return {
    generatedAt: new Date().toISOString(),
    mood: moodInsights,
    habits: habitInsights,
    routine: routineInsights,
    todos: todoInsights,
    journal: journalInsights,
    food: foodInsights,
    recommendations,
  };
}
