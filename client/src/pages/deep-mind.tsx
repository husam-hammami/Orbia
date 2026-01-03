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

// Replaced simulated waveform with placeholder
const SYSTEM_WAVEFORM = []; 

const SYSTEM_STATS: any[] = [
  { subject: 'Dissociation', A: 0, fullMark: 100 },
  { subject: 'Communication', A: 0, fullMark: 100 },
  { subject: 'Memory Access', A: 0, fullMark: 100 },
  { subject: 'Emotional Reg', A: 0, fullMark: 100 },
  { subject: 'Physical Grounding', A: 0, fullMark: 100 },
  { subject: 'Co-con', A: 0, fullMark: 100 },
];

const ALTER_POSITIONS: any[] = [];

const PREDICTIVE_PATTERNS: any[] = [];

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

  // Removed simulated live data effect
  const [waveform, setWaveform] = useState([]);


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
                    <div className="text-lg font-mono font-bold text-muted-foreground">--</div>
                </div>
                <div className="text-right px-2">
                    <div className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Coherence</div>
                    <div className="text-lg font-mono font-bold text-muted-foreground">--</div>
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
                            <CardContent className="h-[250px] relative z-10 pl-0 flex items-center justify-center">
                                <div className="text-center space-y-2">
                                    <Activity className="w-8 h-8 text-slate-700 mx-auto animate-pulse" />
                                    <p className="text-slate-500 text-sm">Awaiting Data Points</p>
                                    <p className="text-slate-600 text-xs">Log multiple entries to visualize coherence trends.</p>
                                </div>
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
                            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                                <Search className="w-12 h-12 text-muted-foreground/20" />
                                <p className="text-muted-foreground text-sm font-medium">No Patterns Detected Yet</p>
                                <p className="text-muted-foreground/60 text-xs max-w-xs">
                                    Pattern recognition requires at least 3-5 days of consistent logging.
                                    Continue logging daily mood, stress, and dissociation levels.
                                </p>
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
                            <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
                                <Users className="w-10 h-10 text-muted-foreground/20" />
                                <p className="text-sm text-muted-foreground">Insufficient Data</p>
                                <p className="text-xs text-muted-foreground/60">
                                    Log "Who is Fronting" consistently to enable fragment analysis.
                                </p>
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