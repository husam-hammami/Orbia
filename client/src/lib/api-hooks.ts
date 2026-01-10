import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SystemMember, TrackerEntry, SystemMessage, HeadspaceRoom, SystemSettings, Habit, HabitCompletion, RoutineBlock, RoutineActivity, RoutineActivityLog, Todo, DailySummary, CareerProject, CareerTask, Expense, JournalEntry, InsertJournalEntry } from "@shared/schema";
import type { DashboardInsights } from "../../../server/lib/dashboard-analytics";

// Helper to handle API calls
async function fetchAPI(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Network error" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

// System Members Hooks
export function useMembers() {
  return useQuery<SystemMember[]>({
    queryKey: ["members"],
    queryFn: () => fetchAPI("/api/members"),
  });
}

export function useCreateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<SystemMember, "id" | "createdAt">) =>
      fetchAPI("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<SystemMember, "id" | "createdAt">> }) =>
      fetchAPI(`/api/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });
}

export function useDeleteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchAPI(`/api/members/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });
}

// Tracker Entries Hooks
export function useTrackerEntries(limit?: number) {
  return useQuery<TrackerEntry[]>({
    queryKey: ["tracker", limit],
    queryFn: () => fetchAPI(`/api/tracker${limit ? `?limit=${limit}` : ""}`),
  });
}

export function useCreateTrackerEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<TrackerEntry, "id" | "createdAt">) =>
      fetchAPI("/api/tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracker"] });
    },
  });
}

export function useUpdateTrackerEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TrackerEntry> }) =>
      fetchAPI(`/api/tracker/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracker"] });
    },
  });
}

export function useDeleteTrackerEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchAPI(`/api/tracker/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracker"] });
    },
  });
}

// System Messages Hooks
export function useMessages() {
  return useQuery<SystemMessage[]>({
    queryKey: ["messages"],
    queryFn: () => fetchAPI("/api/messages"),
  });
}

export function useCreateMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<SystemMessage, "id" | "createdAt">) =>
      fetchAPI("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchAPI(`/api/messages/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });
}

// Headspace Rooms Hooks
export function useRooms() {
  return useQuery<HeadspaceRoom[]>({
    queryKey: ["rooms"],
    queryFn: () => fetchAPI("/api/rooms"),
  });
}

export function useCreateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<HeadspaceRoom, "id" | "createdAt">) =>
      fetchAPI("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}

export function useUpdateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<HeadspaceRoom, "id" | "createdAt">> }) =>
      fetchAPI(`/api/rooms/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}

export function useDeleteRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchAPI(`/api/rooms/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}

// System Settings Hooks
export function useSettings() {
  return useQuery<SystemSettings>({
    queryKey: ["settings"],
    queryFn: () => fetchAPI("/api/settings"),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Omit<SystemSettings, "id" | "updatedAt">>) =>
      fetchAPI("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}

// Habits Hooks
export function useHabits() {
  return useQuery<Habit[]>({
    queryKey: ["habits"],
    queryFn: () => fetchAPI("/api/habits"),
  });
}

export function useCreateHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Habit, "id" | "createdAt" | "streak"> & { streak?: number }) =>
      fetchAPI("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ streak: 0, ...data }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
    },
  });
}

export function useUpdateHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Omit<Habit, "id" | "createdAt">>) =>
      fetchAPI(`/api/habits/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
    },
  });
}

export function useDeleteHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchAPI(`/api/habits/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
    },
  });
}

// Habit Completions Hooks
export function useHabitCompletions(habitId: string) {
  return useQuery<HabitCompletion[]>({
    queryKey: ["habitCompletions", habitId],
    queryFn: () => fetchAPI(`/api/habits/${habitId}/completions`),
    enabled: !!habitId,
  });
}

export function useAllHabitCompletions() {
  return useQuery<HabitCompletion[]>({
    queryKey: ["allHabitCompletions"],
    queryFn: () => fetchAPI("/api/habit-completions"),
  });
}

