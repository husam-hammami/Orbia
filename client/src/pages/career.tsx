import { useState } from "react";
import { Layout } from "@/components/layout";
import { 
  Plus, Target, Rocket, Calendar, CheckSquare, MoreHorizontal, 
  ArrowRight, Briefcase, TrendingUp, Clock, AlertCircle, 
  CheckCircle2, LayoutTemplate, Sparkles, Filter, BrainCircuit,
  Flag, Tag, AlignLeft, CalendarDays
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
    nextAction: "Finalize case study copy",
    description: "A complete overhaul of my personal portfolio to showcase my latest work and skills. Focusing on accessibility, performance, and modern design trends.",
    tags: ["Design", "Dev", "Personal Branding"]
  },
  { 
    id: 2, 
    title: "Q1 Marketing Strategy", 
    status: "Planning", 
    progress: 20, 
    deadline: "2026-01-30", 
    color: "bg-rose-500",
    nextAction: "Competitor analysis",
    description: "Developing a comprehensive marketing strategy for the first quarter. Includes social media planning, content calendar, and outreach campaigns.",
    tags: ["Marketing", "Strategy"]
  },
  { 
    id: 3, 
    title: "React Performance Course", 
    status: "Ongoing", 
    progress: 45, 
    deadline: null, 
    color: "bg-emerald-500",
    nextAction: "Complete module 4",
    description: "Advanced React course focusing on optimization techniques, memoization, and rendering performance.",
    tags: ["Learning", "React", "Dev"]
  },
];

const MOCK_TASKS = [
  { 
    id: 1, 
    title: "Draft homepage copy", 
    project: "Portfolio Redesign 2026", 
    completed: false, 
    priority: "High", 
    due: "Today",
    tags: ["Writing", "Design"],
    description: "Write compelling copy for the hero section and about page."
  },
  { 
    id: 2, 
    title: "Select color palette", 
    project: "Portfolio Redesign 2026", 
    completed: true, 
    priority: "Medium", 
    due: "Yesterday",
    tags: ["Design"],
    description: "Choose primary and secondary colors ensuring accessibility contrast."
  },
  { 
    id: 3, 
    title: "Research competitors", 
    project: "Q1 Marketing Strategy", 
    completed: false, 
    priority: "Medium", 
    due: "Tomorrow",
    tags: ["Research", "Strategy"],
    description: "Analyze top 3 competitors in the market."
  },
  { 
    id: 4, 
    title: "Complete tutorial #4", 
    project: "React Performance Course", 
    completed: false, 
    priority: "Low", 
    due: "Next Week",
    tags: ["Learning"],
    description: "Watch video and complete the coding challenge."
  },
  { 
    id: 5, 
    title: "Update LinkedIn Profile", 
    project: "General", 
    completed: false, 
    priority: "Low", 
    due: "Next Week",
    tags: ["Career"],
    description: "Update headline and summary to reflect new skills."
  },
];

const MOCK_VISION = [
  { 
    id: 1, 
    title: "Senior Frontend Engineer", 
    timeframe: "2 Years",
    color: "text-blue-500"
  },
  { 
    id: 2, 
    title: "Launch SaaS Product", 
    timeframe: "This Year",
    color: "text-purple-500"
  },
  { 
    id: 3, 
    title: "Deep Work Mastery", 
    timeframe: "Ongoing",
    color: "text-amber-500"
  },
];

