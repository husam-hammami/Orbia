import { useState, useEffect, useContext, useCallback } from "react";
import { Layout } from "@/components/layout";
import { useSearch } from "wouter";
import { LockContext } from "@/App";
import { MoodTracker } from "@/components/mood-tracker";
import { RoutineTimeline } from "@/components/routine-timeline";
import { RoutineEditor } from "@/components/routine-editor";
import { HabitGrid } from "@/components/habit-grid";
import { HabitGarden } from "@/components/habit-garden";
import { HabitListCompact } from "@/components/habit-list-compact";
import { HabitForm } from "@/components/habit-form";
import { TodoList } from "@/components/todo-list";
import { DailySummary } from "@/components/daily-summary";
import { JournalTab } from "@/components/journal-tab";
import { FoodTracker } from "@/components/food-tracker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Activity, Calendar, Sparkles, LayoutGrid, List, Flower2, Loader2, ListTodo, BookOpen, Utensils, ChevronLeft, ChevronRight } from "lucide-react";
import { CurrentTimeDisplay } from "@/components/current-time-display";
import { Habit } from "@/lib/types";
import { toast } from "sonner";
import { useHabits, useCreateHabit, useDeleteHabit, useUpdateHabit, useAddHabitCompletion, useRemoveHabitCompletion } from "@/lib/api-hooks";
import { useQuery } from "@tanstack/react-query";
import { useSwipeable } from "react-swipeable";
import { motion, AnimatePresence } from "framer-motion";

const TAB_ORDER = ["habits", "mood", "routine", "food", "todos", "journal"] as const;
type TabType = typeof TAB_ORDER[number];

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

