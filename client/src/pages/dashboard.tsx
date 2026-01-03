import { useState } from "react";
import { Layout } from "@/components/layout";
import { HabitCard } from "@/components/habit-card";
import { MOCK_HABITS, MOCK_STATS } from "@/lib/mock-data";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const [habits, setHabits] = useState(MOCK_HABITS);
  
  const handleToggle = (id: string) => {
    setHabits(habits.map(h => {
      if (h.id === id) {
        // Toggle logic (simplified for mockup)
        const newCompleted = !h.completedToday;
        return {
          ...h,
          completedToday: newCompleted,
          streak: newCompleted ? h.streak + 1 : Math.max(0, h.streak - 1)
        };
      }
      return h;
    }));
  };

  const today = new Date();

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-muted-foreground font-medium mb-1">{format(today, "EEEE, MMMM do")}</p>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              Ready to grow?
            </h1>
          </div>
          
          <Button size="lg" className="rounded-full px-6 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
            <Plus className="w-5 h-5 mr-2" />
            New Habit
          </Button>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           <div className="bg-card p-4 rounded-2xl border shadow-sm">
             <p className="text-sm text-muted-foreground">Focus</p>
             <p className="text-2xl font-display font-bold mt-1">{MOCK_STATS.completedToday}/{MOCK_STATS.totalHabits}</p>
           </div>
           <div className="bg-card p-4 rounded-2xl border shadow-sm">
             <p className="text-sm text-muted-foreground">Streak</p>
             <div className="flex items-center gap-2 mt-1">
                <p className="text-2xl font-display font-bold">{MOCK_STATS.currentStreak}</p>
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">days</span>
             </div>
           </div>
           <div className="bg-card p-4 rounded-2xl border shadow-sm col-span-2 md:col-span-2 flex items-center justify-between relative overflow-hidden">
              <div className="z-10">
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                  <p className="text-2xl font-display font-bold mt-1">{MOCK_STATS.completionRate}%</p>
              </div>
              <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-primary/10 to-transparent" />
              {/* Decorative circle */}
              <div className="w-16 h-16 rounded-full border-[6px] border-primary/20 absolute right-4 top-1/2 -translate-y-1/2 border-t-primary" />
           </div>
        </div>

        {/* Habits List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-semibold">Your Habits</h2>
            <div className="flex gap-2">
               {/* Filter pills could go here */}
            </div>
          </div>
          
          <div className="grid gap-4">
            {habits.map((habit) => (
              <HabitCard key={habit.id} habit={habit} onToggle={handleToggle} />
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
