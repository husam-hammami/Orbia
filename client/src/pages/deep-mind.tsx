import { useState, useEffect } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ResponsiveContainer, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar,
  ScatterChart,
  Scatter,
  CartesianGrid,
  XAxis,
  YAxis,
  ZAxis,
  Cell,
  Tooltip,
  LineChart,
  Line,
  Legend,
  BarChart,
  Bar,
  ComposedChart,
  Area,
  ReferenceArea
} from "recharts";
import { 
  Brain, 
  Activity, 
  Users, 
  Zap, 
  AlertTriangle, 
  Fingerprint, 
  Network, 
  Mic2, 
  Ghost,
  Cpu,
  Save,
  History,
  Layers,
  Search,
  Plus,
  Loader2,
  Sparkles,
  TrendingUp,
  Lightbulb,
  BarChart2,
  Moon,
  Target,
  Clock
} from "lucide-react";
import { HeadspaceMap } from "@/components/headspace-map";
import { cn } from "@/lib/utils";
import { useMembers, useTrackerEntries, useCreateTrackerEntry } from "@/lib/api-hooks";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";

const SYSTEM_STATS: any[] = [
  { subject: 'Dissociation', A: 0, fullMark: 100 },
  { subject: 'Communication', A: 0, fullMark: 100 },
  { subject: 'Memory Access', A: 0, fullMark: 100 },
  { subject: 'Emotional Reg', A: 0, fullMark: 100 },
  { subject: 'Physical Grounding', A: 0, fullMark: 100 },
  { subject: 'Co-con', A: 0, fullMark: 100 },
];

