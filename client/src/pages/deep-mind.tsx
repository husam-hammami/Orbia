import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  AreaChart, 
  Area, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell
} from "recharts";
import { 
  Brain, 
  Activity, 
  Radio, 
  Signal, 
  Database, 
  Users, 
  Zap, 
  AlertTriangle, 
  Fingerprint, 
  Network, 
  Mic2, 
  Eye, 
  Ghost,
  Cpu,
  Save,
  History,
  Sparkles,
  ArrowRight,
  Wifi,
  Layers,
  Search,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";

import { SYSTEM_MEMBERS, HEADSPACE_LOCATIONS } from "@/lib/mock-data";

// --- Advanced Mock Data ---

const RECENT_LOGS = [
  { time: "10:30 AM", dissociation: 30, stress: 45, front: "Host", note: "Meeting preparation" },
  { time: "12:15 PM", dissociation: 65, stress: 80, front: "Protector", note: "Triggered by loud noise" },
  { time: "02:45 PM", dissociation: 40, stress: 30, front: "Host", note: "Calming down" },
  { time: "05:00 PM", dissociation: 20, stress: 25, front: "Manager", note: "Wrapping up work" },
];

const SYSTEM_WAVEFORM = Array.from({ length: 50 }, (_, i) => ({
  time: i,
  noise: 30 + Math.random() * 40 + (Math.sin(i / 5) * 20),
  coherence: 50 + Math.cos(i / 8) * 30
}));

const SYSTEM_STATS = [
  { subject: 'Dissociation', A: 65, fullMark: 100 },
  { subject: 'Communication', A: 40, fullMark: 100 },
  { subject: 'Memory Access', A: 55, fullMark: 100 },
  { subject: 'Emotional Reg', A: 30, fullMark: 100 },
  { subject: 'Physical Grounding', A: 70, fullMark: 100 },
  { subject: 'Co-con', A: 45, fullMark: 100 },
];

const ALTER_POSITIONS = [
    { x: 50, y: 10, z: 100, name: 'Host', status: 'Fronting' },
    { x: 30, y: 40, z: 60, name: 'Protector', status: 'Co-con' },
    { x: 70, y: 40, z: 50, name: 'Manager', status: 'Watching' },
    { x: 20, y: 80, z: 20, name: 'Little', status: 'Deep Internal' },
    { x: 80, y: 80, z: 10, name: 'Gatekeeper', status: 'Deep Internal' },
];

const PREDICTIVE_PATTERNS = [
    { trigger: "High Caffeine", effect: "Rapid Switching", probability: 85 },
    { trigger: "Sleep < 5h", effect: "Amnesia Barriers Up", probability: 92 },
    { trigger: "Social Stress", effect: "Protector Fronting", probability: 78 },
];

export default function DeepMind() {
  const [activeTab, setActiveTab] = useState("monitor");
  
  // Input States
  const [dissociation, setDissociation] = useState([30]);
  const [stress, setStress] = useState([40]);
  const [communication, setCommunication] = useState([60]);
  const [urges, setUrges] = useState([10]);
  const [selectedAlter, setSelectedAlter] = useState(SYSTEM_MEMBERS[0]);
  const [location, setLocation] = useState("Fronting Room");
  const [isRecording, setIsRecording] = useState(false);

  // Simulated live data effect
  const [waveform, setWaveform] = useState(SYSTEM_WAVEFORM);
  useEffect(() => {
    const interval = setInterval(() => {
        setWaveform(prev => {
            const next = [...prev.slice(1), {
                time: prev[prev.length - 1].time + 1,
                noise: 30 + Math.random() * 40 + (Math.sin(Date.now() / 1000) * 20),
                coherence: 50 + Math.cos(Date.now() / 2000) * 30
            }];
            return next;
        });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500 pb-20">
        
        {/* Deep Mind Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-6">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 px-2 py-0.5 text-xs font-mono uppercase tracking-wider">
                        Deep Mind v4.0
                    </Badge>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-2 py-0.5 text-xs font-mono uppercase tracking-wider flex items-center gap-1.5">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                        </span>
                        System Online
                    </Badge>
                </div>
                <h1 className="text-3xl font-display font-bold tracking-tight">Cortex Interface</h1>
                <p className="text-muted-foreground text-sm">Advanced system telemetry and headspace mapping.</p>
            </div>

            <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-lg border border-border/50">
                <div className="text-right px-2 border-r border-border/50">
                    <div className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">System Noise</div>
                    <div className="text-lg font-mono font-bold text-rose-400">42%</div>
                </div>
                <div className="text-right px-2">
                    <div className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Coherence</div>
                    <div className="text-lg font-mono font-bold text-indigo-400">89%</div>
                </div>
            </div>
        </div>

        <Tabs defaultValue="monitor" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-muted/30 border border-border/50 p-1">
                <TabsTrigger value="monitor" className="gap-2"><Activity className="w-4 h-4" /> Live Monitor</TabsTrigger>
                <TabsTrigger value="analysis" className="gap-2"><Brain className="w-4 h-4" /> Analysis & Patterns</TabsTrigger>
                <TabsTrigger value="map" className="gap-2"><Network className="w-4 h-4" /> Headspace Map</TabsTrigger>
            </TabsList>

            {/* LIVE MONITOR TAB */}
            <TabsContent value="monitor" className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* LEFT COLUMN: Input Console */}
                    <Card className="lg:col-span-4 border-l-4 border-l-indigo-500 shadow-lg">
                        <CardHeader className="bg-muted/10 pb-4">
                            <CardTitle className="flex items-center justify-between text-lg">
                                <span>Neural Logger</span>
                                <Cpu className="w-4 h-4 text-indigo-500 animate-pulse" />
                            </CardTitle>
                            <CardDescription>Log current system parameters</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            
                            {/* Who is Fronting? */}
                            <div className="space-y-3">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <Users className="w-3.5 h-3.5" /> Active Front
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {SYSTEM_MEMBERS.slice(0, 6).map(member => (
                                        <button
                                            key={member.id}
                                            onClick={() => setSelectedAlter(member)}
                                            className={cn(
                                                "text-xs p-2 rounded border transition-all text-center font-medium truncate",
                                                selectedAlter.id === member.id 
                                                    ? "bg-indigo-500 text-white border-indigo-600 shadow-md transform scale-105" 
                                                    : "bg-background border-border hover:bg-muted text-muted-foreground"
                                            )}
                                            style={{ 
                                                borderColor: selectedAlter.id === member.id ? member.color : undefined,
                                                backgroundColor: selectedAlter.id === member.id ? member.color : undefined
                                            }}
                                        >
                                            {member.name}
                                        </button>
                                    ))}
                                    <button className="text-xs p-2 rounded border border-dashed border-border text-muted-foreground hover:bg-muted flex items-center justify-center">
                                        <Plus className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>

                            {/* Sliders */}
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-medium">
                                        <span className="flex items-center gap-1.5"><Ghost className="w-3.5 h-3.5 text-purple-500" /> Dissociation</span>
                                        <span className="font-mono">{dissociation}%</span>
                                    </div>
                                    <Slider value={dissociation} onValueChange={setDissociation} max={100} step={1} className="[&>span:first-child]:bg-purple-500/20 [&_[role=slider]]:bg-purple-500" />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-medium">
                                        <span className="flex items-center gap-1.5"><Mic2 className="w-3.5 h-3.5 text-blue-500" /> Communication</span>
                                        <span className="font-mono">{communication}%</span>
                                    </div>
                                    <Slider value={communication} onValueChange={setCommunication} max={100} step={1} className="[&>span:first-child]:bg-blue-500/20 [&_[role=slider]]:bg-blue-500" />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-medium">
                                        <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-500" /> System Stress</span>
                                        <span className="font-mono">{stress}%</span>
                                    </div>
                                    <Slider value={stress} onValueChange={setStress} max={100} step={1} className="[&>span:first-child]:bg-amber-500/20 [&_[role=slider]]:bg-amber-500" />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-medium">
                                        <span className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> Intrusive Urges</span>
                                        <span className="font-mono">{urges}%</span>
                                    </div>
                                    <Slider value={urges} onValueChange={setUrges} max={100} step={1} className="[&>span:first-child]:bg-rose-500/20 [&_[role=slider]]:bg-rose-500" />
                                </div>
                            </div>
                            
                            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20" size="lg">
                                <Save className="w-4 h-4 mr-2" /> Commit System Log
                            </Button>
                        </CardContent>
                    </Card>

                    {/* RIGHT COLUMN: Visualizations */}
                    <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Live Waveform */}
                        <Card className="md:col-span-2 bg-slate-950 border-slate-800 shadow-2xl overflow-hidden relative group">
                            <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f46e520_1px,transparent_1px),linear-gradient(to_bottom,#4f46e520_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
                            <CardHeader className="relative z-10 pb-2">
                                <CardTitle className="text-slate-100 flex items-center gap-2 text-base font-mono">
                                    <Activity className="w-4 h-4 text-emerald-400" /> Real-time System Coherence
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="h-[250px] relative z-10 pl-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={waveform}>
                                        <defs>
                                            <linearGradient id="colorNoise" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                            </linearGradient>
                                            <linearGradient id="colorCoherence" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                        <XAxis dataKey="time" hide />
                                        <YAxis hide domain={[0, 100]} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                                            itemStyle={{ fontSize: '12px' }}
                                        />
                                        <Area type="monotone" dataKey="noise" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorNoise)" name="Noise/Chaos" isAnimationActive={false} />
                                        <Area type="monotone" dataKey="coherence" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorCoherence)" name="Stability" isAnimationActive={false} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Recent History List */}
                        <Card className="flex flex-col">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <History className="w-4 h-4 text-muted-foreground" />
                                    Recent Logs
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 p-0">
                                <ScrollArea className="h-[250px] px-4">
                                    <div className="space-y-4 pb-4">
                                        {RECENT_LOGS.map((log, i) => (
                                            <div key={i} className="flex gap-3 items-start p-3 rounded-lg bg-muted/30 border border-border/50 text-sm">
                                                <div className="min-w-[60px] font-mono text-xs text-muted-foreground pt-0.5">{log.time}</div>
                                                <div className="space-y-1 flex-1">
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-semibold text-indigo-500">{log.front}</span>
                                                        <Badge variant="outline" className="text-[10px] h-4 px-1">Dis: {log.dissociation}%</Badge>
                                                    </div>
                                                    <p className="text-muted-foreground text-xs leading-snug">{log.note}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        {/* System Radar Chart */}
                        <Card>
                             <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Layers className="w-4 h-4 text-muted-foreground" />
                                    System Balance
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="h-[250px] flex items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={SYSTEM_STATS}>
                                        <PolarGrid stroke="#e2e8f0" strokeOpacity={0.5} />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                        <Radar
                                            name="System State"
                                            dataKey="A"
                                            stroke="#8b5cf6"
                                            strokeWidth={2}
                                            fill="#8b5cf6"
                                            fillOpacity={0.3}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                    </div>
                </div>
            </TabsContent>

            {/* ANALYSIS TAB */}
            <TabsContent value="analysis" className="animate-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Search className="w-5 h-5 text-indigo-500" />
                                Pattern Recognition Engine
                            </CardTitle>
                            <CardDescription>AI-detected correlations between triggers and system responses.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-600 dark:text-blue-400 flex items-start gap-2">
                                <Activity className="w-4 h-4 shrink-0 mt-0.5" />
                                <div>
                                    <strong>High-Resolution Analysis Active:</strong> Deep Mind is analyzing intra-day variance. 
                                    Fluctuations in stress and dissociation throughout the day are weighted heavily to prevent data flattening.
                                </div>
                            </div>
                            <div className="space-y-4">
                                {PREDICTIVE_PATTERNS.map((pattern, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/10 hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-bold text-xs">
                                                {pattern.probability}%
                                            </div>
                                            <div>
                                                <div className="font-semibold text-sm flex items-center gap-2">
                                                    {pattern.trigger} 
                                                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                                    <span className="text-indigo-600 dark:text-indigo-400">{pattern.effect}</span>
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-0.5">Confidence Level: High</div>
                                            </div>
                                        </div>
                                        <Badge variant="outline">Detected</Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Fingerprint className="w-5 h-5 text-purple-500" />
                                Identity Fragment Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 rounded-lg bg-purple-500/5 border border-purple-500/10">
                                <div className="text-xs font-bold text-purple-500 uppercase mb-2">Most Active (7 Days)</div>
                                <div className="flex items-center gap-3">
                                    <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                                        <Users className="w-6 h-6 text-slate-400" />
                                    </div>
                                    <div>
                                        <div className="font-bold">The Protector</div>
                                        <div className="text-xs text-muted-foreground">Fronting 45% of time</div>
                                    </div>
                                </div>
                            </div>
                             <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/10">
                                <div className="text-xs font-bold text-amber-500 uppercase mb-2">Needs Attention</div>
                                <div className="flex items-center gap-3">
                                    <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                                        <Ghost className="w-6 h-6 text-slate-400" />
                                    </div>
                                    <div>
                                        <div className="font-bold">Little</div>
                                        <div className="text-xs text-muted-foreground">High stress signals detected</div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>

            {/* HEADSPACE MAP TAB */}
            <TabsContent value="map" className="animate-in slide-in-from-bottom-4 duration-500">
                <Card className="bg-slate-950 border-slate-800 overflow-hidden relative min-h-[500px]">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
                    <CardHeader className="relative z-10 border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-slate-100 flex items-center gap-2">
                                <Network className="w-5 h-5 text-indigo-400" /> 
                                Topographical System Map
                            </CardTitle>
                            <div className="flex gap-4 text-xs text-slate-400 font-mono">
                                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> Front</div>
                                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-slate-600"></span> Deep Internal</div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 relative h-[500px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                                <XAxis type="number" dataKey="x" name="stiffness" hide domain={[0, 100]} />
                                <YAxis type="number" dataKey="y" name="stiffness" hide domain={[0, 100]} />
                                <ZAxis type="number" dataKey="z" range={[60, 400]} name="score" />
                                <Tooltip 
                                    cursor={{ strokeDasharray: '3 3' }} 
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-slate-900 border border-indigo-500/50 p-3 rounded shadow-xl text-slate-100">
                                                    <p className="font-bold mb-1">{data.name}</p>
                                                    <p className="text-xs text-indigo-300">{data.status}</p>
                                                    <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wide">Proximity: {data.z}%</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Scatter name="Alters" data={ALTER_POSITIONS} fill="#8884d8">
                                    {ALTER_POSITIONS.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.status === 'Fronting' ? '#6366f1' : entry.status === 'Co-con' ? '#a855f7' : '#64748b'} />
                                    ))}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                        
                        {/* Overlay concentric rings for 'Fronting' visualization */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-10">
                            <div className="w-[200px] h-[200px] rounded-full border border-indigo-500"></div>
                            <div className="absolute w-[400px] h-[400px] rounded-full border border-indigo-500"></div>
                            <div className="absolute w-[600px] h-[600px] rounded-full border border-indigo-500"></div>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

        </Tabs>
      </div>
    </Layout>
  );
}