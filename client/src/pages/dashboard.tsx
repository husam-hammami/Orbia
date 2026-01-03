import { useState } from "react";
import { Layout } from "@/components/layout";
import { HabitGrid } from "@/components/habit-grid";
import { HabitGarden } from "@/components/habit-garden";
import { HabitListCompact } from "@/components/habit-list-compact";
import { MoodTracker } from "@/components/mood-tracker";
import { SystemJournal } from "@/components/system-journal";
import { HeadspaceMap } from "@/components/headspace-map";
import { GroundingAnchor } from "@/components/grounding-anchor";
import { HabitForm } from "@/components/habit-form";
import { MOCK_HABITS } from "@/lib/mock-data";
import { Habit } from "@/lib/types";
import { format } from "date-fns";
import { 
  Plus, LayoutGrid, List, Flower2, NotebookPen, BrainCircuit,
  CheckCircle2, Activity, Zap, AlertCircle, CloudFog, Battery, Flame,
  Briefcase, Utensils, Smile, Frown, Meh, Calendar, Target, MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  LineChart, 
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from "recharts";

// --- Mock Data for Dashboard Charts ---
const HABIT_DATA = [
  { name: "Mon", completed: 4, total: 6 },
  { name: "Tue", completed: 3, total: 6 },
  { name: "Wed", completed: 5, total: 6 },
  { name: "Thu", completed: 2, total: 6 },
  { name: "Fri", completed: 6, total: 6 },
  { name: "Sat", completed: 4, total: 6 },
  { name: "Sun", completed: 5, total: 6 },
];

const MOOD_DATA = [
  { name: "Mon", mood: 3, anxiety: 2, focus: 4 },
  { name: "Tue", mood: 4, anxiety: 1, focus: 5 },
  { name: "Wed", mood: 2, anxiety: 4, focus: 2 },
  { name: "Thu", mood: 3, anxiety: 3, focus: 3 },
  { name: "Fri", mood: 5, anxiety: 1, focus: 5 },
  { name: "Sat", mood: 4, anxiety: 2, focus: 4 },
  { name: "Sun", mood: 5, anxiety: 1, focus: 3 },
];

const DETAILED_METRICS = [
  { name: "Mon", dissociation: 3, communication: 6, pain: 2, sleep: 7, energy: 6, urges: 1 },
  { name: "Tue", dissociation: 2, communication: 7, pain: 3, sleep: 6, energy: 7, urges: 2 },
  { name: "Wed", dissociation: 5, communication: 4, pain: 4, sleep: 5, energy: 4, urges: 5 },
  { name: "Thu", dissociation: 2, communication: 8, pain: 2, sleep: 8, energy: 8, urges: 1 },
  { name: "Fri", dissociation: 4, communication: 5, pain: 5, sleep: 4, energy: 5, urges: 3 },
  { name: "Sat", dissociation: 1, communication: 9, pain: 1, sleep: 9, energy: 9, urges: 1 },
  { name: "Sun", dissociation: 2, communication: 8, pain: 2, sleep: 8, energy: 7, urges: 2 },
];

export default function Dashboard() {
  const [habits, setHabits] = useState(MOCK_HABITS);
  const [viewMode, setViewMode] = useState<"grid" | "list" | "garden">("grid");
  const [showHeadspace, setShowHeadspace] = useState(false);
  
  const handleToggle = (id: string) => {
    setHabits(habits.map(h => {
      if (h.id === id) {
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

  const handleAddHabit = (data: Omit<Habit, "id" | "streak" | "completedToday" | "history">) => {
    const newHabit: Habit = {
      ...data,
      id: Math.random().toString(36).substr(2, 9),
      streak: 0,
      completedToday: false,
      history: []
    };
    setHabits([...habits, newHabit]);
    toast.success("New habit planted!");
  };

  const handleDelete = (id: string) => {
    setHabits(habits.filter(h => h.id !== id));
    toast.success("Habit removed");
  };

  const today = new Date();

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500 pb-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-muted-foreground font-medium mb-1">{format(today, "EEEE, MMMM do")}</p>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              Mindful Tracking
            </h1>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
             {/* Compact Daily Progress */}
             <div className="hidden lg:flex items-center gap-3 bg-muted/30 px-4 py-2 rounded-full border border-border/50 mr-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Progress</span>
                <div className="flex items-center gap-3">
                   <span className="text-sm font-bold text-primary font-mono">{habits.filter(h => h.completedToday).length} <span className="text-muted-foreground font-normal">/ {habits.length}</span></span>
                   <div className="w-24 h-2 bg-background rounded-full overflow-hidden border border-border/50">
                      <div 
                        className="h-full bg-primary transition-all duration-500 ease-out"
                        style={{ width: habits.length > 0 ? `${(habits.filter(h => h.completedToday).length / habits.length) * 100}%` : '0%' }}
                      />
                   </div>
                </div>
             </div>

            <Button 
               variant={showHeadspace ? "default" : "outline"}
               size="sm" 
               className="gap-2 hidden md:flex"
               onClick={() => setShowHeadspace(!showHeadspace)}
            >
               <BrainCircuit className="w-4 h-4" />
               {showHeadspace ? "Hide Headspace" : "Show Headspace"}
            </Button>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full h-12 w-12 border-primary/20 text-primary hover:bg-primary/5" title="System Journal">
                  <NotebookPen className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[400px] sm:w-[540px]">
                <SheetHeader className="mb-4">
                  <SheetTitle>System Journal</SheetTitle>
                  <SheetDescription>
                    A shared space for notes, reminders, and communication.
                  </SheetDescription>
                </SheetHeader>
                <SystemJournal />
              </SheetContent>
            </Sheet>
            <HabitForm onSubmit={handleAddHabit} />
          </div>
        </div>

        {/* Headspace Map (Collapsible) */}
        {showHeadspace && (
           <div className="animate-in slide-in-from-top-4 duration-300">
              <HeadspaceMap />
           </div>
        )}

        {/* Input Tracker */}
        <MoodTracker />

        {/* --- ANALYTICS DASHBOARD INTEGRATION --- */}
        <div className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2 border-b border-border/40 pb-2 mt-8">
                <Activity className="w-5 h-5 text-indigo-500" />
                Live Telemetry
            </h2>

            {/* Top KPIs Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <Card className="bg-indigo-500/5 border-indigo-500/20 md:col-span-2">
                  <CardContent className="p-4 flex flex-col justify-between h-full">
                     <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                <BrainCircuit className="w-3.5 h-3.5" /> Mental Stability
                            </span>
                            <div className="text-3xl font-mono font-bold flex items-baseline gap-2">
                                92% <span className="text-sm font-normal text-muted-foreground">Baseline</span>
                            </div>
                        </div>
                        <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-200">Optimal</Badge>
                     </div>
                     <div className="space-y-1 mt-4">
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Anxiety</span>
                            <span>Low (2/10)</span>
                        </div>
                        <Progress value={20} className="h-1.5 bg-indigo-500/10" indicatorClassName="bg-indigo-500" />
                     </div>
                  </CardContent>
               </Card>

               <Card className="bg-emerald-500/5 border-emerald-500/20">
                  <CardContent className="p-4 flex flex-col gap-2">
                     <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Habit Rate
                     </span>
                     <div className="text-2xl font-mono font-bold">82%</div>
                     <Progress value={82} className="h-1 bg-emerald-500/20" indicatorClassName="bg-emerald-500" />
                  </CardContent>
               </Card>

               <Card className="bg-rose-500/5 border-rose-500/20">
                  <CardContent className="p-4 flex flex-col gap-2">
                     <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5" /> Avg Mood
                     </span>
                     <div className="text-2xl font-mono font-bold flex items-center gap-2">
                        3.8 <span className="text-sm font-normal text-muted-foreground">/ 5.0</span>
                     </div>
                     <div className="flex gap-1">
                        {[1,2,3,4,5].map(n => (
                           <div key={n} className={`h-1.5 flex-1 rounded-full ${n <= 4 ? 'bg-rose-500' : 'bg-rose-500/20'}`} />
                        ))}
                     </div>
                  </CardContent>
               </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               {/* Mental Telemetry Chart */}
               <Card className="border-border/50 shadow-sm">
                  <CardHeader>
                     <CardTitle className="flex items-center gap-2 text-base">
                        <BrainCircuit className="w-4 h-4 text-indigo-500" />
                        Mental State
                     </CardTitle>
                     <CardDescription>Mood, Focus & Anxiety Correlation</CardDescription>
                  </CardHeader>
                  <CardContent>
                     <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                           <AreaChart data={MOOD_DATA}>
                              <defs>
                                 <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                 </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: 'hsl(var(--background))' }} />
                              <Area type="monotone" dataKey="mood" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorMood)" strokeWidth={2} />
                              <Line type="monotone" dataKey="anxiety" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                           </AreaChart>
                        </ResponsiveContainer>
                     </div>
                  </CardContent>
               </Card>

               {/* Internal System Chart */}
               <Card className="border-border/50 shadow-sm">
                  <CardHeader>
                     <CardTitle className="flex items-center gap-2 text-base">
                        <CloudFog className="w-4 h-4 text-purple-500" />
                        Internal System
                     </CardTitle>
                     <CardDescription>Dissociation & Communication</CardDescription>
                  </CardHeader>
                  <CardContent>
                     <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                           <LineChart data={DETAILED_METRICS}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                              <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: 'hsl(var(--background))' }} />
                              <Line type="monotone" dataKey="dissociation" stroke="#9333ea" strokeWidth={2} dot={{r:3}} />
                              <Line type="monotone" dataKey="communication" stroke="#6366f1" strokeWidth={2} dot={{r:3}} />
                              <Line type="step" dataKey="urges" stroke="#ef4444" strokeWidth={1} strokeDasharray="4 4" dot={false} />
                           </LineChart>
                        </ResponsiveContainer>
                     </div>
                  </CardContent>
               </Card>
            </div>
        </div>

        {/* Habits Grid */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-semibold">Your Habits</h2>
            
            <div className="bg-muted/50 p-1 rounded-lg flex items-center">
               <button 
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Weekly Grid"
               >
                  <LayoutGrid className="w-4 h-4" />
               </button>
               <button 
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Compact List"
               >
                  <List className="w-4 h-4" />
               </button>
               <button 
                  onClick={() => setViewMode("garden")}
                  className={`p-2 rounded-md transition-all ${viewMode === 'garden' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Zen Garden"
               >
                  <Flower2 className="w-4 h-4" />
               </button>
            </div>
          </div>
          
          {viewMode === "grid" && (
             <HabitGrid habits={habits} onToggle={handleToggle} onDelete={handleDelete} />
          )}
          
          {viewMode === "list" && (
             <HabitListCompact habits={habits} onToggle={handleToggle} onDelete={handleDelete} />
          )}

          {viewMode === "garden" && (
             <HabitGarden habits={habits} onToggle={handleToggle} onDelete={handleDelete} />
          )}
        </div>
      </div>
      <GroundingAnchor />
    </Layout>
  );
}
