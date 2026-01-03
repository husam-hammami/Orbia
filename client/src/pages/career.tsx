import { useState } from "react";
import { Layout } from "@/components/layout";
import { 
  Plus, Target, Rocket, Calendar, CheckSquare, MoreHorizontal, 
  ArrowRight, Briefcase, TrendingUp, Clock, AlertCircle, 
  CheckCircle2, LayoutTemplate, Sparkles, Filter, BrainCircuit
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";

// Mock Data
const MOCK_PROJECTS = [
  { 
    id: 1, 
    title: "Portfolio Redesign 2026", 
    status: "In Progress", 
    progress: 65, 
    deadline: "2026-02-15", 
    color: "bg-indigo-500",
    nextAction: "Finalize case study copy"
  },
  { 
    id: 2, 
    title: "Q1 Marketing Strategy", 
    status: "Planning", 
    progress: 20, 
    deadline: "2026-01-30", 
    color: "bg-rose-500",
    nextAction: "Competitor analysis"
  },
  { 
    id: 3, 
    title: "React Performance Course", 
    status: "Ongoing", 
    progress: 45, 
    deadline: null, 
    color: "bg-emerald-500",
    nextAction: "Complete module 4"
  },
];

const MOCK_TASKS = [
  { id: 1, title: "Draft homepage copy", project: "Portfolio Redesign 2026", completed: false, priority: "High", due: "Today" },
  { id: 2, title: "Select color palette", project: "Portfolio Redesign 2026", completed: true, priority: "Medium", due: "Yesterday" },
  { id: 3, title: "Research competitors", project: "Q1 Marketing Strategy", completed: false, priority: "Medium", due: "Tomorrow" },
  { id: 4, title: "Complete tutorial #4", project: "React Performance Course", completed: false, priority: "Low", due: "Next Week" },
  { id: 5, title: "Update LinkedIn Profile", project: "General", completed: false, priority: "Low", due: "Next Week" },
];

const MOCK_VISION = [
  { 
    id: 1, 
    title: "Senior Frontend Engineer", 
    type: "Role",
    timeframe: "2 Years",
    description: "Leading a team of developers, architecting scalable UI systems.",
    icon: Briefcase,
    color: "text-blue-500 bg-blue-500/10"
  },
  { 
    id: 2, 
    title: "Launch SaaS Product", 
    type: "Entrepreneurship",
    timeframe: "This Year",
    description: "Build and launch a small productivity tool for developers.",
    icon: Rocket,
    color: "text-purple-500 bg-purple-500/10"
  },
  { 
    id: 3, 
    title: "Deep Work Mastery", 
    type: "Habit",
    timeframe: "Ongoing",
    description: "Consistently achieving 4 hours of flow state daily.",
    icon: BrainCircuit,
    color: "text-amber-500 bg-amber-500/10"
  },
];

export default function CareerPage() {
  const [projects, setProjects] = useState(MOCK_PROJECTS);
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const [vision, setVision] = useState(MOCK_VISION);
  const [newTask, setNewTask] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "board">("list");

  const toggleTask = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    setTasks([{
      id: Date.now(),
      title: newTask,
      project: "General",
      completed: false,
      priority: "Medium",
      due: "Today"
    }, ...tasks]);
    setNewTask("");
  };

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500 pb-12">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/40">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
               <span className="px-2 py-1 rounded-md bg-muted text-xs font-medium uppercase tracking-wider">Professional Workspace</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-display font-bold text-foreground tracking-tight">
              Career & Vision
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl font-light">
              Designing your future, one project at a time.
            </p>
          </div>
          
          <div className="flex gap-3">
             <Button 
               variant={viewMode === "board" ? "secondary" : "outline"} 
               className="gap-2 h-10 px-4"
               onClick={() => setViewMode(viewMode === "list" ? "board" : "list")}
             >
                {viewMode === "list" ? <LayoutTemplate className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                {viewMode === "list" ? "Board View" : "List View"}
             </Button>
             <Button className="gap-2 h-10 px-4 bg-primary text-primary-foreground shadow-sm hover:shadow transition-all">
                <Plus className="w-4 h-4" /> New Initiative
             </Button>
          </div>
        </div>

        {/* Vision Section */}
        <section className="space-y-4">
           <div className="flex items-center justify-between">
              <h2 className="text-xl font-display font-semibold flex items-center gap-2">
                 <Sparkles className="w-5 h-5 text-amber-500" />
                 North Star Vision
              </h2>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {vision.map((item) => (
                 <div key={item.id} className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-background to-muted/30 p-6 hover:shadow-md transition-all duration-300 hover:border-border">
                    <div className={cn("absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity")}>
                       <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                       </Button>
                    </div>
                    
                    <div className="flex items-start gap-4 mb-4">
                       <div className={cn("p-3 rounded-lg", item.color)}>
                          <item.icon className="w-6 h-6" />
                       </div>
                       <div>
                          <Badge variant="outline" className="mb-2 font-normal text-xs">{item.type}</Badge>
                          <h3 className="font-semibold text-lg leading-none">{item.title}</h3>
                       </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                       {item.description}
                    </p>
                    
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                       <Clock className="w-3.5 h-3.5" />
                       {item.timeframe}
                    </div>
                 </div>
              ))}
              
              <button className="group flex flex-col items-center justify-center p-6 border-2 border-dashed border-muted rounded-xl hover:bg-muted/30 hover:border-primary/50 transition-all duration-300 min-h-[200px]">
                 <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <Plus className="w-6 h-6" />
                 </div>
                 <span className="font-medium text-muted-foreground group-hover:text-foreground">Add Vision Goal</span>
              </button>
           </div>
        </section>

        <Separator className="my-8" />

        {/* Dashboard Content */}
        {viewMode === "list" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
             
             {/* Projects Column (8 cols) */}
             <div className="lg:col-span-8 space-y-6">
                <div className="flex items-center justify-between">
                   <h2 className="text-xl font-display font-semibold flex items-center gap-2">
                      <Rocket className="w-5 h-5 text-indigo-500" />
                      Active Projects
                   </h2>
                   <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="text-muted-foreground">
                         <Filter className="w-4 h-4 mr-2" /> Filter
                      </Button>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {projects.map(project => {
                      const daysLeft = project.deadline ? differenceInDays(new Date(project.deadline), new Date()) : null;
                      const isUrgent = daysLeft !== null && daysLeft < 7;

                      return (
                         <Card key={project.id} className="group hover:shadow-lg transition-all duration-300 border-border/50">
                            <CardHeader className="pb-3">
                               <div className="flex justify-between items-start mb-2">
                                  <Badge 
                                     variant="outline" 
                                     className={cn("font-normal", 
                                        project.status === "In Progress" ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800" : 
                                        project.status === "Planning" ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800" :
                                        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800"
                                     )}
                                  >
                                     {project.status}
                                  </Badge>
                                  <DropdownMenu>
                                     <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                           <MoreHorizontal className="w-4 h-4" />
                                        </Button>
                                     </DropdownMenuTrigger>
                                     <DropdownMenuContent align="end">
                                        <DropdownMenuItem>Edit Project</DropdownMenuItem>
                                        <DropdownMenuItem>View Details</DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-destructive">Archive</DropdownMenuItem>
                                     </DropdownMenuContent>
                                  </DropdownMenu>
                               </div>
                               <CardTitle className="text-lg font-semibold tracking-tight">{project.title}</CardTitle>
                            </CardHeader>
                            
                            <CardContent className="pb-4">
                               <div className="mb-4">
                                  <div className="flex justify-between text-xs mb-1.5 font-medium text-muted-foreground">
                                     <span>Progress</span>
                                     <span>{project.progress}%</span>
                                  </div>
                                  <Progress value={project.progress} className="h-2" indicatorClassName={project.color} />
                               </div>
                               
                               {project.nextAction && (
                                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                                     <ArrowRight className="w-3.5 h-3.5" />
                                     <span className="truncate">Next: <span className="font-medium text-foreground">{project.nextAction}</span></span>
                                  </div>
                               )}
                            </CardContent>
                            
                            <CardFooter className="pt-0 text-xs text-muted-foreground flex justify-between items-center">
                               {project.deadline ? (
                                  <div className={cn("flex items-center gap-1.5", isUrgent && "text-rose-500 font-medium")}>
                                     <Calendar className="w-3.5 h-3.5" />
                                     {daysLeft} days left
                                  </div>
                               ) : (
                                  <div className="flex items-center gap-1.5">
                                     <TrendingUp className="w-3.5 h-3.5" />
                                     Ongoing
                                  </div>
                               )}
                            </CardFooter>
                         </Card>
                      );
                   })}
                </div>
             </div>

             {/* Tasks Column (4 cols) */}
             <div className="lg:col-span-4 space-y-6">
                <div className="flex items-center justify-between">
                   <h2 className="text-xl font-display font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      Priority Actions
                   </h2>
                </div>

                <Card className="border-border/50 shadow-sm h-full flex flex-col">
                   <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                      <form onSubmit={handleAddTask} className="flex gap-2">
                         <Input 
                            placeholder="Add a quick task..." 
                            className="h-9 bg-background" 
                            value={newTask}
                            onChange={(e) => setNewTask(e.target.value)}
                         />
                         <Button size="sm" type="submit" disabled={!newTask.trim()}>
                            <Plus className="w-4 h-4" />
                         </Button>
                      </form>
                   </CardHeader>
                   
                   <ScrollArea className="flex-1 p-0">
                      <div className="divide-y divide-border/50">
                         {tasks.map(task => (
                            <div 
                               key={task.id} 
                               className={cn(
                                  "p-3 flex items-start gap-3 hover:bg-muted/30 transition-colors group relative",
                                  task.completed && "bg-muted/10"
                               )}
                            >
                               <button 
                                  onClick={() => toggleTask(task.id)}
                                  className={cn(
                                     "mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-200",
                                     task.completed 
                                        ? "bg-emerald-500 border-emerald-500 text-white shadow-sm" 
                                        : "border-muted-foreground/40 hover:border-emerald-500 hover:text-emerald-500"
                                  )}
                               >
                                  {task.completed && <CheckSquare className="w-3.5 h-3.5" />}
                               </button>
                               
                               <div className="flex-1 min-w-0">
                                  <p className={cn(
                                     "text-sm font-medium leading-none truncate transition-all", 
                                     task.completed && "line-through text-muted-foreground"
                                  )}>
                                     {task.title}
                                  </p>
                                  
                                  <div className="flex items-center gap-2 mt-2">
                                     <span className={cn(
                                        "text-[10px] px-1.5 py-0.5 rounded font-medium border",
                                        task.priority === "High" ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-300" : 
                                        task.priority === "Medium" ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300" : 
                                        "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/20 dark:text-slate-300"
                                     )}>
                                        {task.priority}
                                     </span>
                                     <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                        <Briefcase className="w-3 h-3" /> {task.project}
                                     </span>
                                  </div>
                               </div>

                               {task.due === "Today" && !task.completed && (
                                  <div className="absolute top-3 right-3">
                                     <span className="text-[10px] font-semibold text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-1.5 py-0.5 rounded">
                                        Today
                                     </span>
                                  </div>
                               )}
                            </div>
                         ))}
                      </div>
                   </ScrollArea>
                   
                   <CardFooter className="pt-3 pb-3 border-t border-border/50 bg-muted/20 text-xs text-muted-foreground justify-center">
                      {tasks.filter(t => t.completed).length} of {tasks.length} tasks completed
                   </CardFooter>
                </Card>
             </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px] overflow-hidden">
             {["Planning", "In Progress", "Ongoing"].map((status) => (
                <div key={status} className="flex flex-col h-full bg-muted/10 rounded-xl border border-border/50">
                   <div className="p-4 border-b border-border/50 flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur-sm z-10 rounded-t-xl">
                      <div className="flex items-center gap-2">
                         <div className={cn("w-2 h-2 rounded-full", 
                            status === "Planning" ? "bg-purple-500" : 
                            status === "In Progress" ? "bg-blue-500" : "bg-emerald-500"
                         )} />
                         <span className="font-semibold text-sm">{status}</span>
                         <span className="px-2 py-0.5 rounded-full bg-muted text-xs font-medium text-muted-foreground">
                            {projects.filter(p => p.status === status).length}
                         </span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                         <Plus className="w-3 h-3" />
                      </Button>
                   </div>
                   
                   <div className="p-3 space-y-3 overflow-y-auto flex-1">
                      {projects.filter(p => p.status === status).map(project => (
                         <Card key={project.id} className="cursor-pointer hover:shadow-md transition-all border-l-4" style={{ borderLeftColor: project.color.replace('bg-', '') }}>
                            <CardContent className="p-3">
                               <div className="flex justify-between items-start mb-2">
                                  <h4 className="font-semibold text-sm line-clamp-1">{project.title}</h4>
                                  <DropdownMenu>
                                     <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 -mt-1 text-muted-foreground">
                                           <MoreHorizontal className="w-3 h-3" />
                                        </Button>
                                     </DropdownMenuTrigger>
                                     <DropdownMenuContent align="end">
                                        <DropdownMenuItem>Edit</DropdownMenuItem>
                                        <DropdownMenuItem>Move to...</DropdownMenuItem>
                                     </DropdownMenuContent>
                                  </DropdownMenu>
                               </div>
                               
                               <div className="space-y-3">
                                  <div className="space-y-1">
                                     <div className="flex justify-between text-[10px] text-muted-foreground">
                                        <span>Progress</span>
                                        <span>{project.progress}%</span>
                                     </div>
                                     <Progress value={project.progress} className="h-1.5" indicatorClassName={project.color} />
                                  </div>
                                  
                                  {project.nextAction && (
                                     <div className="text-xs bg-muted/50 p-1.5 rounded text-muted-foreground truncate flex items-center gap-1.5">
                                        <ArrowRight className="w-3 h-3 shrink-0" />
                                        {project.nextAction}
                                     </div>
                                  )}

                                  {project.deadline && (
                                     <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-2">
                                        <Calendar className="w-3 h-3" />
                                        {project.deadline}
                                     </div>
                                  )}
                               </div>
                            </CardContent>
                         </Card>
                      ))}
                      
                      <button className="w-full py-2 text-xs font-medium text-muted-foreground border border-dashed border-border rounded-lg hover:bg-muted/50 transition-colors">
                         + Add Project
                      </button>
                   </div>
                </div>
             ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
