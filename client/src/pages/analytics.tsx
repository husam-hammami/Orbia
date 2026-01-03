import { useState } from "react";
import { Layout } from "@/components/layout";
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
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis
} from "recharts";
import { 
  BrainCircuit, 
  Utensils, 
  Briefcase, 
  TrendingUp, 
  Activity, 
  Zap, 
  Smile, 
  Frown,
  Meh,
  Calendar,
  CheckCircle2,
  Target,
  AlertCircle,
  CloudFog,
  MessageSquare,
  Flame,
  Battery,
  Lightbulb,
  Users,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Mock Data ---

const TRIGGER_HEATMAP_DATA: any[] = [];

const SOCIAL_BATTERY_DATA: any[] = [];

const CORRELATION_INSIGHTS = [
    { 
        id: 1, 
        title: "Sleep & Dissociation", 
        finding: "Sleep < 6h increases dissociation by 40%.",
        confidence: 92,
        trend: "negative"
    },
    { 
        id: 3, 
        title: "Productivity Zone", 
        finding: "Highest focus occurs 2h after protein-heavy meals.",
        confidence: 78,
        trend: "positive"
    }
];


const HABIT_DATA = [
  { name: "Mon", completed: 4, total: 6 },
  { name: "Tue", completed: 3, total: 6 },
  { name: "Wed", completed: 5, total: 6 },
  { name: "Thu", completed: 2, total: 6 },
  { name: "Fri", completed: 6, total: 6 },
  { name: "Sat", completed: 4, total: 6 },
  { name: "Sun", completed: 5, total: 6 },
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

const MOOD_DATA = [
  { name: "Mon", mood: 3, anxiety: 2, focus: 4 },
  { name: "Tue", mood: 4, anxiety: 1, focus: 5 },
  { name: "Wed", mood: 2, anxiety: 4, focus: 2 },
  { name: "Thu", mood: 3, anxiety: 3, focus: 3 },
  { name: "Fri", mood: 5, anxiety: 1, focus: 5 },
  { name: "Sat", mood: 4, anxiety: 2, focus: 4 },
  { name: "Sun", mood: 5, anxiety: 1, focus: 3 },
];

const FOOD_DATA = []; // Removed

const PROJECT_STATUS_DATA = [
  { name: 'In Progress', value: 3, color: '#3b82f6' },
  { name: 'Planning', value: 2, color: '#8b5cf6' },
  { name: 'Completed', value: 4, color: '#10b981' },
  { name: 'On Hold', value: 1, color: '#f59e0b' },
];

const NUTRITION_DISTRIBUTION = []; // Removed

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("weekly");

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500 pb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/40 pb-6">
          <div className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight">System Analytics</h1>
            <p className="text-muted-foreground text-lg">Comprehensive telemetry for your life OS.</p>
          </div>
          
          <div className="flex bg-muted/50 p-1 rounded-lg border border-border/50 self-start md:self-end">
            {["daily", "weekly", "monthly"].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-all capitalize",
                  timeRange === range
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Top Level KPIs */}
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

        {/* Mental & Mood Section (Primary Focus) */}
        <div className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2 border-b border-border/40 pb-2">
                <BrainCircuit className="w-5 h-5 text-indigo-500" />
                Mental State & Metrics
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-border/50 shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        Mental Telemetry
                    </CardTitle>
                    <CardDescription>Mood stability vs. Anxiety & Focus levels</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={MOOD_DATA}>
                            <defs>
                                <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorFocus" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                            <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: 'hsl(var(--background))' }}
                            />
                            <Area type="monotone" dataKey="mood" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorMood)" strokeWidth={2} name="Mood" />
                            <Area type="monotone" dataKey="focus" stroke="#10b981" fillOpacity={1} fill="url(#colorFocus)" strokeWidth={2} name="Focus" />
                            <Line type="monotone" dataKey="anxiety" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Anxiety" />
                        </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-6">
                <Card className="border-border/50 shadow-sm flex-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            Mood Distribution
                        </CardTitle>
                        <CardDescription>Weekly emotional summary</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center items-center">
                        <div className="h-[200px] w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Great', value: 30, color: '#10b981' },
                                        { name: 'Good', value: 45, color: '#3b82f6' },
                                        { name: 'Okay', value: 15, color: '#f59e0b' },
                                        { name: 'Low', value: 10, color: '#ef4444' },
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={70}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {[
                                        { name: 'Great', value: 30, color: '#10b981' },
                                        { name: 'Good', value: 45, color: '#3b82f6' },
                                        { name: 'Okay', value: 15, color: '#f59e0b' },
                                        { name: 'Low', value: 10, color: '#ef4444' },
                                    ].map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="text-center">
                                    <div className="text-2xl font-bold">4.2</div>
                                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Avg Score</div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="bg-muted/10 border-border/50">
                    <CardContent className="p-4">
                        <h4 className="font-semibold text-sm mb-3">Key Insights</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="flex gap-2 items-start">
                                <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                <span>Focus peaks on <strong>Tuesday</strong> mornings.</span>
                            </li>
                            <li className="flex gap-2 items-start">
                                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                <span>High anxiety correlates with missed meals on <strong>Wednesday</strong>.</span>
                            </li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
            </div>
        </div>

        {/* Detailed Metrics Breakdown */}
        <div className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2 border-b border-border/40 pb-2">
                <Activity className="w-5 h-5 text-indigo-500" />
                Physical & System Telemetry
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {/* Internal System Chart */}
               <Card className="border-border/50 shadow-sm">
                  <CardHeader>
                     <CardTitle className="flex items-center gap-2 text-base">
                        <CloudFog className="w-4 h-4 text-purple-500" />
                        Internal System State
                     </CardTitle>
                     <CardDescription>Dissociation & Communication levels</CardDescription>
                  </CardHeader>
                  <CardContent>
                     <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                           <LineChart data={DETAILED_METRICS}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                              <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                              <Tooltip 
                                 contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: 'hsl(var(--background))' }}
                              />
                              <Line type="monotone" dataKey="dissociation" stroke="#9333ea" strokeWidth={2} dot={{r:3}} name="Dissociation" />
                              <Line type="monotone" dataKey="communication" stroke="#6366f1" strokeWidth={2} dot={{r:3}} name="Communication" />
                              <Line type="step" dataKey="urges" stroke="#ef4444" strokeWidth={1} strokeDasharray="4 4" dot={false} name="Urge Intensity" />
                           </LineChart>
                        </ResponsiveContainer>
                     </div>
                  </CardContent>
               </Card>

               {/* Body Vitals Chart */}
               <Card className="border-border/50 shadow-sm">
                  <CardHeader>
                     <CardTitle className="flex items-center gap-2 text-base">
                        <Battery className="w-4 h-4 text-emerald-500" />
                        Body Vitals
                     </CardTitle>
                     <CardDescription>Energy, Sleep & Pain Correlation</CardDescription>
                  </CardHeader>
                  <CardContent>
                     <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={DETAILED_METRICS}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                              <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                              <Tooltip 
                                 cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                                 contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: 'hsl(var(--background))' }}
                              />
                              <Bar dataKey="energy" fill="#10b981" radius={[4, 4, 0, 0]} name="Energy" barSize={12} />
                              <Bar dataKey="sleep" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Sleep Quality" barSize={12} />
                              <Line type="monotone" dataKey="pain" stroke="#f59e0b" strokeWidth={2} dot={{r:3}} name="Pain Level" />
                           </BarChart>
                        </ResponsiveContainer>
                     </div>
                  </CardContent>
               </Card>
            </div>
        </div>

        {/* GENIUS INSIGHTS SECTION */}
        <div className="space-y-6">
             <h2 className="text-xl font-semibold flex items-center gap-2 border-b border-border/40 pb-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                Genius Insights & Predictions
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {CORRELATION_INSIGHTS.map(insight => (
                    <Card key={insight.id} className="border-l-4 border-l-primary border-border/50 shadow-sm bg-muted/5">
                        <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    {insight.trend === 'negative' ? (
                                        <AlertCircle className="w-4 h-4 text-rose-500" />
                                    ) : (
                                        <Zap className="w-4 h-4 text-amber-500" />
                                    )}
                                    <h4 className="font-semibold text-sm">{insight.title}</h4>
                                </div>
                                <Badge variant="outline" className="text-[10px] h-5 bg-background">
                                    {insight.confidence}% Confidence
                                </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground leading-snug">
                                {insight.finding}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
        
        {/* Habit Tracking (Secondary Focus) */}
        <div className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2 border-b border-border/40 pb-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Habit Tracking
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="col-span-2 border-border/50 shadow-sm">
                    <CardHeader>
                        <CardTitle>Habit Consistency</CardTitle>
                        <CardDescription>Daily completion vs Total habits</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={HABIT_DATA} barGap={0} barSize={32}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                                <Tooltip 
                                    cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: 'hsl(var(--background))' }}
                                />
                                <Bar dataKey="completed" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Completed" />
                                <Bar dataKey="total" fill="hsl(var(--muted)/0.3)" radius={[4, 4, 0, 0]} name="Total Target" />
                            </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
                
                 {/* Mini Stats for Habits */}
                 <div className="space-y-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="text-sm font-medium text-muted-foreground mb-1">Longest Streak</div>
                            <div className="text-2xl font-bold flex items-center gap-2">
                                12 Days <TrendingUp className="w-4 h-4 text-emerald-500" />
                            </div>
                            <div className="text-xs text-emerald-600 mt-1">Personal Best!</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="text-sm font-medium text-muted-foreground mb-1">Completion Rate</div>
                            <div className="text-2xl font-bold">82%</div>
                            <Progress value={82} className="h-1 mt-2" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="text-sm font-medium text-muted-foreground mb-1">Total Habits</div>
                            <div className="text-2xl font-bold">6 Active</div>
                        </CardContent>
                    </Card>
                 </div>
            </div>
        </div>

        {/* Other Metrics (Tertiary) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 opacity-80 hover:opacity-100 transition-opacity">
           <Card className="border-border/50 shadow-sm">
              <CardHeader>
                 <CardTitle className="flex items-center gap-2 text-base">
                    <Briefcase className="w-4 h-4 text-blue-500" />
                    Career Project Portfolio
                 </CardTitle>
                 <CardDescription>Project Status Overview</CardDescription>
              </CardHeader>
              <CardContent>
                 <div className="h-[200px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                          <Pie
                             data={PROJECT_STATUS_DATA}
                             cx="50%"
                             cy="50%"
                             innerRadius={60}
                             outerRadius={80}
                             paddingAngle={5}
                             dataKey="value"
                          >
                             {PROJECT_STATUS_DATA.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                             ))}
                          </Pie>
                          <Tooltip 
                             contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: 'hsl(var(--background))' }}
                          />
                          <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                       </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none -ml-24">
                        <div className="text-center">
                            <div className="text-2xl font-bold">10</div>
                            <div className="text-xs text-muted-foreground uppercase tracking-wide">Projects</div>
                        </div>
                    </div>
                 </div>
              </CardContent>
           </Card>
        </div>

      </div>
    </Layout>
  );
}