export default function TrackerPage() {
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const tabFromUrl = urlParams.get("tab");
  
  const [activeTab, setActiveTab] = useState<TabType>(tabFromUrl as TabType || "habits");
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  
  useEffect(() => {
    if (tabFromUrl && TAB_ORDER.includes(tabFromUrl as TabType)) {
      setActiveTab(tabFromUrl as TabType);
    }
  }, [tabFromUrl]);

  const goToNextTab = useCallback(() => {
    const currentIndex = TAB_ORDER.indexOf(activeTab as TabType);
    if (currentIndex < TAB_ORDER.length - 1) {
      setSwipeDirection("left");
      setActiveTab(TAB_ORDER[currentIndex + 1]);
    }
  }, [activeTab]);

  const goToPrevTab = useCallback(() => {
    const currentIndex = TAB_ORDER.indexOf(activeTab as TabType);
    if (currentIndex > 0) {
      setSwipeDirection("right");
      setActiveTab(TAB_ORDER[currentIndex - 1]);
    }
  }, [activeTab]);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: goToNextTab,
    onSwipedRight: goToPrevTab,
    trackMouse: false,
    trackTouch: true,
    delta: 50,
    preventScrollOnSwipe: false,
  });

  const currentTabIndex = TAB_ORDER.indexOf(activeTab as TabType);
  
  const { data: dbHabits, isLoading: habitsLoading } = useHabits();
  const [viewMode, setViewMode] = useState<"grid" | "list" | "garden">("garden");
  
  const habitIds = dbHabits?.map(h => h.id) || [];
  
  const { data: allCompletions, isLoading: completionsLoading } = useQuery({
    queryKey: ["allCompletions", habitIds.join(",")],
    queryFn: () => fetchAllCompletions(habitIds),
    enabled: habitIds.length > 0,
  });

  const createHabitMutation = useCreateHabit();
  const deleteHabitMutation = useDeleteHabit();
  const updateHabitMutation = useUpdateHabit();
  const addCompletionMutation = useAddHabitCompletion();
  const removeCompletionMutation = useRemoveHabitCompletion();

  const today = format(new Date(), "yyyy-MM-dd");

  const habits: Habit[] = (dbHabits || []).map(dbHabit => {
    const history = allCompletions?.[dbHabit.id] || [];
    const completedToday = history.includes(today);
    return {
      id: dbHabit.id,
      title: dbHabit.title,
      description: dbHabit.description || undefined,
      category: dbHabit.category as Habit["category"],
      frequency: dbHabit.frequency as Habit["frequency"],
      streak: dbHabit.streak,
      completedToday,
      history,
      color: dbHabit.color,
      target: dbHabit.target,
      unit: dbHabit.unit || undefined,
      icon: dbHabit.icon || undefined,
    };
  });
  
  const handleToggle = (id: string) => {
    const habit = habits.find(h => h.id === id);
    if (!habit) return;

    if (habit.completedToday) {
      removeCompletionMutation.mutate({ habitId: id, date: today }, {
        onError: () => toast.error("Failed to update habit"),
      });
    } else {
      addCompletionMutation.mutate({ habitId: id, date: today }, {
        onSuccess: () => toast.success("Great job!"),
        onError: () => toast.error("Failed to update habit"),
      });
    }
  };

  const handleAddHabit = (data: Omit<Habit, "id" | "streak" | "completedToday" | "history">) => {
    createHabitMutation.mutate({
      title: data.title,
      description: data.description || null,
      category: data.category,
      frequency: data.frequency,
      streak: 0,
      color: data.color,
      target: data.target,
      unit: data.unit || null,
      icon: null,
    }, {
      onSuccess: () => toast.success("New habit planted!"),
      onError: () => toast.error("Failed to create habit"),
    });
  };

  const handleDelete = (id: string) => {
    deleteHabitMutation.mutate(id, {
      onSuccess: () => toast.success("Habit removed"),
      onError: () => toast.error("Failed to delete habit"),
    });
  };

  const handleUpdate = (id: string, data: Partial<Omit<Habit, "id" | "streak" | "completedToday" | "history">>) => {
    updateHabitMutation.mutate({ id, ...data }, {
      onSuccess: () => toast.success("Habit updated"),
      onError: () => toast.error("Failed to update habit"),
    });
  };

  const isLoading = habitsLoading || (habitIds.length > 0 && completionsLoading);
  const lockContext = useContext(LockContext);

  return (
    <Layout lockContext={lockContext}>
      <div className="space-y-4 md:space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col items-center gap-1 md:gap-2 mb-1 md:mb-2">
          <p className="text-xs md:text-sm text-muted-foreground font-medium">{format(new Date(), "EEEE, MMMM do")}</p>
          <h1 className="text-xl md:text-4xl font-display font-bold text-foreground">
            Daily Tracker
          </h1>
          <CurrentTimeDisplay />
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="w-full">
          <div className="sticky top-0 z-30 -mx-3 px-3 py-2 backdrop-blur-md md:static md:mx-0 md:px-0 md:py-0 md:backdrop-blur-none">
            <TabsList className="w-full grid grid-cols-6 md:flex h-auto md:h-12 items-center gap-0.5 md:gap-1 rounded-2xl md:rounded-xl bg-muted/50 md:bg-muted/60 p-1 md:p-1.5 border border-border/30 md:border-border/50 shadow-sm md:justify-center">
              <TabsTrigger 
                value="habits" 
                className="flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2 whitespace-nowrap rounded-xl md:rounded-lg px-1 md:px-5 py-2 md:py-2.5 text-[10px] md:text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md text-muted-foreground" 
                data-testid="tab-habits"
              >
                <Sparkles className="w-4 h-4 md:w-4 md:h-4" />
                <span>Habits</span>
              </TabsTrigger>
              <TabsTrigger 
                value="mood" 
                className="flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2 whitespace-nowrap rounded-xl md:rounded-lg px-1 md:px-5 py-2 md:py-2.5 text-[10px] md:text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md text-muted-foreground" 
                data-testid="tab-mood"
              >
                <Activity className="w-4 h-4 md:w-4 md:h-4" />
                <span>State</span>
              </TabsTrigger>
              <TabsTrigger 
                value="routine" 
                className="flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2 whitespace-nowrap rounded-xl md:rounded-lg px-1 md:px-5 py-2 md:py-2.5 text-[10px] md:text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md text-muted-foreground" 
                data-testid="tab-routine"
              >
                <Calendar className="w-4 h-4 md:w-4 md:h-4" />
                <span>Routine</span>
              </TabsTrigger>
              <TabsTrigger 
                value="food" 
                className="flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2 whitespace-nowrap rounded-xl md:rounded-lg px-1 md:px-5 py-2 md:py-2.5 text-[10px] md:text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md text-muted-foreground" 
                data-testid="tab-food"
              >
                <Utensils className="w-4 h-4 md:w-4 md:h-4" />
                <span>Food</span>
              </TabsTrigger>
              <TabsTrigger 
                value="todos" 
                className="flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2 whitespace-nowrap rounded-xl md:rounded-lg px-1 md:px-5 py-2 md:py-2.5 text-[10px] md:text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md text-muted-foreground" 
                data-testid="tab-todos"
              >
                <ListTodo className="w-4 h-4 md:w-4 md:h-4" />
                <span>Tasks</span>
              </TabsTrigger>
              <TabsTrigger 
                value="journal" 
                className="flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2 whitespace-nowrap rounded-xl md:rounded-lg px-1 md:px-5 py-2 md:py-2.5 text-[10px] md:text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md text-muted-foreground" 
                data-testid="tab-journal"
              >
                <BookOpen className="w-4 h-4 md:w-4 md:h-4" />
                <span>Journal</span>
              </TabsTrigger>
            </TabsList>
            
            <div className="flex items-center justify-center gap-1.5 mt-2 md:hidden">
              {TAB_ORDER.map((tab, idx) => (
                <motion.div
                  key={tab}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentTabIndex 
                      ? 'w-6 bg-primary' 
                      : 'w-1.5 bg-muted-foreground/30'
                  }`}
                  layoutId={idx === currentTabIndex ? "tab-indicator" : undefined}
                />
              ))}
            </div>
          </div>
          
          <div {...swipeHandlers} className="touch-pan-y">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: swipeDirection === "left" ? 50 : swipeDirection === "right" ? -50 : 0 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: swipeDirection === "left" ? -50 : 50 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
          <TabsContent value="habits" className="mt-4" data-testid="content-habits" forceMount={activeTab === "habits" ? true : undefined}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-muted/30 px-4 py-2 rounded-full border border-border/50">
                    <span className="text-sm font-bold text-primary font-mono">
                      {habits.filter(h => h.completedToday).length} <span className="text-muted-foreground font-normal">/ {habits.length}</span>
                    </span>
                  </div>
                  <div className="w-32 h-2 bg-background rounded-full overflow-hidden border border-border/50">
                    <div 
                      className="h-full bg-primary transition-all duration-500 ease-out"
                      style={{ width: habits.length > 0 ? `${(habits.filter(h => h.completedToday).length / habits.length) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="bg-muted/50 p-1 rounded-lg flex items-center">
                    <button 
                      onClick={() => setViewMode("grid")}
                      className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      title="Weekly Grid"
                      data-testid="button-view-grid"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setViewMode("list")}
                      className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      title="Compact List"
                      data-testid="button-view-list"
                    >
                      <List className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setViewMode("garden")}
                      className={`p-2 rounded-md transition-all ${viewMode === 'garden' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      title="Zen Garden"
                      data-testid="button-view-garden"
                    >
                      <Flower2 className="w-4 h-4" />
                    </button>
                  </div>
                  <HabitForm onSubmit={handleAddHabit} />
                </div>
              </div>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  Loading habits...
                </div>
              ) : habits.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-lg mb-2">No habits yet</p>
                  <p className="text-sm">Add your first habit to start tracking!</p>
                </div>
              ) : (
                <>
                  {viewMode === "grid" && (
                    <HabitGrid habits={habits} onToggle={handleToggle} onDelete={handleDelete} onEdit={handleUpdate} />
                  )}
                  
                  {viewMode === "list" && (
                    <HabitListCompact habits={habits} onToggle={handleToggle} onDelete={handleDelete} onEdit={handleUpdate} />
                  )}

                  {viewMode === "garden" && (
                    <HabitGarden habits={habits} onToggle={handleToggle} onDelete={handleDelete} onEdit={handleUpdate} />
                  )}
                </>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="mood" className="mt-4 space-y-4" data-testid="content-mood">
            <MoodTracker />
            <DailySummary />
          </TabsContent>
          
          <TabsContent value="routine" className="mt-4 space-y-3" data-testid="content-routine">
            <div className="flex justify-end">
              <RoutineEditor />
            </div>
            <RoutineTimeline />
          </TabsContent>
          
          <TabsContent value="food" className="mt-4" data-testid="content-food">
            <FoodTracker />
          </TabsContent>
          
          <TabsContent value="todos" className="mt-4" data-testid="content-todos">
            <TodoList />
          </TabsContent>
          
          <TabsContent value="journal" className="mt-4" data-testid="content-journal">
            <JournalTab />
          </TabsContent>
              </motion.div>
            </AnimatePresence>
          </div>
        </Tabs>
      </div>
    </Layout>
  );
}