export default function CareerPage() {
  const [projects, setProjects] = useState(MOCK_PROJECTS);
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const [vision, setVision] = useState(MOCK_VISION);
  const [newTask, setNewTask] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "board">("list");
  const [selectedTask, setSelectedTask] = useState<typeof MOCK_TASKS[0] | null>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  
  // Project State
  const [selectedProject, setSelectedProject] = useState<typeof MOCK_PROJECTS[0] | null>(null);
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [isProjectDetailsOpen, setIsProjectDetailsOpen] = useState(false);

  const toggleTask = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    const task = {
      id: Date.now(),
      title: newTask,
      project: "General",
      completed: false,
      priority: "Medium",
      due: "Today",
      tags: [],
      description: ""
    };
    setTasks([task, ...tasks]);
    setNewTask("");
    // Optionally open dialog to edit details immediately
    setSelectedTask(task);
    setIsTaskDialogOpen(true);
  };

  const openTaskDetails = (task: typeof MOCK_TASKS[0]) => {
    setSelectedTask(task);
    setIsTaskDialogOpen(true);
  };

  const openEditProject = (project: typeof MOCK_PROJECTS[0]) => {
    setSelectedProject(project);
    setIsProjectDialogOpen(true);
  };

  const openViewProject = (project: typeof MOCK_PROJECTS[0]) => {
    setSelectedProject(project);
    setIsProjectDetailsOpen(true);
  };

  const handleAddProjectTask = (projectTitle: string) => {
    const task = {
      id: Date.now(),
      title: "New Task",
      project: projectTitle,
      completed: false,
      priority: "Medium",
      due: format(new Date(), "yyyy-MM-dd"), // Default to today in YYYY-MM-DD
      tags: [],
      description: ""
    };
    setTasks([...tasks, task]);
    setSelectedTask(task);
    setIsTaskDialogOpen(true);
  };

  const handleUpdateProject = (updatedProject: typeof MOCK_PROJECTS[0]) => {
    setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
    setIsProjectDialogOpen(false);
  };

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500 pb-12 h-full flex flex-col">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/40 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
               <span className="px-2 py-1 rounded-md bg-muted text-xs font-medium uppercase tracking-wider">Professional Workspace</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-display font-bold text-foreground tracking-tight">
              Career & Vision
            </h1>
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

        {/* Minimal Vision Section */}
        <div className="flex flex-wrap gap-4 shrink-0">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mr-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>North Star:</span>
          </div>
          {vision.map((item) => (
            <Badge key={item.id} variant="outline" className="px-3 py-1.5 gap-2 text-sm font-normal bg-background/50 hover:bg-background transition-colors cursor-default">
              <span className={cn("w-2 h-2 rounded-full bg-current opacity-70", item.color)} />
              {item.title}
              <span className="text-muted-foreground text-xs ml-1 border-l pl-2 border-border/50">{item.timeframe}</span>
            </Badge>
          ))}
          <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground">
             Edit Vision
          </Button>
        </div>

        <Separator className="shrink-0" />

        {/* Main Content Area */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-8">
           
           {/* Projects Column (Main Focus) */}
           <div className="lg:col-span-8 flex flex-col min-h-0 space-y-6">
              <div className="flex items-center justify-between shrink-0">
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

              {viewMode === "list" ? (
                <ScrollArea className="flex-1 -mr-4 pr-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
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
                                          <DropdownMenuItem onClick={() => openEditProject(project)}>Edit Project</DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => openViewProject(project)}>View Details</DropdownMenuItem>
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
                </ScrollArea>
              ) : (
                <div className="flex-1 overflow-hidden">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full overflow-hidden">
                     {["Planning", "In Progress", "Ongoing"].map((status) => (
                        <div key={status} className="flex flex-col h-full bg-muted/10 rounded-xl border border-border/50">
                           <div className="p-4 border-b border-border/50 flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur-sm z-10 rounded-t-xl shrink-0">
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
                           
                           <ScrollArea className="flex-1">
                              <div className="p-3 space-y-3">
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
                                                  <DropdownMenuItem onClick={() => openEditProject(project)}>Edit Project</DropdownMenuItem>
                                                  <DropdownMenuItem onClick={() => openViewProject(project)}>View Details</DropdownMenuItem>
                                                  <DropdownMenuSeparator />
                                                  <DropdownMenuItem className="text-destructive">Archive</DropdownMenuItem>
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
                           </ScrollArea>
                        </div>
                     ))}
                  </div>
                </div>
              )}
           </div>

           {/* Tasks Column (Expanded Utility) */}
           <div className="lg:col-span-4 flex flex-col min-h-0 space-y-6">
              <div className="flex items-center justify-between shrink-0">
                 <h2 className="text-xl font-display font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    Priority Actions
                 </h2>
              </div>

              <Card className="border-border/50 shadow-sm h-full flex flex-col overflow-hidden">
                 <CardHeader className="pb-3 border-b border-border/50 bg-muted/20 shrink-0">
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
                 
                 <ScrollArea className="flex-1">
                    <div className="divide-y divide-border/50">
                       {tasks.map(task => (
                          <div 
                             key={task.id} 
                             className={cn(
                                "p-3 flex items-start gap-3 hover:bg-muted/30 transition-colors group relative cursor-pointer",
                                task.completed && "bg-muted/10"
                             )}
                             onClick={() => openTaskDetails(task)}
                          >
                             <button 
                                onClick={(e) => {
                                   e.stopPropagation();
                                   toggleTask(task.id);
                                }}
                                className={cn(
                                   "mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-200 shrink-0",
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
                                
                                {task.description && (
                                   <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{task.description}</p>
                                )}
                                
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                   <span className={cn(
                                      "text-[10px] px-1.5 py-0.5 rounded font-medium border",
                                      task.priority === "High" ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-300" : 
                                      task.priority === "Medium" ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300" : 
                                      "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/20 dark:text-slate-300"
                                   )}>
                                      {task.priority}
                                   </span>
                                   
                                   {task.tags && task.tags.map(tag => (
                                      <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/50">
                                         #{tag}
                                      </span>
                                   ))}

                                   <span className="text-[10px] text-muted-foreground flex items-center gap-1 ml-auto">
                                      <Briefcase className="w-3 h-3" /> {task.project.split(' ')[0]}
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
                 
                 <CardFooter className="pt-3 pb-3 border-t border-border/50 bg-muted/20 text-xs text-muted-foreground justify-center shrink-0">
                    {tasks.filter(t => t.completed).length} of {tasks.length} tasks completed
                 </CardFooter>
              </Card>
           </div>
        </div>

        {/* Task Details Dialog */}
        <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Task Details</DialogTitle>
            </DialogHeader>
            
            {selectedTask && (
              <div className="grid gap-4 py-4">
                <div className="flex items-center gap-3">
                   <button 
                      onClick={() => {
                        toggleTask(selectedTask.id);
                        setSelectedTask({...selectedTask, completed: !selectedTask.completed});
                      }}
                      className={cn(
                         "w-6 h-6 rounded-md border flex items-center justify-center transition-all duration-200",
                         selectedTask.completed 
                            ? "bg-emerald-500 border-emerald-500 text-white shadow-sm" 
                            : "border-muted-foreground/40 hover:border-emerald-500 hover:text-emerald-500"
                      )}
                   >
                      {selectedTask.completed && <CheckSquare className="w-4 h-4" />}
                   </button>
                   <Input 
                     value={selectedTask.title} 
                     className={cn("font-medium text-lg border-0 px-0 h-auto focus-visible:ring-0 shadow-none", selectedTask.completed && "line-through text-muted-foreground")}
                     onChange={(e) => setSelectedTask({...selectedTask, title: e.target.value})}
                   />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description" className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Description</Label>
                  <Textarea 
                    id="description" 
                    value={selectedTask.description || ""}
                    placeholder="Add more details..."
                    className="min-h-[100px] resize-none"
                    onChange={(e) => setSelectedTask({...selectedTask, description: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-2">
                      <Flag className="w-3 h-3" /> Priority
                    </Label>
                    <Select defaultValue={selectedTask.priority}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid gap-2">
                     <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-2">
                        <CalendarDays className="w-3 h-3" /> Due Date
                     </Label>
                     <Button variant="outline" className="justify-start font-normal text-left">
                        {selectedTask.due || "No date"}
                     </Button>
                  </div>
                </div>
                
                <div className="grid gap-2">
                   <Label className="text-xs text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-2">
                      <Tag className="w-3 h-3" /> Tags
                   </Label>
                   <div className="flex flex-wrap gap-2">
                      {selectedTask.tags?.map(tag => (
                         <Badge key={tag} variant="secondary" className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors">
                            {tag}
                         </Badge>
                      ))}
                      <Button variant="outline" size="sm" className="h-6 text-xs border-dashed">
                         + Add Tag
                      </Button>
                   </div>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button type="submit" onClick={() => setIsTaskDialogOpen(false)}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Project Dialog */}
        <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Project</DialogTitle>
            </DialogHeader>
            {selectedProject && (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="project-title">Project Title</Label>
                  <Input 
                    id="project-title" 
                    value={selectedProject.title} 
                    onChange={(e) => setSelectedProject({...selectedProject, title: e.target.value})}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="project-desc">Description</Label>
                  <Textarea 
                    id="project-desc" 
                    value={selectedProject.description || ""} 
                    className="min-h-[100px]"
                    onChange={(e) => setSelectedProject({...selectedProject, description: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="grid gap-2">
                      <Label>Status</Label>
                      <Select 
                        value={selectedProject.status} 
                        onValueChange={(val) => setSelectedProject({...selectedProject, status: val})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Planning">Planning</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Ongoing">Ongoing</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                   </div>
                   <div className="grid gap-2">
                      <Label>Deadline</Label>
                      <Input 
                         type="date"
                         value={selectedProject.deadline || ""}
                         onChange={(e) => setSelectedProject({...selectedProject, deadline: e.target.value})}
                      />
                   </div>
                </div>

                <div className="grid gap-2">
                   <div className="flex justify-between">
                      <Label>Progress ({selectedProject.progress}%)</Label>
                   </div>
                   <Progress value={selectedProject.progress} className="h-2" indicatorClassName={selectedProject.color} />
                   <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={selectedProject.progress} 
                      className="w-full mt-2"
                      onChange={(e) => setSelectedProject({...selectedProject, progress: parseInt(e.target.value)})}
                   />
                </div>

                <div className="grid gap-2">
                   <Label>Next Action</Label>
                   <div className="flex gap-2">
                      <Input 
                         value={selectedProject.nextAction || ""}
                         onChange={(e) => setSelectedProject({...selectedProject, nextAction: e.target.value})}
                         placeholder="What's the immediate next step?"
                      />
                   </div>
                </div>
                
                <div className="grid gap-2">
                   <Label>Tags</Label>
                   <div className="flex flex-wrap gap-2">
                      {selectedProject.tags?.map(tag => (
                         <Badge key={tag} variant="secondary">{tag}</Badge>
                      ))}
                      <Button variant="outline" size="sm" className="h-6 text-xs border-dashed">
                         + Add Tag
                      </Button>
                   </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => selectedProject && handleUpdateProject(selectedProject)}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Project Details Dialog */}
        <Dialog open={isProjectDetailsOpen} onOpenChange={setIsProjectDetailsOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
             <DialogHeader className="space-y-1">
                <div className="flex items-center gap-2">
                   <Badge 
                      variant="outline" 
                      className={cn("font-normal mr-2", 
                         selectedProject?.status === "In Progress" ? "bg-blue-50 text-blue-700 border-blue-200" : 
                         selectedProject?.status === "Planning" ? "bg-purple-50 text-purple-700 border-purple-200" :
                         "bg-emerald-50 text-emerald-700 border-emerald-200"
                      )}
                   >
                      {selectedProject?.status}
                   </Badge>
                   <DialogTitle className="text-xl">{selectedProject?.title}</DialogTitle>
                </div>
                <DialogDescription className="text-base text-muted-foreground">
                   {selectedProject?.description}
                </DialogDescription>
             </DialogHeader>

             {selectedProject && (
                <div className="space-y-6 py-4">
                   {/* Meta Grid */}
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/20 rounded-lg border border-border/50">
                      <div className="space-y-1">
                         <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Deadline</div>
                         <div className="text-sm font-medium flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {selectedProject.deadline || "Ongoing"}
                         </div>
                      </div>
                      <div className="space-y-1">
                         <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Time Left</div>
                         <div className="text-sm font-medium">
                            {selectedProject.deadline 
                               ? `${differenceInDays(new Date(selectedProject.deadline), new Date())} days` 
                               : "N/A"
                            }
                         </div>
                      </div>
                      <div className="space-y-1">
                         <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Progress</div>
                         <div className="text-sm font-medium">{selectedProject.progress}%</div>
                      </div>
                      <div className="space-y-1">
                         <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Tasks</div>
                         <div className="text-sm font-medium">
                            {tasks.filter(t => t.project === selectedProject.title).filter(t => t.completed).length} / {tasks.filter(t => t.project === selectedProject.title).length}
                         </div>
                      </div>
                   </div>

                   {/* Progress Section */}
                   <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                         <span className="font-medium">Project Progress</span>
                         <span className="text-muted-foreground">{selectedProject.progress}%</span>
                      </div>
                      <Progress value={selectedProject.progress} className="h-3" indicatorClassName={selectedProject.color} />
                   </div>

                   {/* Next Action */}
                   <div className="p-4 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50">
                      <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-medium mb-1">
                         <ArrowRight className="w-4 h-4" />
                         Next Action
                      </div>
                      <p className="text-sm text-indigo-600/90 dark:text-indigo-300/80 pl-6">
                         {selectedProject.nextAction}
                      </p>
                   </div>

                   {/* Project Tasks */}
                   <div className="space-y-3">
                      <div className="flex items-center justify-between">
                         <h3 className="font-semibold flex items-center gap-2">
                            <CheckSquare className="w-4 h-4" /> To-Do List
                         </h3>
                         <Button variant="ghost" size="sm" className="h-8" onClick={() => handleAddProjectTask(selectedProject.title)}>
                            <Plus className="w-3.5 h-3.5 mr-1" /> Add Task
                         </Button>
                      </div>
                      
                      <div className="border rounded-lg divide-y">
                         {tasks.filter(t => t.project === selectedProject.title).length > 0 ? (
                            tasks.filter(t => t.project === selectedProject.title).map(task => (
                               <div key={task.id} className="p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors group cursor-pointer" onClick={() => openTaskDetails(task)}>
                                  <button 
                                     onClick={(e) => {
                                        e.stopPropagation();
                                        toggleTask(task.id);
                                     }}
                                     className={cn(
                                        "w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0",
                                        task.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-muted-foreground/40 hover:border-emerald-500"
                                     )}
                                  >
                                     {task.completed && <CheckSquare className="w-3 h-3" />}
                                  </button>
                                  <div className="flex-1 min-w-0">
                                     <span className={cn("text-sm block truncate", task.completed && "line-through text-muted-foreground")}>
                                        {task.title}
                                     </span>
                                     <div className="flex items-center gap-2 mt-0.5">
                                        <span className={cn("text-[10px] flex items-center gap-1", 
                                           task.due === "Today" || task.due === format(new Date(), "yyyy-MM-dd") ? "text-rose-500 font-medium" : "text-muted-foreground"
                                        )}>
                                           <Calendar className="w-3 h-3" /> {task.due}
                                        </span>
                                     </div>
                                  </div>
                                  <Badge variant="outline" className="text-[10px] font-normal shrink-0">{task.priority}</Badge>
                               </div>
                            ))
                         ) : (
                            <div className="p-8 text-center text-muted-foreground text-sm">
                               No tasks created for this project yet.
                            </div>
                         )}
                      </div>
                   </div>

                   <div className="flex justify-end pt-4">
                      <Button onClick={() => setIsProjectDetailsOpen(false)}>Close</Button>
                   </div>
                </div>
             )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