export function useAddHabitCompletion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ habitId, date }: { habitId: string; date: string }) =>
      fetchAPI(`/api/habits/${habitId}/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completedDate: date }),
      }),
    onMutate: async ({ habitId, date }) => {
      await queryClient.cancelQueries({ predicate: (q) => q.queryKey[0] === "allCompletions" });
      const queries = queryClient.getQueriesData<Record<string, string[]>>({ predicate: (q) => q.queryKey[0] === "allCompletions" });
      const previousMap = new Map(queries);
      queries.forEach(([key, data]) => {
        if (data && data[habitId] !== undefined) {
          const existing = data[habitId] || [];
          if (!existing.includes(date)) {
            queryClient.setQueryData<Record<string, string[]>>(key, {
              ...data,
              [habitId]: [...existing, date]
            });
          }
        }
      });
      return { previousMap };
    },
    onError: (_, __, context) => {
      if (context?.previousMap) {
        context.previousMap.forEach((data, key) => {
          queryClient.setQueryData(key, data);
        });
      }
    },
    onSettled: (_, __, { habitId }) => {
      queryClient.invalidateQueries({ queryKey: ["habitCompletions", habitId] });
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "allCompletions" });
    },
  });
}

export function useRemoveHabitCompletion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ habitId, date }: { habitId: string; date: string }) =>
      fetchAPI(`/api/habits/${habitId}/completions/${date}`, {
        method: "DELETE",
      }),
    onMutate: async ({ habitId, date }) => {
      await queryClient.cancelQueries({ predicate: (q) => q.queryKey[0] === "allCompletions" });
      const queries = queryClient.getQueriesData<Record<string, string[]>>({ predicate: (q) => q.queryKey[0] === "allCompletions" });
      const previousMap = new Map(queries);
      queries.forEach(([key, data]) => {
        if (data && data[habitId] !== undefined) {
          queryClient.setQueryData<Record<string, string[]>>(key, {
            ...data,
            [habitId]: (data[habitId] || []).filter(d => d !== date)
          });
        }
      });
      return { previousMap };
    },
    onError: (_, __, context) => {
      if (context?.previousMap) {
        context.previousMap.forEach((data, key) => {
          queryClient.setQueryData(key, data);
        });
      }
    },
    onSettled: (_, __, { habitId }) => {
      queryClient.invalidateQueries({ queryKey: ["habitCompletions", habitId] });
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "allCompletions" });
    },
  });
}

// Routine Blocks Hooks
export function useRoutineBlocks() {
  return useQuery<RoutineBlock[]>({
    queryKey: ["routineBlocks"],
    queryFn: () => fetchAPI("/api/routine-blocks"),
  });
}

// Routine Activities Hooks
export function useRoutineActivities() {
  return useQuery<RoutineActivity[]>({
    queryKey: ["routineActivities"],
    queryFn: () => fetchAPI("/api/routine-activities"),
  });
}

// Routine Activity Logs Hooks
export function useRoutineLogs(date: string) {
  return useQuery<RoutineActivityLog[]>({
    queryKey: ["routineLogs", date],
    queryFn: () => fetchAPI(`/api/routine-logs/${date}`),
    enabled: !!date,
  });
}

export function useAddRoutineLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { activityId: string; completedDate: string; notes?: string }) =>
      fetchAPI("/api/routine-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { completedDate }) => {
      queryClient.invalidateQueries({ queryKey: ["routineLogs", completedDate] });
    },
  });
}

export function useRemoveRoutineLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ activityId, date }: { activityId: string; date: string }) =>
      fetchAPI(`/api/routine-logs/${activityId}/${date}`, {
        method: "DELETE",
      }),
    onSuccess: (_, { date }) => {
      queryClient.invalidateQueries({ queryKey: ["routineLogs", date] });
    },
  });
}

// Atomic routine + habit toggle
export function useToggleRoutineActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { activityId: string; date: string; habitId: string | null; action: "add" | "remove" }) =>
      fetchAPI("/api/routine-toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { date, habitId }) => {
      queryClient.invalidateQueries({ queryKey: ["routineLogs", date] });
      queryClient.invalidateQueries({ queryKey: ["allHabitCompletions"] });
      if (habitId) {
        queryClient.invalidateQueries({ queryKey: ["habitCompletions", habitId] });
      }
    },
  });
}

// Routine Block CRUD
export function useCreateRoutineBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; emoji: string; startTime: string; endTime: string; purpose: string; color: string; order: number }) =>
      fetchAPI("/api/routine-blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routineBlocks"] });
    },
  });
}

export function useUpdateRoutineBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name: string; emoji: string; startTime: string; endTime: string; purpose: string; color: string; order: number }) =>
      fetchAPI(`/api/routine-blocks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routineBlocks"] });
    },
  });
}

