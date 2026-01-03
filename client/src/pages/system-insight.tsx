import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  LineChart, 
  Line,
  ScatterChart, 
  Scatter, 
  ZAxis,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  BarChart,
  Bar,
  Legend
} from "recharts";
import { 
  BrainCircuit, 
  Fingerprint, 
  Activity, 
  Radio, 
  Zap, 
  CloudFog, 
  MessageSquare, 
  Users, 
  Clock,
  AlertTriangle,
  Sparkles,
  ShieldAlert,
  Puzzle,
  GitGraph,
  ThermometerSnowflake,
  Network
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Mock Data for System Insights ---

const SYSTEM_TIMELINE = [
  { time: "08:00", fronter: "Host", intensity: 8, mood: "Calm", stress: 2, trigger: null },
  { time: "10:30", fronter: "Protector", intensity: 6, mood: "Alert", stress: 6, trigger: "Work Email" },
  { time: "12:00", fronter: "Host", intensity: 7, mood: "Tired", stress: 4, trigger: null },
  { time: "14:15", fronter: "Little", intensity: 4, mood: "Anxious", stress: 7, trigger: "Loud Noise" },
  { time: "15:00", fronter: "Protector", intensity: 9, mood: "Defensive", stress: 8, trigger: "Conflict" },
  { time: "18:00", fronter: "Host", intensity: 6, mood: "Relaxed", stress: 3, trigger: null },
  { time: "21:00", fronter: "Gatekeeper", intensity: 5, mood: "Neutral", stress: 2, trigger: "Night Routine" },
];

const DISSOCIATION_CORRELATION = [
  { stress: 2, dissociation: 1, pain: 1, comms: 8 },
  { stress: 3, dissociation: 2, pain: 2, comms: 7 },
  { stress: 5, dissociation: 4, pain: 3, comms: 6 },
  { stress: 7, dissociation: 6, pain: 5, comms: 4 },
  { stress: 8, dissociation: 8, pain: 4, comms: 2 },
  { stress: 9, dissociation: 9, pain: 7, comms: 1 },
  { stress: 6, dissociation: 5, pain: 4, comms: 5 },
  { stress: 4, dissociation: 3, pain: 2, comms: 7 },
];

const SYSTEM_HEALTH_RADAR = [
  { subject: 'Communication', A: 65, fullMark: 100 },
  { subject: 'Memory Access', A: 45, fullMark: 100 },
  { subject: 'Emotional Reg', A: 70, fullMark: 100 },
  { subject: 'Dissociation Control', A: 50, fullMark: 100 },
  { subject: 'Switch Stability', A: 80, fullMark: 100 },
  { subject: 'Co-con', A: 60, fullMark: 100 },
];

const URGE_PATTERNS = [
  { time: "Morning", value: 20 },
  { time: "Noon", value: 35 },
  { time: "Afternoon", value: 65 }, // Spike
  { time: "Evening", value: 45 },
  { time: "Night", value: 80 }, // Spike
];

const ALTER_STATS = [
  { name: "Host", timeFronting: 65, avgStress: 4, role: "Daily Life" },
  { name: "Protector", timeFronting: 20, avgStress: 7, role: "Defense" },
  { name: "Little", timeFronting: 10, avgStress: 6, role: "Emotional" },
  { name: "Gatekeeper", timeFronting: 5, avgStress: 2, role: "System Mgmt" },
];

export default function SystemInsight() {
  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/40 pb-6">
          <div className="space-y-1">
             <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="border-purple-500/30 text-purple-600 bg-purple-500/5 gap-1">
                    <BrainCircuit className="w-3 h-3" /> System OS v2.4
                </Badge>
                <Badge variant="outline" className="border-blue-500/30 text-blue-600 bg-blue-500/5 gap-1">
                    <Users className="w-3 h-3" /> 4 Active Alters
                </Badge>
             </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight">System Insight Engine</h1>
            <p className="text-muted-foreground text-lg">Deep diagnostic telemetry for Dissociative Identity & System coherence.</p>
          </div>
        </div>

        {/* Top Level System Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Current Front Status */}
            <Card className="bg-gradient-to-br from-indigo-500/10 via-background to-background border-indigo-500/20 relative overflow-hidden">
                <div className="absolute right-0 top-0 p-3 opacity-10">
                    <Fingerprint className="w-32 h-32" />
                </div>
                <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2 text-indigo-600 font-medium">
                        <Activity className="w-4 h-4" /> Current Front
                    </CardDescription>
                    <CardTitle className="text-3xl font-bold">Host</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Co-Conscious</span>
                            <span className="font-medium text-foreground">Protector</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Switch Risk</span>
                            <span className="font-medium text-emerald-600">Low</span>
                        </div>
                        <Progress value={20} className="h-1 bg-indigo-500/10" indicatorClassName="bg-indigo-500" />
                    </div>
                </CardContent>
            </Card>

            {/* System Harmony Score */}
            <Card className="border-border/50">
                <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2 text-emerald-600 font-medium">
                        <Network className="w-4 h-4" /> System Harmony
                    </CardDescription>
                    <CardTitle className="text-3xl font-bold flex items-baseline gap-2">
                        68% <span className="text-sm font-normal text-muted-foreground">Stable</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                   <div className="h-[80px] w-full mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={DISSOCIATION_CORRELATION}>
                                <defs>
                                    <linearGradient id="colorHarmony" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <Area type="monotone" dataKey="comms" stroke="#10b981" strokeWidth={2} fill="url(#colorHarmony)" />
                            </AreaChart>
                        </ResponsiveContainer>
                   </div>
                </CardContent>
            </Card>

             {/* Dissociation Warning */}
             <Card className="border-border/50">
                <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2 text-purple-600 font-medium">
                        <CloudFog className="w-4 h-4" /> Dissociation Index
                    </CardDescription>
                    <CardTitle className="text-3xl font-bold flex items-baseline gap-2">
                        4/10 <span className="text-sm font-normal text-muted-foreground">Moderate</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4 mt-2">
                        <div className="flex-1 bg-muted/20 rounded-lg p-2 text-center border border-border/50">
                            <div className="text-xs text-muted-foreground uppercase tracking-wider">Trend</div>
                            <div className="font-bold text-rose-500 flex items-center justify-center gap-1">
                                <TrendingUp className="w-3 h-3" /> Rising
                            </div>
                        </div>
                        <div className="flex-1 bg-muted/20 rounded-lg p-2 text-center border border-border/50">
                            <div className="text-xs text-muted-foreground uppercase tracking-wider">Trigger</div>
                            <div className="font-bold">Stress</div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="bg-muted/30 p-1 border border-border/40">
                <TabsTrigger value="overview" className="gap-2"><Activity className="w-4 h-4" /> Overview</TabsTrigger>
                <TabsTrigger value="correlations" className="gap-2"><GitGraph className="w-4 h-4" /> Correlations</TabsTrigger>
                <TabsTrigger value="alters" className="gap-2"><Users className="w-4 h-4" /> Alter Stats</TabsTrigger>
            </TabsList>

            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Fronting Timeline - The core of the page */}
                    <Card className="lg:col-span-2 border-border/50 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="w-5 h-5 text-indigo-500" /> Daily Fronting Timeline
                            </CardTitle>
                            <CardDescription>Visual history of switches, mood, and intensity throughout the day.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="relative border-l-2 border-indigo-500/20 ml-4 space-y-8 py-4">
                                {SYSTEM_TIMELINE.map((event, i) => (
                                    <div key={i} className="relative pl-8 group">
                                        <div className={cn(
                                            "absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 bg-background transition-all group-hover:scale-125",
                                            event.fronter === "Host" ? "border-indigo-500" :
                                            event.fronter === "Protector" ? "border-rose-500" :
                                            event.fronter === "Little" ? "border-amber-500" : "border-slate-500"
                                        )} />
                                        
                                        <div className="bg-muted/10 p-4 rounded-xl border border-border/50 hover:border-indigo-500/30 transition-all">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-sm text-muted-foreground">{event.time}</span>
                                                        <Badge variant="secondary" className={cn(
                                                            "font-semibold",
                                                            event.fronter === "Host" ? "bg-indigo-500/10 text-indigo-600" :
                                                            event.fronter === "Protector" ? "bg-rose-500/10 text-rose-600" :
                                                            event.fronter === "Little" ? "bg-amber-500/10 text-amber-600" : "bg-slate-500/10 text-slate-600"
                                                        )}>
                                                            {event.fronter}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs">
                                                     <span className="text-muted-foreground">Stress: {event.stress}/10</span>
                                                     {event.stress > 6 && <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-wrap gap-4 text-sm">
                                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                                    <Smile className="w-3.5 h-3.5" /> {event.mood}
                                                </div>
                                                {event.trigger && (
                                                    <div className="flex items-center gap-1.5 text-rose-500/80 font-medium">
                                                        <Zap className="w-3.5 h-3.5" /> {event.trigger}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* System Health Radar */}
                    <div className="space-y-6">
                        <Card className="border-border/50 shadow-sm h-full">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ShieldAlert className="w-5 h-5 text-emerald-500" /> System Resilience
                                </CardTitle>
                                <CardDescription>Balance across key functional areas.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={SYSTEM_HEALTH_RADAR}>
                                            <PolarGrid stroke="hsl(var(--border))" />
                                            <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                            <Radar
                                                name="System Health"
                                                dataKey="A"
                                                stroke="#10b981"
                                                fill="#10b981"
                                                fillOpacity={0.3}
                                            />
                                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: 'hsl(var(--background))' }} />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="mt-4 p-3 bg-muted/20 rounded-lg text-xs text-muted-foreground border border-border/50">
                                    <strong>Insight:</strong> Your "Communication" score is rising, which directly correlates with reduced Dissociation events this week. Keep journaling.
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </TabsContent>

            {/* CORRELATIONS TAB */}
            <TabsContent value="correlations" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                     {/* Stress vs Dissociation */}
                     <Card className="border-border/50 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ThermometerSnowflake className="w-5 h-5 text-rose-500" /> Stress vs. Dissociation
                            </CardTitle>
                            <CardDescription>Analyzing how stress levels impact system dissociation.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                        <XAxis type="number" dataKey="stress" name="Stress" unit="/10" tick={{ fill: 'hsl(var(--muted-foreground))' }} label={{ value: 'Stress Load', position: 'insideBottom', offset: -10, fill: 'hsl(var(--muted-foreground))' }} />
                                        <YAxis type="number" dataKey="dissociation" name="Dissociation" unit="/10" tick={{ fill: 'hsl(var(--muted-foreground))' }} label={{ value: 'Dissociation Level', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }} />
                                        <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: 'hsl(var(--background))' }} />
                                        <Scatter name="Correlation" data={DISSOCIATION_CORRELATION} fill="#8b5cf6" />
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                     </Card>

                     {/* Communication vs Stability */}
                     <Card className="border-border/50 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-blue-500" /> Communication Effect
                            </CardTitle>
                            <CardDescription>Impact of system communication on stability.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={DISSOCIATION_CORRELATION}>
                                        <defs>
                                            <linearGradient id="colorComms" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                        <XAxis dataKey="comms" name="Communication" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                                        <YAxis name="Stability" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: 'hsl(var(--background))' }} />
                                        <Area type="monotone" dataKey="pain" stroke="#3b82f6" fillOpacity={1} fill="url(#colorComms)" name="Pain/Instability" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                     </Card>
                </div>
            </TabsContent>

             {/* ALTER STATS TAB */}
             <TabsContent value="alters" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {ALTER_STATS.map(alter => (
                        <Card key={alter.name} className="border-border/50 hover:border-primary/50 transition-all cursor-pointer group">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex justify-between items-center text-lg">
                                    {alter.name}
                                    <Badge variant="secondary" className="text-[10px] font-normal opacity-70 group-hover:opacity-100">{alter.role}</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                            <span>Time Fronting</span>
                                            <span>{alter.timeFronting}%</span>
                                        </div>
                                        <Progress value={alter.timeFronting} className="h-1.5" />
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                            <span>Avg Stress Load</span>
                                            <span className={cn(alter.avgStress > 5 ? "text-rose-500" : "text-emerald-500")}>{alter.avgStress}/10</span>
                                        </div>
                                        <div className="flex gap-1 h-1.5">
                                            {[...Array(10)].map((_, i) => (
                                                <div key={i} className={cn(
                                                    "flex-1 rounded-full",
                                                    i < alter.avgStress ? (alter.avgStress > 5 ? "bg-rose-500" : "bg-emerald-500") : "bg-muted"
                                                )} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                 </div>

                 {/* Urge Timing */}
                 <Card className="border-border/50 shadow-sm mt-6">
                     <CardHeader>
                         <CardTitle className="flex items-center gap-2">
                             <Puzzle className="w-5 h-5 text-amber-500" /> Behavioral Patterns
                         </CardTitle>
                         <CardDescription>When do urges or switches typically occur?</CardDescription>
                     </CardHeader>
                     <CardContent>
                         <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={URGE_PATTERNS}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                                    <Tooltip cursor={{ fill: 'hsl(var(--muted)/0.2)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: 'hsl(var(--background))' }} />
                                    <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Urge Intensity" />
                                </BarChart>
                            </ResponsiveContainer>
                         </div>
                     </CardContent>
                 </Card>
             </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

// Missing icons import fix
import { Smile, TrendingUp } from "lucide-react";
