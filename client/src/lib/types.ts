export type Category = "Health" | "Work" | "Mindfulness" | "Creativity" | "Social" | "Finance";

export type Frequency = "daily" | "weekly";

export interface Habit {
  id: string;
  title: string;
  description?: string;
  category: Category;
  frequency: Frequency;
  streak: number;
  completedToday: boolean;
  history: string[]; // ISO date strings of completion
  color: string; // Hex or tailwind class
  target: number; // e.g., 1 for once a day, or minutes
  unit?: string;
}

export interface UserStats {
  totalHabits: number;
  completedToday: number;
  currentStreak: number; // Global streak
  completionRate: number;
}