export function useDeleteRoutineBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchAPI(`/api/routine-blocks/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routineBlocks"] });
      queryClient.invalidateQueries({ queryKey: ["routineActivities"] });
    },
  });
}

// Routine Activity CRUD
export function useCreateRoutineActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { blockId: string; name: string; time: string | null; description: string | null; habitId: string | null; order: number }) =>
      fetchAPI("/api/routine-activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routineActivities"] });
    },
  });
}

export function useUpdateRoutineActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Omit<RoutineActivity, "id" | "createdAt">>) =>
      fetchAPI(`/api/routine-activities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routineActivities"] });
    },
  });
}

export function useDeleteRoutineActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchAPI(`/api/routine-activities/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routineActivities"] });
    },
  });
}

// Todos Hooks
export function useTodos() {
  return useQuery<Todo[]>({
    queryKey: ["todos"],
    queryFn: () => fetchAPI("/api/todos"),
  });
}

export function useCreateTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; priority?: string; completed?: number; dueDate?: Date }) =>
      fetchAPI("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });
}

export function useUpdateTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; title?: string; priority?: string; completed?: number; dueDate?: Date | null }) =>
      fetchAPI(`/api/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });
}

export function useDeleteTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchAPI(`/api/todos/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });
}

// Daily Summaries Hooks
export function useDailySummaries() {
  return useQuery<DailySummary[]>({
    queryKey: ["dailySummaries"],
    queryFn: () => fetchAPI("/api/daily-summaries"),
  });
}

export function useDailySummary(date: string) {
  return useQuery<DailySummary | null>({
    queryKey: ["dailySummary", date],
    queryFn: () => fetchAPI(`/api/daily-summaries/${date}`),
  });
}

export function useUpsertDailySummary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { date: string; feeling: string }) =>
      fetchAPI("/api/daily-summaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dailySummaries"] });
      queryClient.invalidateQueries({ queryKey: ["dailySummary"] });
    },
  });
}

// Career Projects Hooks
export function useCareerProjects() {
  return useQuery<CareerProject[]>({
    queryKey: ["careerProjects"],
    queryFn: () => fetchAPI("/api/career-projects"),
  });
}

export function useCreateCareerProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<CareerProject, "id" | "createdAt">) =>
      fetchAPI("/api/career-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["careerProjects"] });
    },
  });
}

export function useUpdateCareerProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Omit<CareerProject, "id" | "createdAt">>) =>
      fetchAPI(`/api/career-projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["careerProjects"] });
    },
  });
}

