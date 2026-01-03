import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SystemMember, TrackerEntry, SystemMessage, HeadspaceRoom, SystemSettings, Habit, HabitCompletion, RoutineBlock, RoutineActivity, RoutineActivityLog } from "@shared/schema";

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
    mutationFn: (data: Omit<Habit, "id" | "createdAt">) =>
      fetchAPI("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
    },
  });
}

export function useUpdateHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<Habit, "id" | "createdAt">> }) =>
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
    onSuccess: (_, { habitId }) => {
      queryClient.invalidateQueries({ queryKey: ["habitCompletions", habitId] });
      queryClient.invalidateQueries({ queryKey: ["habits"] });
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
    onSuccess: (_, { habitId }) => {
      queryClient.invalidateQueries({ queryKey: ["habitCompletions", habitId] });
      queryClient.invalidateQueries({ queryKey: ["habits"] });
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
    mutationFn: ({ id, ...data }: { id: string; blockId: string; name: string; time: string | null; description: string | null; habitId: string | null; order: number }) =>
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
