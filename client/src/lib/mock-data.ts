import { Habit, UserStats } from "./types";
import { subDays, format } from "date-fns";

const generateHistory = (days: number, probability: number): string[] => {
  const history: string[] = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    if (Math.random() < probability) {
      history.push(format(subDays(today, i), 'yyyy-MM-dd'));
    }
  }
  return history;
};

export const MOCK_HABITS: Habit[] = [
  {
    id: "1",
    title: "Morning Grounding",
    description: "5-4-3-2-1 technique to anchor in the present",
    category: "Mindfulness",
    frequency: "daily",
    streak: 12,
    completedToday: false,
    history: generateHistory(60, 0.8),
    color: "hsl(142 40% 45%)", // Primary Green
    target: 5,
    unit: "min"
  },
  {
    id: "2",
    title: "System Check-in",
    description: "Brief roll call and emotional weather report",
    category: "System",
    frequency: "daily",
    streak: 5,
    completedToday: true,
    history: [...generateHistory(30, 0.6), format(new Date(), 'yyyy-MM-dd')],
    color: "hsl(260 20% 60%)", // Purple
    target: 1,
    unit: "session"
  },
  {
    id: "3",
    title: "Meds & Supplements",
    description: "Take daily prescribed medication",
    category: "Health",
    frequency: "daily",
    streak: 45,
    completedToday: false,
    history: generateHistory(45, 0.95),
    color: "hsl(0 40% 70%)", // Red/Pink
    target: 1,
    unit: "dose"
  },
  {
    id: "4",
    title: "Deep Journaling",
    description: "15m of free writing or prompt response",
    category: "Creativity",
    frequency: "daily",
    streak: 3,
    completedToday: true,
    history: [...generateHistory(20, 0.7), format(new Date(), 'yyyy-MM-dd')],
    color: "hsl(32 60% 60%)", // Orange
    target: 15,
    unit: "min"
  },
  {
    id: "5",
    title: "Sleep Hygiene",
    description: "No screens 30m before bed",
    category: "Recovery",
    frequency: "daily",
    streak: 8,
    completedToday: false,
    history: generateHistory(30, 0.9),
    color: "hsl(217 30% 50%)", // Blue
    target: 1,
    unit: "routine"
  },
  {
    id: "6",
    title: "Financial Review",
    description: "Check balances and categorize expenses",
    category: "Finance",
    frequency: "daily",
    streak: 22,
    completedToday: true,
    history: [...generateHistory(90, 0.95), format(new Date(), 'yyyy-MM-dd')],
    color: "hsl(142 40% 45%)", // Green
    target: 5,
    unit: "min"
  },
  {
    id: "7",
    title: "Hydration",
    description: "Drink 2L of water",
    category: "Health",
    frequency: "daily",
    streak: 15,
    completedToday: false,
    history: generateHistory(45, 0.8),
    color: "hsl(180 30% 50%)", // Teal
    target: 2000,
    unit: "ml"
  }
];

export const MOCK_STATS: UserStats = {
  totalHabits: 6,
  completedToday: 3,
  currentStreak: 5,
  completionRate: 78
};
