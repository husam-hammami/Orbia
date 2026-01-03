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
    title: "Morning Meditation",
    description: "10 minutes of mindfulness before work",
    category: "Mindfulness",
    frequency: "daily",
    streak: 12,
    completedToday: false,
    history: generateHistory(60, 0.8),
    color: "hsl(142 40% 45%)", // Primary Green
    target: 10,
    unit: "min"
  },
  {
    id: "2",
    title: "Drink Water",
    description: "2 liters per day",
    category: "Health",
    frequency: "daily",
    streak: 5,
    completedToday: true,
    history: [...generateHistory(30, 0.6), format(new Date(), 'yyyy-MM-dd')],
    color: "hsl(180 30% 50%)", // Cyan/Teal
    target: 2000,
    unit: "ml"
  },
  {
    id: "3",
    title: "Read a Book",
    description: "Read at least 20 pages",
    category: "Creativity",
    frequency: "daily",
    streak: 0,
    completedToday: false,
    history: generateHistory(45, 0.4),
    color: "hsl(32 60% 60%)", // Orange
    target: 20,
    unit: "pages"
  },
  {
    id: "4",
    title: "Deep Work Session",
    description: "90 minutes of focused work without distractions",
    category: "Work",
    frequency: "daily",
    streak: 3,
    completedToday: true,
    history: [...generateHistory(20, 0.7), format(new Date(), 'yyyy-MM-dd')],
    color: "hsl(260 20% 60%)", // Purple
    target: 90,
    unit: "min"
  },
  {
    id: "5",
    title: "Evening Walk",
    description: "Clear the head after work",
    category: "Health",
    frequency: "daily",
    streak: 8,
    completedToday: false,
    history: generateHistory(30, 0.9),
    color: "hsl(142 40% 45%)",
    target: 1,
    unit: "walk"
  },
  {
    id: "6",
    title: "Save $5",
    description: "Put small amount into savings",
    category: "Finance",
    frequency: "daily",
    streak: 22,
    completedToday: true,
    history: [...generateHistory(90, 0.95), format(new Date(), 'yyyy-MM-dd')],
    color: "hsl(0 40% 70%)", // Red/Pink
    target: 5,
    unit: "$"
  }
];

export const MOCK_STATS: UserStats = {
  totalHabits: 6,
  completedToday: 3,
  currentStreak: 5,
  completionRate: 78
};