export function useDeleteCareerProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchAPI(`/api/career-projects/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["careerProjects"] });
      queryClient.invalidateQueries({ queryKey: ["careerTasks"] });
    },
  });
}

// Career Tasks Hooks
export function useCareerTasks(projectId?: string) {
  return useQuery<CareerTask[]>({
    queryKey: ["careerTasks", projectId],
    queryFn: () => fetchAPI(`/api/career-tasks${projectId ? `?projectId=${projectId}` : ""}`),
  });
}

export function useCreateCareerTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<CareerTask, "id" | "createdAt">) =>
      fetchAPI("/api/career-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["careerTasks"] });
    },
  });
}

export function useUpdateCareerTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Omit<CareerTask, "id" | "createdAt">>) =>
      fetchAPI(`/api/career-tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["careerTasks"] });
    },
  });
}

export function useDeleteCareerTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchAPI(`/api/career-tasks/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["careerTasks"] });
    },
  });
}

// Expenses Hooks
export function useExpenses(month?: string) {
  return useQuery<Expense[]>({
    queryKey: ["expenses", month],
    queryFn: () => fetchAPI(`/api/expenses${month ? `?month=${month}` : ""}`),
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Expense, "id" | "createdAt">) =>
      fetchAPI("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Omit<Expense, "id" | "createdAt">>) =>
      fetchAPI(`/api/expenses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchAPI(`/api/expenses/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
}

// Career Vision Hooks
interface CareerVisionItem {
  id: string;
  title: string;
  timeframe: string;
  color: string;
  order: number;
  createdAt: Date;
}

export function useCareerVision() {
  return useQuery<CareerVisionItem[]>({
    queryKey: ["careerVision"],
    queryFn: () => fetchAPI("/api/vision"),
  });
}

export function useUpdateCareerVision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; timeframe: string; color: string; order: number }[]) =>
      fetchAPI("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["careerVision"] });
    },
  });
}

// Finance Settings Hooks
interface FinanceSettingsData {
  id?: string;
  monthlyBudget: number;
  debtTotal: number;
  debtPaid: number;
  debtMonthlyPayment: number;
  updatedAt?: Date;
}

export function useFinanceSettings() {
  return useQuery<FinanceSettingsData>({
    queryKey: ["financeSettings"],
    queryFn: () => fetchAPI("/api/finance-settings"),
  });
}

export function useUpdateFinanceSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Omit<FinanceSettingsData, "id" | "updatedAt">>) =>
      fetchAPI("/api/finance-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financeSettings"] });
    },
  });
}

// Journal Entries Hooks
export function useJournalEntries() {
  return useQuery<JournalEntry[]>({
    queryKey: ["journal"],
    queryFn: () => fetchAPI("/api/journal"),
  });
}

export function useCreateJournalEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InsertJournalEntry) =>
      fetchAPI("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal"] });
    },
  });
}

export function useUpdateJournalEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertJournalEntry> }) =>
      fetchAPI(`/api/journal/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal"] });
    },
  });
}

export function useDeleteJournalEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchAPI(`/api/journal/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal"] });
    },
  });
}

export function useDashboardInsights() {
  return useQuery<DashboardInsights>({
    queryKey: ["dashboardInsights"],
    queryFn: () => fetchAPI("/api/insights/dashboard"),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
}

export interface DeepMindOverview {
  systemMetrics: {
    avgMood: number;
    avgStress: number;
    avgDissociation: number;
    avgEnergy: number;
    stabilityIndex: number;
    totalEntries: number;
    daysTracked: number;
    avgSwitchesPerDay: number;
  };
  currentFronter: { id: string; name: string; color: string } | null;
  memberStats: Array<{
    memberId: string;
    name: string;
    role: string;
    color: string;
    avatar: string;
    frontingPercent: number;
    avgMood: number | null;
    avgStress: number | null;
    avgEnergy: number | null;
    entryCount: number;
    lastFronting: string | null;
    moodTrend: "improving" | "stable" | "declining";
  }>;
  timeRange: number;
}

export function useDeepMindOverview(days = 30) {
  return useQuery<DeepMindOverview>({
    queryKey: ["deepMindOverview", days],
    queryFn: () => fetchAPI(`/api/deep-mind/overview?days=${days}`),
    staleTime: 30000,
  });
}