export default function DeepMind() {
  const [activeTab, setActiveTab] = useState("monitor");
  
  const { data: members, isLoading: membersLoading } = useMembers();
  const { data: trackerEntries, isLoading: entriesLoading } = useTrackerEntries(10);
  const createEntryMutation = useCreateTrackerEntry();
  
  const { data: insights, isLoading: insightsLoading } = useQuery({
    queryKey: ["/api/insights"],
    queryFn: async () => {
      const res = await fetch("/api/insights?days=14");
      if (!res.ok) throw new Error("Failed to fetch insights");
      return res.json();
    },
    enabled: activeTab === "analysis" || activeTab === "visuals",
  });

  const [dissociation, setDissociation] = useState([30]);
  const [stress, setStress] = useState([40]);
  const [communication, setCommunication] = useState([60]);
  const [urges, setUrges] = useState([10]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  
  const selectedMember = members?.find(m => m.id === selectedMemberId) || members?.[0];
  
  const coherenceChartData = (trackerEntries || [])
    .slice()
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map(entry => {
      const externalLoad = Math.round(
        ((entry.workLoad || 0) * 10 + (entry.stress || 0)) / 2
      );
      const internalStability = Math.round(
        100 - ((entry.dissociation || 0) + (100 - (entry.capacity ?? 3) * 20) + (100 - (entry.mood || 5) * 10)) / 3
      );
      return {
        time: format(new Date(entry.timestamp), "h:mm a"),
        externalLoad: Math.min(100, Math.max(0, externalLoad)),
        internalStability: Math.min(100, Math.max(0, internalStability)),
      };
    });

  const isStable = coherenceChartData.length >= 3 && 
    coherenceChartData.every(d => d.internalStability >= 35 && d.internalStability <= 65) &&
    Math.max(...coherenceChartData.map(d => d.internalStability)) - Math.min(...coherenceChartData.map(d => d.internalStability)) < 15;
  
  const frontingPatterns = (() => {
    if (!trackerEntries || !members) return [];
    const memberStats = new Map<string, { count: number; totalStress: number; totalDissociation: number; member: any }>();
    trackerEntries.forEach(entry => {
      const member = members.find(m => m.id === entry.frontingMemberId);
      if (member) {
        const existing = memberStats.get(member.id) || { count: 0, totalStress: 0, totalDissociation: 0, member };
        existing.count++;
        existing.totalStress += entry.stress || 0;
        existing.totalDissociation += entry.dissociation || 0;
        memberStats.set(member.id, existing);
      }
    });
    return Array.from(memberStats.values()).map(({ count, totalStress, totalDissociation, member }) => ({
      name: member.name,
      color: member.color,
      count,
      avgStress: Math.round(totalStress / count),
      avgDissociation: Math.round(totalDissociation / count),
    }));
  })();
  
  const latestEntry = trackerEntries?.[0];
  const previousEntry = trackerEntries?.[1];

  const getSystemStatus = () => {
    if (!latestEntry) return { status: "Unknown", pressure: "None", capacity: "Unknown" };
    
    const stability = 100 - ((latestEntry.dissociation || 0) + (100 - (latestEntry.capacity ?? 3) * 20) + (latestEntry.stress || 0)) / 3;
    let status = "Stable";
    if (stability < 40) status = "Fragile";
    else if (stability < 60) status = "Variable";
    
    let pressure = "None";
    const pressures = [
      { name: "Work", val: (latestEntry.workLoad || 0) * 10 },
      { name: "Pain", val: latestEntry.triggerTag === "pain" ? 80 : 0 },
      { name: "Sleep", val: latestEntry.triggerTag === "sleep" ? 80 : 0 },
      { name: "Stress", val: latestEntry.stress }
    ].sort((a, b) => b.val - a.val);
    if (pressures[0].val > 30) pressure = pressures[0].name;

    const cap = latestEntry.capacity ?? 3;
    let capacityLabel = "Moderate";
    if (cap <= 1) capacityLabel = "Low";
    else if (cap >= 4) capacityLabel = "High";

    return { status, pressure, capacity: capacityLabel };
  };

  const statusSummary = getSystemStatus();

  const getDeltas = () => {
    if (!latestEntry || !previousEntry) return null;
    
    const timeDiff = Math.round((new Date(latestEntry.timestamp).getTime() - new Date(previousEntry.timestamp).getTime()) / (1000 * 60 * 60));
    
    const stressDiff = latestEntry.stress - previousEntry.stress;
    const stabilityDiff = (100 - latestEntry.dissociation) - (100 - previousEntry.dissociation);

    return {
      timeAgo: timeDiff,
      pressureTrend: stressDiff > 5 ? "↑ slight" : stressDiff < -5 ? "↓ slight" : "→ steady",
      stabilityTrend: stabilityDiff > 5 ? "↑ improving" : stabilityDiff < -5 ? "↓ fragile" : "→ steady"
    };
  };

  const deltas = getDeltas();

  const pressureChips = (() => {
    if (!latestEntry) return [];
    const chips = [];
    if (latestEntry.workLoad && latestEntry.workLoad > 3) chips.push({ label: "Work", trend: "↑" });
    if (latestEntry.triggerTag === "pain") chips.push({ label: "Pain", trend: "→" });
    if (latestEntry.triggerTag === "sleep") chips.push({ label: "Sleep", trend: "↓" });
    return chips.slice(0, 3);
  })();

  const safeAction = (() => {
    if (!latestEntry) return null;
    const stability = 100 - latestEntry.dissociation;
    if (stability < 40) return "Grounding exercise (5-4-3-2-1 technique)";
    if (latestEntry.stress > 60) return "Short quiet walk or box breathing";
    if (latestEntry.capacity && latestEntry.capacity > 4) return "Progress on one small task";
    return null;
  })();

  const systemStats = latestEntry ? [
    { subject: 'Dissociation', A: 100 - (latestEntry.dissociation || 0), fullMark: 100 },
    { subject: 'Communication', A: latestEntry.energy ? latestEntry.energy * 20 : 50, fullMark: 100 },
    { subject: 'Memory Access', A: 70, fullMark: 100 },
    { subject: 'Emotional Reg', A: 100 - (latestEntry.stress || 0), fullMark: 100 },
    { subject: 'Grounding', A: latestEntry.mood ? latestEntry.mood * 20 : 50, fullMark: 100 },
    { subject: 'Co-con', A: 60, fullMark: 100 },
  ] : SYSTEM_STATS;

  const handleCommitLog = () => {
    if (!selectedMember) {
      toast.error("Please select who is fronting");
      return;
    }

    const hour = new Date().getHours();
    const timeOfDay = hour >= 5 && hour < 12 ? "morning" : hour >= 12 && hour < 17 ? "afternoon" : hour >= 17 && hour < 21 ? "evening" : "night";
    
    createEntryMutation.mutate({
      frontingMemberId: selectedMember.id,
      mood: Math.round((100 - stress[0]) / 20),
      energy: Math.round(communication[0] / 20),
      stress: stress[0],
      dissociation: dissociation[0],
      capacity: null,
      triggerTag: null,
      workLoad: null,
      workTag: null,
      timeOfDay,
      notes: `Dissociation: ${dissociation[0]}%, Communication: ${communication[0]}%, Stress: ${stress[0]}%, Urges: ${urges[0]}%`,
      timestamp: new Date(),
    }, {
      onSuccess: () => toast.success("System log committed"),
      onError: () => toast.error("Failed to commit log"),
    });
  };

  const recentLogs = (trackerEntries || []).slice(0, 5).map(entry => {
    const member = members?.find(m => m.id === entry.frontingMemberId);
    return {
      time: format(new Date(entry.timestamp), "h:mm a"),
      dissociation: entry.dissociation || 0,
      stress: entry.stress || 0,
      front: member?.name || "Unknown",
      note: entry.notes || "",
    };
  });

  const getMemberActivityState = (member: any) => {
    const recentFronting = (trackerEntries || []).filter(e => 
      e.frontingMemberId === member.id && 
      new Date(e.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );
    const timeActive = recentFronting.length;
    const avgLoad = recentFronting.length > 0 
      ? recentFronting.reduce((sum, e) => sum + (e.stress || 0) + (e.dissociation || 0), 0) / (recentFronting.length * 2)
      : 0;
    
    if (member.location === "front") return { lane: "Active Now", laneIndex: 0, timeActive, load: avgLoad };
    if (timeActive > 0) return { lane: "Co-Active", laneIndex: 1, timeActive, load: avgLoad };
    return { lane: "Resting", laneIndex: 2, timeActive: 0, load: 0 };
  };

  const alterPositions = (members || []).map((member, i) => {
    const activity = getMemberActivityState(member);
    return {
      name: member.name,
      color: member.color,
      lane: activity.lane,
      laneIndex: activity.laneIndex,
      timeActive: activity.timeActive,
      load: activity.load,
      size: Math.max(20, Math.min(60, 20 + activity.timeActive * 8)),
      opacity: Math.max(0.3, 1 - activity.load / 150),
    };
  });

  const balancePillars = (() => {
    const entries48h = (trackerEntries || []).filter(e => 
      new Date(e.timestamp) > new Date(Date.now() - 48 * 60 * 60 * 1000)
    );
    const entries24h = entries48h.filter(e => 
      new Date(e.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );
    const olderEntries = entries48h.filter(e => 
      new Date(e.timestamp) <= new Date(Date.now() - 24 * 60 * 60 * 1000)
    );
    
    const calcAvg = (arr: any[], fn: (e: any) => number) => 
      arr.length > 0 ? arr.reduce((sum, e) => sum + fn(e), 0) / arr.length : null;
    
    const getTrend = (current: number | null, previous: number | null) => {
      if (current === null || previous === null) return "stable";
      const diff = current - previous;
      if (diff > 5) return "up";
      if (diff < -5) return "down";
      return "stable";
    };
    
    const dissNowRaw = calcAvg(entries24h, e => e.dissociation || 0);
    const dissPrev = calcAvg(olderEntries, e => 100 - (e.dissociation || 0));
    
    const commNowRaw = calcAvg(entries24h, e => (e.energy || 5) * 10);
    const commPrev = calcAvg(olderEntries, e => (e.energy || 5) * 10);
    
    const regPrev = calcAvg(olderEntries, e => 100 - (e.stress || 0));
    const groundPrev = calcAvg(olderEntries, e => (e.mood || 5) * 10);
    
    const capacityNowRaw = calcAvg(entries24h, e => (e.capacity ?? 3) * 20);
    const capacityPrev = calcAvg(olderEntries, e => (e.capacity ?? 3) * 20);
    
    // Derived Pillar Calculation Logic
    const entries24h_mood = calcAvg(entries24h, e => e.mood || 5);
    const entries24h_stress = calcAvg(entries24h, e => e.stress || 0);
    const entries24h_cap = calcAvg(entries24h, e => e.capacity ?? 3);
    
    // Dissociation: primary from entries, secondary from time of day (night/early morning = higher)
    const h = new Date().getHours();
    const timeBonus = (h < 6 || h > 22) ? -10 : 0;
    const dissNow = 100 - (dissNowRaw ?? 50) + timeBonus;
    
    // Communication: energy + routine adherence
    const commNow = ((commNowRaw ?? 50) + (entries24h.length * 5)) / 1.2;
    
    // Regulation: 100 - stress
    const regNow = 100 - (entries24h_stress ?? 50);
    
    // Grounding: mood
    const groundNow = (entries24h_mood ?? 5) * 10;
    
    // Capacity: base capacity + lack of work load
    const workPenalty = calcAvg(entries24h, e => (e.workLoad || 0) * 5) ?? 0;
    const capacityNow = (entries24h_cap ?? 3) * 20 - workPenalty;
    
    return [
      { name: "Dissociation", icon: "🧠", value: Math.max(0, Math.min(100, dissNow)), trend: getTrend(dissNow, dissPrev) },
      { name: "Communication", icon: "💬", value: Math.max(0, Math.min(100, commNow)), trend: getTrend(commNow, commPrev) },
      { name: "Regulation", icon: "⚖️", value: Math.max(0, Math.min(100, regNow)), trend: getTrend(regNow, regPrev) },
      { name: "Grounding", icon: "🧘", value: Math.max(0, Math.min(100, groundNow)), trend: getTrend(groundNow, groundPrev) },
      { name: "Capacity", icon: "🔋", value: Math.max(0, Math.min(100, capacityNow)), trend: getTrend(capacityNow, capacityPrev) },
    ];
  })();

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500 pb-20">
        
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
                <TabsTrigger value="monitor" className="gap-2" data-testid="tab-monitor"><Activity className="w-4 h-4" /> Live Monitor</TabsTrigger>
                <TabsTrigger value="analysis" className="gap-2" data-testid="tab-analysis"><Brain className="w-4 h-4" /> Analysis & Patterns</TabsTrigger>
                <TabsTrigger value="visuals" className="gap-2" data-testid="tab-visuals"><BarChart2 className="w-4 h-4" /> Visualizations</TabsTrigger>
                <TabsTrigger value="map" className="gap-2" data-testid="tab-map"><Network className="w-4 h-4" /> Headspace Map</TabsTrigger>
            </TabsList>

            <TabsContent value="monitor" className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 gap-6">
                    <div className="flex items-center gap-6 px-4 py-2 bg-slate-900/50 border border-slate-800 rounded-lg text-[11px] font-mono tracking-tight uppercase">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">System Status:</span>
                        <span className={cn(
                          statusSummary.status === "Stable" ? "text-emerald-400" : "text-amber-400"
                        )}>{statusSummary.status}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">Primary Pressure:</span>
                        <span className="text-slate-200">{statusSummary.pressure}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">Capacity:</span>
                        <span className="text-slate-200">{statusSummary.capacity}</span>
                      </div>
                    </div>

                    <Card className="bg-slate-950 border-slate-800 shadow-2xl overflow-hidden relative group">
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f46e520_1px,transparent_1px),linear-gradient(to_bottom,#4f46e520_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
                        <CardHeader className="relative z-10 pb-2">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-slate-100 flex items-center gap-2 text-base font-mono">
                                  <Activity className="w-4 h-4 text-emerald-400" /> System Load vs Stability
                              </CardTitle>
                              <div className="flex items-center gap-3">
                                {isStable && coherenceChartData.length >= 3 && (
                                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                                    Regulated
                                  </Badge>
                                )}
                                <div className="hidden md:flex items-center gap-4 text-[10px] font-mono">
                                  <div className="flex items-center gap-1.5 text-amber-500">
                                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                                    <span>External Pressure</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-emerald-400">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                    <span>Internal Stability</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                        </CardHeader>
                        <CardContent className="h-[350px] relative z-10 pl-0">
                            {coherenceChartData.length > 0 ? (
                              <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={coherenceChartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                  <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                                  <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} />
                                  <Tooltip 
                                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                                    labelStyle={{ color: '#94a3b8' }}
                                    formatter={(value: number, name: string) => [
                                      `${value}%`,
                                      name === 'externalLoad' ? 'External Load' : 'Internal Stability'
                                    ]}
                                  />
                                  <ReferenceArea 
                                    y1={35} 
                                    y2={65} 
                                    fill="#10b981"
                                    fillOpacity={0.1}
                                    stroke="#10b981"
                                    strokeOpacity={0.2}
                                    strokeDasharray="3 3"
                                  />
                                  <Line type="monotone" dataKey="externalLoad" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: '#f59e0b', r: 3 }} name="externalLoad" />
                                  <Line type="monotone" dataKey="internalStability" stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', r: 3 }} name="internalStability" />
                                </ComposedChart>
                              </ResponsiveContainer>
                            ) : (
                              <div className="h-full flex items-center justify-center text-center space-y-2">
                                <div>
                                  <Activity className="w-8 h-8 text-slate-700 mx-auto animate-pulse" />
                                  <p className="text-slate-500 text-sm mt-2">Awaiting Data Points</p>
                                  <p className="text-slate-600 text-xs">Log entries to see load vs stability trends.</p>
                                </div>
                              </div>
                            )}
                            <div className="absolute bottom-2 left-0 right-0 flex justify-center text-[9px] text-slate-600 font-mono">
                              <span>stable band: 35-65%</span>
                            </div>
                        </CardContent>
                        {deltas && (
                          <div className="px-4 py-2 bg-slate-900/30 border-t border-slate-800/50 flex items-center justify-between text-[10px] font-mono text-slate-400">
                            <div className="flex items-center gap-4">
                              <span>Since last log ({deltas.timeAgo}h ago):</span>
                              <div className="flex items-center gap-1.5">
                                <span>External Pressure</span>
                                <span className="text-slate-300">{deltas.pressureTrend}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span>Internal Stability</span>
                                <span className="text-slate-300">{deltas.stabilityTrend}</span>
                              </div>
                            </div>
                            {pressureChips.length > 0 && (
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] text-slate-500">Pressure:</span>
                                {pressureChips.map((chip, i) => (
                                  <Badge key={i} variant="outline" className="text-[9px] py-0 h-4 bg-slate-800/50 border-slate-700 text-slate-300">
                                    {chip.label} {chip.trend}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                    </Card>

                    {safeAction && (
                      <div className="px-4 py-3 bg-indigo-500/5 border border-indigo-500/20 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-700">
                        <Lightbulb className="w-4 h-4 text-indigo-400" />
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-indigo-400/80 uppercase tracking-widest leading-none mb-1">Safe Next Action</span>
                          <span className="text-sm text-slate-300">{safeAction}</span>
                        </div>
                      </div>
                    )}

                    <Card className="border-border shadow-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Layers className="w-4 h-4 text-indigo-500" /> System Balance
                            </CardTitle>
                            <CardDescription className="text-xs">Load distribution across capacities</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px] pt-6">
                            <div className="relative h-full flex items-end justify-between gap-4 px-4 md:px-8">
                                <div className="absolute top-[35%] left-0 right-0 h-[30%] bg-emerald-500/5 border-y border-emerald-500/20 pointer-events-none" />
                                <div className="absolute top-[48%] left-0 right-0 flex items-center pointer-events-none">
                                  <div className="flex-1 border-t border-dashed border-slate-300/30" />
                                  <span className="text-[8px] text-slate-400 px-1 bg-background">usable range</span>
                                  <div className="flex-1 border-t border-dashed border-slate-300/30" />
                                </div>
                                
                                {balancePillars.map((pillar, i) => {
                                  const heightPercent = Math.max(10, Math.min(95, pillar.value));
                                  const isInRange = pillar.value >= 35 && pillar.value <= 65;
                                  const isHigh = pillar.value > 65;
                                  
                                  return (
                                    <div key={i} className="flex flex-col items-center gap-3 flex-1 max-w-[100px]">
                                      <div className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                                        {pillar.trend === "up" && <span className="text-emerald-500">↑</span>}
                                        {pillar.trend === "down" && <span className="text-amber-500">↓</span>}
                                        {pillar.trend === "stable" && <span className="text-slate-400">→</span>}
                                      </div>
                                      <div className="relative w-full h-[180px] bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden border border-border/50">
                                        <div 
                                          className={cn(
                                            "absolute bottom-0 left-0 right-0 transition-all duration-1000",
                                            isInRange ? "bg-gradient-to-t from-emerald-500/60 to-emerald-400/30" :
                                            isHigh ? "bg-gradient-to-t from-amber-500/60 to-amber-400/30" :
                                            "bg-gradient-to-t from-violet-500/60 to-violet-400/30"
                                          )}
                                          style={{ height: `${heightPercent}%` }}
                                        />
                                      </div>
                                      <div className="text-center space-y-1">
                                        <div className="text-xl">{pillar.icon}</div>
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground leading-tight">
                                          {pillar.name}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>

            <TabsContent value="analysis" className="animate-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-6">
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-indigo-500" />
                                Pattern Analysis
                            </CardTitle>
                            <CardDescription>Insights from your mood, habit, and routine data.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {insightsLoading ? (
                              <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                                <p className="text-muted-foreground text-sm">Analyzing patterns and correlations...</p>
                              </div>
                            ) : insights?.insights && insights.insights.length > 0 ? (
                              <div className="space-y-4">
                                {insights.encouragement && (
                                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-600 dark:text-emerald-400">
                                    {insights.encouragement}
                                  </div>
                                )}
                                
                                {(() => {
                                  const meaningfulCorrelations = insights.correlationHighlights?.filter((c: any) => 
                                    c.strength === 'strong' || c.strength === 'moderate'
                                  ) || [];
                                  
                                  if (meaningfulCorrelations.length === 0) return null;
                                  
                                  return (
                                    <div className="p-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-lg border border-indigo-500/20">
                                      <h4 className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-3 flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4" />
                                        Validated Correlations
                                      </h4>
                                      <div className="grid md:grid-cols-2 gap-3">
                                        {meaningfulCorrelations.map((corr: any, i: number) => (
                                          <div key={i} className="flex items-center gap-3 bg-background/50 p-3 rounded-lg">
                                            <div className={cn(
                                              "w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0",
                                              corr.relationship === 'positive' ? 'bg-emerald-500/20 text-emerald-600' :
                                              corr.relationship === 'negative' ? 'bg-rose-500/20 text-rose-600' :
                                              'bg-slate-500/20 text-slate-600'
                                            )}>
                                              {corr.relationship === 'positive' ? '↑' : corr.relationship === 'negative' ? '↓' : '~'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="text-sm font-medium truncate">{corr.factor1} → {corr.factor2}</div>
                                              <div className="text-xs text-muted-foreground">{corr.summary}</div>
                                            </div>
                                            <Badge variant="outline" className={cn(
                                              "shrink-0 text-[10px]",
                                              corr.strength === 'strong' ? 'border-emerald-500 text-emerald-600' : 'border-amber-500 text-amber-600'
                                            )}>{corr.strength}</Badge>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })()}
                                
                                <div className="space-y-3">
                                  {(() => {
                                    const highConfidenceInsights = insights.insights.filter((i: any) => 
                                      i.confidence === 'strong' || i.confidence === 'moderate'
                                    );
                                    const limitedInsights = insights.insights.filter((i: any) => 
                                      i.confidence !== 'strong' && i.confidence !== 'moderate'
                                    );
                                    
                                    const categoryColors: Record<string, string> = {
                                      sleep: 'border-l-blue-500 bg-blue-500/5',
                                      habits: 'border-l-emerald-500 bg-emerald-500/5',
                                      routines: 'border-l-amber-500 bg-amber-500/5',
                                      system: 'border-l-purple-500 bg-purple-500/5',
                                      overall: 'border-l-indigo-500 bg-indigo-500/5',
                                    };
                                    const categoryIcons: Record<string, string> = {
                                      sleep: '😴', habits: '✓', routines: '📅', system: '👥', overall: '📊'
                                    };
                                    
                                    return (
                                      <>
                                        {highConfidenceInsights.length > 0 ? (
                                          highConfidenceInsights.map((insight: any, i: number) => (
                                            <div key={i} className={cn(
                                              "p-3 rounded-lg border-l-4",
                                              categoryColors[insight.category] || 'border-l-slate-500 bg-muted/30'
                                            )}>
                                              <div className="flex items-start justify-between gap-2 mb-1">
                                                <div className="flex items-center gap-2">
                                                  <span>{categoryIcons[insight.category] || '💡'}</span>
                                                  <h4 className="font-semibold text-sm text-foreground">{insight.title}</h4>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                  {insight.dataPoint && (
                                                    <Badge className="bg-primary/20 text-primary text-[10px] font-bold">
                                                      {insight.dataPoint}
                                                    </Badge>
                                                  )}
                                                  <Badge variant="outline" className={cn(
                                                    "text-[10px]",
                                                    insight.confidence === 'strong' ? 'border-emerald-500 text-emerald-600' :
                                                    'border-amber-500 text-amber-600'
                                                  )}>
                                                    {insight.confidence}
                                                  </Badge>
                                                </div>
                                              </div>
                                              <p className="text-xs text-muted-foreground">{insight.observation}</p>
                                            </div>
                                          ))
                                        ) : (
                                          <div className="p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-lg">
                                            <div className="flex items-start gap-4">
                                              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                                                <Activity className="w-6 h-6 text-amber-600" />
                                              </div>
                                              <div className="flex-1">
                                                <h3 className="font-semibold text-lg text-amber-700 dark:text-amber-400 mb-1">Collecting Data for Insights</h3>
                                                <p className="text-sm text-muted-foreground mb-4">
                                                  Meaningful patterns need at least 7 days of tracking. Keep logging daily to unlock personalized correlations.
                                                </p>
                                                <div className="grid grid-cols-4 gap-4">
                                                  <div className="text-center">
                                                    <div className="text-2xl font-bold text-amber-600">{insights.dataRange?.entriesAnalyzed || 0}</div>
                                                    <div className="text-xs text-muted-foreground">Days Logged</div>
                                                    <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, ((insights.dataRange?.entriesAnalyzed || 0) / 7) * 100)}%` }}></div>
                                                    </div>
                                                  </div>
                                                  <div className="text-center">
                                                    <div className="text-2xl font-bold text-emerald-600">{insights.rawCorrelations?.overallMetrics?.totalHabitCompletions || 0}</div>
                                                    <div className="text-xs text-muted-foreground">Habit Completions</div>
                                                  </div>
                                                  <div className="text-center">
                                                    <div className="text-2xl font-bold text-blue-600">{insights.rawCorrelations?.overallMetrics?.totalRoutineCompletions || 0}</div>
                                                    <div className="text-xs text-muted-foreground">Routine Completions</div>
                                                  </div>
                                                  <div className="text-center">
                                                    <div className="text-2xl font-bold text-purple-600">{Math.max(0, 7 - (insights.dataRange?.entriesAnalyzed || 0))}</div>
                                                    <div className="text-xs text-muted-foreground">Days Until Insights</div>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                        
                                        {limitedInsights.length > 0 && (
                                          <details className="mt-2">
                                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground py-1">
                                              {limitedInsights.length} preliminary observation{limitedInsights.length > 1 ? 's' : ''} (needs more data)
                                            </summary>
                                            <div className="mt-2 space-y-2 pl-2 border-l border-muted">
                                              {limitedInsights.slice(0, 3).map((insight: any, i: number) => (
                                                <div key={i} className="text-xs text-muted-foreground py-1">
                                                  <span className="mr-1">{categoryIcons[insight.category] || '💡'}</span>
                                                  <span className="font-medium">{insight.title}</span>
                                                </div>
                                              ))}
                                              {limitedInsights.length > 3 && (
                                                <div className="text-xs text-muted-foreground/60">
                                                  +{limitedInsights.length - 3} more...
                                                </div>
                                              )}
                                            </div>
                                          </details>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                                
                                {insights.dataRange && (
                                  <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border/50">
                                    <p className="text-xs font-medium text-muted-foreground mb-2">Analysis Summary</p>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                      <div className="bg-background/50 p-2 rounded">
                                        <span className="text-muted-foreground">Period:</span>
                                        <span className="font-mono ml-1">{insights.dataRange.days} days</span>
                                      </div>
                                      <div className="bg-background/50 p-2 rounded">
                                        <span className="text-muted-foreground">Entries:</span>
                                        <span className="font-mono ml-1">{insights.dataRange.entriesAnalyzed}</span>
                                      </div>
                                      <div className="bg-background/50 p-2 rounded">
                                        <span className="text-muted-foreground">Habits:</span>
                                        <span className="font-mono ml-1">{insights.dataRange.habitsTracked}</span>
                                      </div>
                                      <div className="bg-background/50 p-2 rounded">
                                        <span className="text-muted-foreground">Trend:</span>
                                        <span className={cn(
                                          "font-mono ml-1 capitalize",
                                          insights.overallTrend === 'improving' ? 'text-emerald-600' :
                                          insights.overallTrend === 'needs_attention' ? 'text-amber-600' : ''
                                        )}>{insights.overallTrend || 'stable'}</span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                                <Search className="w-12 h-12 text-muted-foreground/20" />
                                <p className="text-muted-foreground text-sm font-medium">No Patterns Detected Yet</p>
                                <p className="text-muted-foreground/60 text-xs max-w-xs">
                                    Pattern recognition requires logged data. Continue logging daily mood, stress, and habits.
                                </p>
                              </div>
                            )}
                        </CardContent>
                    </Card>

                    {frontingPatterns.length > 1 && (
                      <div className="p-3 bg-purple-500/5 border border-purple-500/20 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Fingerprint className="w-4 h-4 text-purple-500" />
                          <span className="text-sm font-medium">System Member Activity</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {frontingPatterns.map((pattern, i) => (
                            <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-background/50 rounded text-xs">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pattern.color }}></span>
                              <span className="font-medium">{pattern.name}</span>
                              <span className="text-muted-foreground">({pattern.count})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
            </TabsContent>

            <TabsContent value="visuals" className="animate-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Target className="w-5 h-5 text-emerald-500" />
                                    Habit Impact on Mood
                                </CardTitle>
                                <CardDescription>Compare your mood on days with vs without habit completion</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {insights?.rawCorrelations?.habitCorrelations && insights.rawCorrelations.habitCorrelations.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart 
                                            data={insights.rawCorrelations.habitCorrelations.slice(0, 6).map((h: any) => ({
                                                name: h.habitName.length > 12 ? h.habitName.slice(0, 12) + '...' : h.habitName,
                                                'With Habit': parseFloat(h.avgMoodWithHabit) || 0,
                                                'Without Habit': parseFloat(h.avgMoodWithoutHabit) || 0,
                                            }))}
                                            layout="vertical"
                                            margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                            <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 11 }} />
                                            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={70} />
                                            <Tooltip 
                                                formatter={(value: number) => [`${value.toFixed(1)}/10`, '']}
                                                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                                            />
                                            <Legend />
                                            <Bar dataKey="With Habit" fill="#10b981" radius={[0, 4, 4, 0]} />
                                            <Bar dataKey="Without Habit" fill="#94a3b8" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                        <Target className="w-10 h-10 mb-3 opacity-30" />
                                        <p className="text-sm">Complete habits and log mood to see correlations</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Moon className="w-5 h-5 text-blue-500" />
                                    Sleep & Dissociation Link
                                </CardTitle>
                                <CardDescription>How sleep quality affects your dissociation levels</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {insights?.rawCorrelations?.sleepCorrelations ? (
                                    <div className="space-y-6">
                                        <ResponsiveContainer width="100%" height={200}>
                                            <BarChart 
                                                data={[
                                                    { name: 'Low Sleep (<6h)', mood: parseFloat(insights.rawCorrelations.sleepCorrelations.avgMoodLowSleep) || 0, dissociation: insights.rawCorrelations.sleepCorrelations.avgDissociationLowSleep || 0 },
                                                    { name: 'Good Sleep (7h+)', mood: parseFloat(insights.rawCorrelations.sleepCorrelations.avgMoodGoodSleep) || 0, dissociation: insights.rawCorrelations.sleepCorrelations.avgDissociationGoodSleep || 0 },
                                                ]}
                                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                                <YAxis tick={{ fontSize: 11 }} />
                                                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                                                <Legend />
                                                <Bar dataKey="mood" name="Mood (1-10)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                                <Bar dataKey="dissociation" name="Dissociation %" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                        <div className="grid grid-cols-2 gap-4 text-center">
                                            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                                <div className="text-2xl font-bold text-blue-600">{insights.rawCorrelations.sleepCorrelations.avgSleepHours}h</div>
                                                <div className="text-xs text-muted-foreground">Avg Sleep</div>
                                            </div>
                                            <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                                                <div className="text-2xl font-bold text-amber-600">{insights.rawCorrelations.sleepCorrelations.entriesWithSleepData}</div>
                                                <div className="text-xs text-muted-foreground">Days Tracked</div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                        <Moon className="w-10 h-10 mb-3 opacity-30" />
                                        <p className="text-sm">Log sleep data in your daily tracker to see correlations</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <History className="w-5 h-5 text-amber-500" />
                                    Routine Block Adherence
                                </CardTitle>
                                <CardDescription>How consistently you follow each routine block</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {insights?.rawCorrelations?.routineAdherence && insights.rawCorrelations.routineAdherence.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={250}>
                                        <ComposedChart 
                                            data={insights.rawCorrelations.routineAdherence.map((r: any) => ({
                                                name: r.blockName,
                                                completion: r.completionRate,
                                                activities: r.activityCount,
                                            }))}
                                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                            <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                                            <Tooltip 
                                                formatter={(value: number, name: string) => [
                                                    name === 'completion' ? `${value}%` : value,
                                                    name === 'completion' ? 'Completion Rate' : 'Activities'
                                                ]}
                                                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} 
                                            />
                                            <Legend />
                                            <Bar dataKey="completion" name="Completion %" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                        <History className="w-10 h-10 mb-3 opacity-30" />
                                        <p className="text-sm">Complete routine activities to see adherence patterns</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="w-5 h-5 text-purple-500" />
                                    System Member Patterns
                                </CardTitle>
                                <CardDescription>Mood and stress patterns for each system member</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {insights?.rawCorrelations?.frontingPatterns && insights.rawCorrelations.frontingPatterns.length > 0 ? (
                                    <div className="space-y-4">
                                        <ResponsiveContainer width="100%" height={200}>
                                            <BarChart 
                                                data={insights.rawCorrelations.frontingPatterns.map((f: any) => ({
                                                    name: f.name,
                                                    'Avg Mood': parseFloat(f.avgMood),
                                                    'Avg Stress': f.avgStress / 10,
                                                    'Avg Dissociation': f.avgDissociation / 10,
                                                }))}
                                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                                <YAxis tick={{ fontSize: 11 }} domain={[0, 10]} />
                                                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                                                <Legend />
                                                <Bar dataKey="Avg Mood" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                                <Bar dataKey="Avg Stress" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                                <Bar dataKey="Avg Dissociation" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                            {insights.rawCorrelations.frontingPatterns.map((f: any, i: number) => (
                                                <div key={i} className="p-2 bg-muted/30 rounded-lg text-center">
                                                    <div className="text-lg font-bold" style={{ color: members?.find(m => m.name === f.name)?.color }}>{f.percentageOfEntries}%</div>
                                                    <div className="text-[10px] text-muted-foreground">{f.name} fronting</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                        <Users className="w-10 h-10 mb-3 opacity-30" />
                                        <p className="text-sm">Log which member is fronting to see patterns</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-indigo-500" />
                                Habit Completion vs Stress Reduction
                            </CardTitle>
                            <CardDescription>See how each habit affects your stress levels</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {insights?.rawCorrelations?.habitCorrelations && insights.rawCorrelations.habitCorrelations.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart 
                                        data={insights.rawCorrelations.habitCorrelations.map((h: any) => {
                                            const stressReduction = (h.avgStressWithoutHabit || 0) - (h.avgStressWithHabit || 0);
                                            return {
                                                name: h.habitName.length > 15 ? h.habitName.slice(0, 15) + '...' : h.habitName,
                                                'Stress Reduction': Math.max(0, stressReduction),
                                                'Completion Rate': h.completionRate,
                                            };
                                        })}
                                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                        <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} height={60} />
                                        <YAxis tick={{ fontSize: 11 }} />
                                        <Tooltip 
                                            formatter={(value: number, name: string) => [`${value}${name.includes('Rate') ? '%' : ' pts'}`, name]}
                                            contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} 
                                        />
                                        <Legend />
                                        <Bar dataKey="Stress Reduction" name="Stress Reduction (pts)" fill="#10b981" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="Completion Rate" name="Completion Rate %" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <TrendingUp className="w-10 h-10 mb-3 opacity-30" />
                                    <p className="text-sm">Complete habits and log stress levels to see correlations</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {insights?.rawCorrelations?.highConfidence && (
                        <Card className="border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-amber-500" />
                                    High-Confidence Multi-Factor Insights
                                </CardTitle>
                                <CardDescription>Statistically validated correlations linking habits, mood, and routines together</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {insights.rawCorrelations.highConfidence.routineMoodCorrelation && (
                                    <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                            <span className="font-medium text-emerald-700 dark:text-emerald-400">Routine → Mood Impact</span>
                                            <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                                                insights.rawCorrelations.highConfidence.routineMoodCorrelation.confidence?.level === 'high' 
                                                    ? 'bg-emerald-500/20 text-emerald-600' 
                                                    : 'bg-amber-500/20 text-amber-600'
                                            }`}>
                                                {insights.rawCorrelations.highConfidence.routineMoodCorrelation.confidence?.level} confidence
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                                            <div className="p-2 bg-background/50 rounded">
                                                <div className="text-xl font-bold text-emerald-600">{insights.rawCorrelations.highConfidence.routineMoodCorrelation.avgMoodHighRoutine}</div>
                                                <div className="text-[10px] text-muted-foreground">Mood (60%+ routine)</div>
                                            </div>
                                            <div className="p-2 bg-background/50 rounded">
                                                <div className="text-xl font-bold text-slate-500">{insights.rawCorrelations.highConfidence.routineMoodCorrelation.avgMoodLowRoutine}</div>
                                                <div className="text-[10px] text-muted-foreground">Mood (30%- routine)</div>
                                            </div>
                                            <div className="p-2 bg-background/50 rounded">
                                                <div className="text-xl font-bold text-blue-600">+{insights.rawCorrelations.highConfidence.routineMoodCorrelation.moodImprovement}</div>
                                                <div className="text-[10px] text-muted-foreground">Mood difference</div>
                                            </div>
                                            <div className="p-2 bg-background/50 rounded">
                                                <div className="text-xl font-bold text-purple-600">-{insights.rawCorrelations.highConfidence.routineMoodCorrelation.stressReduction}%</div>
                                                <div className="text-[10px] text-muted-foreground">Stress reduction</div>
                                            </div>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-3">
                                            On {insights.rawCorrelations.highConfidence.routineMoodCorrelation.highRoutineDays} days with 60%+ routine completion, your mood averaged {insights.rawCorrelations.highConfidence.routineMoodCorrelation.avgMoodHighRoutine}/10 compared to {insights.rawCorrelations.highConfidence.routineMoodCorrelation.avgMoodLowRoutine}/10 on {insights.rawCorrelations.highConfidence.routineMoodCorrelation.lowRoutineDays} low-routine days.
                                        </p>
                                    </div>
                                )}

                                {insights.rawCorrelations.highConfidence.habitRoutineSynergy && insights.rawCorrelations.highConfidence.habitRoutineSynergy.length > 0 && (
                                    <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                            <span className="font-medium text-indigo-700 dark:text-indigo-400">Habit + Routine Synergy Effects</span>
                                        </div>
                                        <div className="space-y-2">
                                            {insights.rawCorrelations.highConfidence.habitRoutineSynergy.slice(0, 3).map((syn: any, i: number) => (
                                                syn && (
                                                    <div key={i} className="flex items-center justify-between p-2 bg-background/50 rounded text-sm">
                                                        <span className="font-medium">{syn.habitName}</span>
                                                        <div className="flex items-center gap-4">
                                                            <div className="text-center">
                                                                <div className="text-xs text-muted-foreground">Both</div>
                                                                <div className="font-bold text-emerald-600">{syn.avgMoodBoth || '-'}</div>
                                                            </div>
                                                            <div className="text-center">
                                                                <div className="text-xs text-muted-foreground">Neither</div>
                                                                <div className="font-bold text-slate-500">{syn.avgMoodNeither || '-'}</div>
                                                            </div>
                                                            <div className="text-center min-w-[60px]">
                                                                <div className="text-xs text-muted-foreground">Synergy</div>
                                                                <div className={`font-bold ${parseFloat(syn.synergyBonus || 0) > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                                    {parseFloat(syn.synergyBonus || 0) > 0 ? '+' : ''}{syn.synergyBonus || '0'}
                                                                </div>
                                                            </div>
                                                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                                syn.confidence?.level === 'high' ? 'bg-emerald-500/20 text-emerald-600' : 'bg-amber-500/20 text-amber-600'
                                                            }`}>
                                                                {syn.confidence?.level}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-3">
                                            Synergy bonus shows the mood improvement from doing both the habit AND routine together vs doing neither.
                                        </p>
                                    </div>
                                )}

                                {insights.rawCorrelations.highConfidence.bestWorstDaysAnalysis && (
                                    <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                            <span className="font-medium text-purple-700 dark:text-purple-400">Best vs Worst Days Pattern</span>
                                            <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                                                insights.rawCorrelations.highConfidence.bestWorstDaysAnalysis.confidence?.level === 'high' 
                                                    ? 'bg-emerald-500/20 text-emerald-600' 
                                                    : 'bg-amber-500/20 text-amber-600'
                                            }`}>
                                                {insights.rawCorrelations.highConfidence.bestWorstDaysAnalysis.confidence?.level} confidence
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                                <div className="text-sm font-medium text-emerald-600 mb-2">Best Days (avg mood {insights.rawCorrelations.highConfidence.bestWorstDaysAnalysis.avgMoodBestDays})</div>
                                                <div className="space-y-1 text-xs text-muted-foreground">
                                                    <div>Sleep: {insights.rawCorrelations.highConfidence.bestWorstDaysAnalysis.bestDaysPatterns.avgSleep}h avg</div>
                                                    <div>Routine: {insights.rawCorrelations.highConfidence.bestWorstDaysAnalysis.bestDaysPatterns.routineCompletionRate}% completion</div>
                                                    {insights.rawCorrelations.highConfidence.bestWorstDaysAnalysis.bestDaysPatterns.topHabits.length > 0 && (
                                                        <div>Top habits: {insights.rawCorrelations.highConfidence.bestWorstDaysAnalysis.bestDaysPatterns.topHabits.map((h: any) => `${h.name} (${h.frequency}%)`).join(', ')}</div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                                                <div className="text-sm font-medium text-red-600 mb-2">Worst Days (avg mood {insights.rawCorrelations.highConfidence.bestWorstDaysAnalysis.avgMoodWorstDays})</div>
                                                <div className="space-y-1 text-xs text-muted-foreground">
                                                    <div>Sleep: {insights.rawCorrelations.highConfidence.bestWorstDaysAnalysis.worstDaysPatterns.avgSleep}h avg</div>
                                                    <div>Routine: {insights.rawCorrelations.highConfidence.bestWorstDaysAnalysis.worstDaysPatterns.routineCompletionRate}% completion</div>
                                                    {insights.rawCorrelations.highConfidence.bestWorstDaysAnalysis.worstDaysPatterns.topHabits.length > 0 && (
                                                        <div>Top habits: {insights.rawCorrelations.highConfidence.bestWorstDaysAnalysis.worstDaysPatterns.topHabits.map((h: any) => `${h.name} (${h.frequency}%)`).join(', ')}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {insights.rawCorrelations.highConfidence.sleepHabitInteraction && (
                                    <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                            <span className="font-medium text-blue-700 dark:text-blue-400">Sleep × {insights.rawCorrelations.highConfidence.sleepHabitInteraction.habitName} Interaction</span>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-sm">
                                            <div className="p-2 bg-background/50 rounded">
                                                <div className="text-xs text-muted-foreground mb-1">Good Sleep + Habit</div>
                                                <div className="font-bold text-emerald-600">{insights.rawCorrelations.highConfidence.sleepHabitInteraction.goodSleepWithHabitMood || '-'}</div>
                                                <div className="text-[10px] text-muted-foreground">({insights.rawCorrelations.highConfidence.sleepHabitInteraction.goodSleepWithHabitCount} days)</div>
                                            </div>
                                            <div className="p-2 bg-background/50 rounded">
                                                <div className="text-xs text-muted-foreground mb-1">Good Sleep Only</div>
                                                <div className="font-bold text-blue-600">{insights.rawCorrelations.highConfidence.sleepHabitInteraction.goodSleepNoHabitMood || '-'}</div>
                                                <div className="text-[10px] text-muted-foreground">({insights.rawCorrelations.highConfidence.sleepHabitInteraction.goodSleepNoHabitCount} days)</div>
                                            </div>
                                            <div className="p-2 bg-background/50 rounded">
                                                <div className="text-xs text-muted-foreground mb-1">Bad Sleep + Habit</div>
                                                <div className="font-bold text-amber-600">{insights.rawCorrelations.highConfidence.sleepHabitInteraction.badSleepWithHabitMood || '-'}</div>
                                                <div className="text-[10px] text-muted-foreground">({insights.rawCorrelations.highConfidence.sleepHabitInteraction.badSleepWithHabitCount} days)</div>
                                            </div>
                                            <div className="p-2 bg-background/50 rounded">
                                                <div className="text-xs text-muted-foreground mb-1">Bad Sleep Only</div>
                                                <div className="font-bold text-red-600">{insights.rawCorrelations.highConfidence.sleepHabitInteraction.badSleepNoHabitMood || '-'}</div>
                                                <div className="text-[10px] text-muted-foreground">({insights.rawCorrelations.highConfidence.sleepHabitInteraction.badSleepNoHabitCount} days)</div>
                                            </div>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-3">
                                            This shows how sleep quality affects the mood impact of your most impactful habit.
                                        </p>
                                    </div>
                                )}

                                {insights.rawCorrelations.highConfidence.highConfidenceHabits && insights.rawCorrelations.highConfidence.highConfidenceHabits.length > 0 && (
                                    <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                                            <span className="font-medium text-cyan-700 dark:text-cyan-400">Statistically Validated Habit Impacts</span>
                                        </div>
                                        <div className="space-y-2">
                                            {insights.rawCorrelations.highConfidence.highConfidenceHabits.slice(0, 4).map((h: any, i: number) => (
                                                <div key={i} className="flex items-center justify-between p-2 bg-background/50 rounded text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-2 h-2 rounded-full ${
                                                            h.impactDirection === 'positive' ? 'bg-emerald-500' : 
                                                            h.impactDirection === 'negative' ? 'bg-red-500' : 'bg-slate-500'
                                                        }`}></span>
                                                        <span className="font-medium">{h.habitName}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-right">
                                                            <div className={`font-bold ${parseFloat(h.moodDifference) > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                                {parseFloat(h.moodDifference) > 0 ? '+' : ''}{h.moodDifference} mood
                                                            </div>
                                                            <div className="text-[10px] text-muted-foreground">{h.avgMoodWithHabit} vs {h.avgMoodWithoutHabit}</div>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-1">
                                                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                                                                h.effectSize === 'strong' ? 'bg-emerald-500/20 text-emerald-600' :
                                                                h.effectSize === 'moderate' ? 'bg-amber-500/20 text-amber-600' : 'bg-slate-500/20 text-slate-600'
                                                            }`}>{h.effectSize}</span>
                                                            <span className="text-[10px] text-muted-foreground">{h.confidence?.level}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </TabsContent>

            <TabsContent value="map" className="animate-in slide-in-from-bottom-4 duration-500">
                <Card className="border-border shadow-md overflow-hidden">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Clock className="w-4 h-4 text-indigo-500" />
                            System Presence Timeline
                        </CardTitle>
                        <CardDescription className="text-xs">Visualizing transitions and duration over the last 24 hours</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <HeadspaceMap />
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
