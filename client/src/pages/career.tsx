import { useState } from "react";
import { Layout } from "@/components/layout";
import { Plus, Target, Rocket, Calendar, CheckSquare, MoreHorizontal, ArrowRight, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// Mock Data
const MOCK_PROJECTS = [
  { id: 1, title: "Website Redesign", status: "In Progress", progress: 65, deadline: "2024-02-15", color: "bg-blue-500" },
  { id: 2, title: "Q1 Marketing Plan", status: "Planning", progress: 20, deadline: "2024-01-30", color: "bg-purple-500" },
  { id: 3, title: "Learning React", status: "Ongoing", progress: 45, deadline: null, color: "bg-green-500" },
];

const MOCK_TASKS = [
  { id: 1, title: "Draft homepage copy", project: "Website Redesign", completed: false, priority: "High" },
  { id: 2, title: "Select color palette", project: "Website Redesign", completed: true, priority: "Medium" },
  { id: 3, title: "Research competitors", project: "Q1 Marketing Plan", completed: false, priority: "Medium" },
  { id: 4, title: "Complete tutorial #4", project: "Learning React", completed: false, priority: "Low" },
];

const MOCK_VISION = [
  { id: 1, text: "Become a Senior Frontend Developer", timeframe: "Long-term" },
  { id: 2, text: "Launch a personal side project", timeframe: "This Year" },
  { id: 3, text: "Build a consistent deep work habit", timeframe: "Ongoing" },
];

export default function CareerPage() {
  const [projects, setProjects] = useState(MOCK_PROJECTS);
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const [vision, setVision] = useState(MOCK_VISION);
  const [activeTab, setActiveTab] = useState<"overview" | "projects" | "vision">("overview");

  const toggleTask = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 text-muted-foreground">
               <Briefcase className="w-4 h-4" />
               <span className="font-medium text-sm">Professional</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              Career & Vision
            </h1>
          </div>
          
          <div className="flex gap-2">
             <Button variant="outline" className="gap-2">
                <Target className="w-4 h-4" /> Add Goal
             </Button>
             <Button className="gap-2">
                <Plus className="w-4 h-4" /> New Project
             </Button>
          </div>
        </div>

        {/* Vision Board (Top Section) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <Card className="md:col-span-2 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-background border-indigo-100 dark:border-indigo-900/50">
              <CardHeader className="pb-2">
                 <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                       <Rocket className="w-5 h-5 text-indigo-500" />
                       North Star Vision
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="text-xs h-8">Edit</Button>
                 </div>
              </CardHeader>
              <CardContent>
                 <div className="space-y-3 mt-2">
                    {vision.map(v => (
                       <div key={v.id} className="flex items-start gap-3 p-3 bg-white/60 dark:bg-black/20 rounded-lg border border-indigo-100/50 dark:border-indigo-900/30">
                          <Target className="w-4 h-4 text-indigo-400 mt-0.5" />
                          <div>
                             <p className="font-medium text-sm">{v.text}</p>
                             <p className="text-xs text-muted-foreground mt-0.5">{v.timeframe}</p>
                          </div>
                       </div>
                    ))}
                 </div>
              </CardContent>
           </Card>

           <Card className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background border-emerald-100 dark:border-emerald-900/50 flex flex-col justify-center items-center text-center p-6">
               <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mb-4">
                  <CheckSquare className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
               </div>
               <h3 className="font-bold text-2xl text-emerald-900 dark:text-emerald-100">{tasks.filter(t => t.completed).length} / {tasks.length}</h3>
               <p className="text-sm text-emerald-700/80 dark:text-emerald-300/80 font-medium">Tasks Completed</p>
               <div className="w-full mt-4">
                  <Progress value={(tasks.filter(t => t.completed).length / tasks.length) * 100} className="h-2" />
               </div>
           </Card>
        </div>

        {/* Projects & Tasks Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           
           {/* Projects Column */}
           <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                 <h2 className="text-xl font-display font-semibold">Active Projects</h2>
                 <Button variant="ghost" size="sm">View All</Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {projects.map(project => (
                    <Card key={project.id} className="hover:shadow-md transition-shadow cursor-pointer border-l-4" style={{ borderLeftColor: project.color.replace('bg-', '') }}>
                       <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                             <CardTitle className="text-base">{project.title}</CardTitle>
                             <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <CardDescription className="flex items-center gap-2 text-xs">
                             <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted uppercase tracking-wide")}>
                                {project.status}
                             </span>
                             {project.deadline && (
                                <span className="flex items-center gap-1 text-muted-foreground">
                                   <Calendar className="w-3 h-3" />
                                   {project.deadline}
                                </span>
                             )}
                          </CardDescription>
                       </CardHeader>
                       <CardContent className="pb-4">
                          <div className="flex justify-between text-xs mb-1.5 font-medium text-muted-foreground">
                             <span>Progress</span>
                             <span>{project.progress}%</span>
                          </div>
                          <Progress value={project.progress} className="h-1.5" />
                       </CardContent>
                    </Card>
                 ))}
                 
                 <button className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-muted rounded-xl hover:bg-muted/30 transition-colors h-full min-h-[140px]">
                    <Plus className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="text-sm font-medium text-muted-foreground">Create New Project</span>
                 </button>
              </div>
           </div>

           {/* Tasks Column */}
           <div className="space-y-6">
              <div className="flex items-center justify-between">
                 <h2 className="text-xl font-display font-semibold">Focus Tasks</h2>
                 <Button variant="ghost" size="sm">Add Task</Button>
              </div>

              <div className="bg-card rounded-xl border border-border divide-y divide-border">
                 {tasks.map(task => (
                    <div key={task.id} className="p-4 flex items-start gap-3 hover:bg-muted/20 transition-colors group">
                       <button 
                          onClick={() => toggleTask(task.id)}
                          className={cn(
                             "mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors",
                             task.completed ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground hover:border-primary"
                          )}
                       >
                          {task.completed && <CheckSquare className="w-3.5 h-3.5" />}
                       </button>
                       <div className="flex-1 min-w-0">
                          <p className={cn("text-sm font-medium leading-none truncate", task.completed && "line-through text-muted-foreground")}>
                             {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                             <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground truncate max-w-[100px]">
                                {task.project}
                             </span>
                             <span className={cn(
                                "text-[10px] font-medium",
                                task.priority === "High" ? "text-red-500" : task.priority === "Medium" ? "text-orange-500" : "text-blue-500"
                             )}>
                                {task.priority}
                             </span>
                          </div>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </Layout>
  );
}
