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
  Legend
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
  Lightbulb
} from "lucide-react";
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
    enabled: activeTab === "analysis",
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
    .map(entry => ({
      time: format(new Date(entry.timestamp), "h:mm a"),
      dissociation: entry.dissociation || 0,
      stress: entry.stress || 0,
      mood: (entry.mood || 5) * 20,
      energy: (entry.energy || 5) * 20,
    }));
  
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

    createEntryMutation.mutate({
      frontingMemberId: selectedMember.id,
      mood: Math.round((100 - stress[0]) / 20),
      energy: Math.round(communication[0] / 20),
      stress: stress[0],
      dissociation: dissociation[0],
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

  const alterPositions = (members || []).map((member, i) => ({
    name: member.name,
    x: 30 + (i % 3) * 25,
    y: 30 + Math.floor(i / 3) * 25,
    z: member.location === "front" ? 90 : 50,
    status: member.location === "front" ? "Fronting" : member.location || "Internal",
  }));

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
                <TabsTrigger value="map" className="gap-2" data-testid="tab-map"><Network className="w-4 h-4" /> Headspace Map</TabsTrigger>
            </TabsList>

            <TabsContent value="monitor" className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    <Card className="lg:col-span-4 border-l-4 border-l-indigo-500 shadow-lg">
                        <CardHeader className="bg-muted/10 pb-4">
                            <CardTitle className="flex items-center justify-between text-lg">
                                <span>Neural Logger</span>
                                <Cpu className="w-4 h-4 text-indigo-500 animate-pulse" />
                            </CardTitle>
                            <CardDescription>Log current system parameters</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            
                            <div className="space-y-3">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <Users className="w-3.5 h-3.5" /> Active Front
                                </label>
                                {membersLoading ? (
                                  <div className="flex items-center justify-center py-4">
                                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                  </div>
                                ) : members && members.length > 0 ? (
                                  <div className="grid grid-cols-3 gap-2">
                                      {members.slice(0, 6).map(member => (
                                          <button
                                              key={member.id}
                                              onClick={() => setSelectedMemberId(member.id)}
                                              data-testid={`button-select-member-${member.id}`}
                                              className={cn(
                                                  "text-xs p-2 rounded border transition-all text-center font-medium truncate",
                                                  selectedMember?.id === member.id 
                                                      ? "bg-indigo-500 text-white border-indigo-600 shadow-md transform scale-105" 
                                                      : "bg-background border-border hover:bg-muted text-muted-foreground"
                                              )}
                                              style={{ 
                                                  borderColor: selectedMember?.id === member.id ? member.color : undefined,
                                                  backgroundColor: selectedMember?.id === member.id ? member.color : undefined
                                              }}
                                          >
                                              {member.name}
                                          </button>
                                      ))}
                                      <button className="text-xs p-2 rounded border border-dashed border-border text-muted-foreground hover:bg-muted flex items-center justify-center">
                                          <Plus className="w-3 h-3" />
                                      </button>
                                  </div>
                                ) : (
                                  <div className="text-center py-4 text-muted-foreground text-sm">
                                    No members yet. Add members in System Insight.
                                  </div>
                                )}
                            </div>

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
                            
                            <Button 
                              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20" 
                              size="lg"
                              onClick={handleCommitLog}
                              disabled={createEntryMutation.isPending || !selectedMember}
                              data-testid="button-commit-log"
                            >
                                {createEntryMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <Save className="w-4 h-4 mr-2" />
                                )}
                                Commit System Log
                            </Button>
                        </CardContent>
                    </Card>

                    <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        <Card className="md:col-span-2 bg-slate-950 border-slate-800 shadow-2xl overflow-hidden relative group">
                            <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f46e520_1px,transparent_1px),linear-gradient(to_bottom,#4f46e520_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
                            <CardHeader className="relative z-10 pb-2">
                                <CardTitle className="text-slate-100 flex items-center gap-2 text-base font-mono">
                                    <Activity className="w-4 h-4 text-emerald-400" /> Real-time System Coherence
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="h-[250px] relative z-10 pl-0">
                                {coherenceChartData.length > 0 ? (
                                  <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={coherenceChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                      <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                                      <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} />
                                      <Tooltip 
                                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                                        labelStyle={{ color: '#94a3b8' }}
                                      />
                                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                                      <Line type="monotone" dataKey="dissociation" stroke="#f43f5e" strokeWidth={2} dot={{ fill: '#f43f5e', r: 3 }} name="Dissociation" />
                                      <Line type="monotone" dataKey="stress" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} name="Stress" />
                                      <Line type="monotone" dataKey="mood" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} name="Mood" />
                                    </LineChart>
                                  </ResponsiveContainer>
                                ) : (
                                  <div className="h-full flex items-center justify-center text-center space-y-2">
                                    <div>
                                      <Activity className="w-8 h-8 text-slate-700 mx-auto animate-pulse" />
                                      <p className="text-slate-500 text-sm mt-2">Awaiting Data Points</p>
                                      <p className="text-slate-600 text-xs">Log multiple entries to visualize coherence trends.</p>
                                    </div>
                                  </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="flex flex-col">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <History className="w-4 h-4 text-muted-foreground" />
                                    Recent Logs
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 p-0">
                                <ScrollArea className="h-[250px] px-4">
                                    {entriesLoading ? (
                                      <div className="flex items-center justify-center py-8">
                                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                      </div>
                                    ) : recentLogs.length > 0 ? (
                                      <div className="space-y-4 pb-4">
                                          {recentLogs.map((log, i) => (
                                              <div key={i} className="flex gap-3 items-start p-3 rounded-lg bg-muted/30 border border-border/50 text-sm">
                                                  <div className="min-w-[60px] font-mono text-xs text-muted-foreground pt-0.5">{log.time}</div>
                                                  <div className="space-y-1 flex-1">
                                                      <div className="flex justify-between items-center">
                                                          <span className="font-semibold text-indigo-500">{log.front}</span>
                                                          <Badge variant="outline" className="text-[10px] h-4 px-1">Dis: {log.dissociation}%</Badge>
                                                      </div>
                                                      {log.note && <p className="text-muted-foreground text-xs leading-snug">{log.note}</p>}
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                    ) : (
                                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                                        <History className="w-8 h-8 mb-2 opacity-30" />
                                        <p className="text-sm">No logs yet</p>
                                      </div>
                                    )}
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        <Card>
                             <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Layers className="w-4 h-4 text-muted-foreground" />
                                    System Balance
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="h-[250px] flex items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={systemStats}>
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

            <TabsContent value="analysis" className="animate-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     <Card className="md:col-span-2 lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-indigo-500" />
                                AI Pattern Analysis
                            </CardTitle>
                            <CardDescription>Deep Mind's analysis of your mood, habits, and routine patterns.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-600 dark:text-blue-400 flex items-start gap-2">
                                <Activity className="w-4 h-4 shrink-0 mt-0.5" />
                                <div>
                                    <strong>High-Resolution Analysis Active:</strong> Deep Mind is analyzing intra-day variance. 
                                    Fluctuations in stress and dissociation throughout the day are weighted heavily to prevent data flattening.
                                </div>
                            </div>
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
                                
                                {insights.correlationHighlights && insights.correlationHighlights.length > 0 && (
                                  <div className="p-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-lg border border-indigo-500/20">
                                    <h4 className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-3 flex items-center gap-2">
                                      <TrendingUp className="w-4 h-4" />
                                      Key Correlations Detected
                                    </h4>
                                    <div className="grid gap-2">
                                      {insights.correlationHighlights.map((corr: any, i: number) => (
                                        <div key={i} className="flex items-center gap-2 text-xs bg-background/50 p-2 rounded">
                                          <span className="font-medium">{corr.factor1}</span>
                                          <span className={cn(
                                            "px-1.5 py-0.5 rounded text-[10px] font-bold",
                                            corr.relationship === 'positive' ? 'bg-emerald-500/20 text-emerald-600' :
                                            corr.relationship === 'negative' ? 'bg-rose-500/20 text-rose-600' :
                                            'bg-slate-500/20 text-slate-600'
                                          )}>
                                            {corr.relationship === 'positive' ? '↑' : corr.relationship === 'negative' ? '↓' : '~'}
                                          </span>
                                          <span className="font-medium">{corr.factor2}</span>
                                          <Badge variant="outline" className="ml-auto text-[10px]">{corr.strength}</Badge>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                <div className="space-y-3">
                                  {insights.insights.map((insight: any, i: number) => {
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
                                      <div key={i} className={cn(
                                        "p-4 rounded-lg border-l-4",
                                        categoryColors[insight.category] || 'border-l-slate-500 bg-muted/30'
                                      )}>
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                          <div className="flex items-center gap-2">
                                            <span className="text-lg">{categoryIcons[insight.category] || '💡'}</span>
                                            <h4 className="font-semibold text-sm text-foreground">{insight.title}</h4>
                                          </div>
                                          <div className="flex items-center gap-1.5">
                                            {insight.dataPoint && (
                                              <Badge className="bg-primary/20 text-primary text-[10px] font-bold">
                                                {insight.dataPoint}
                                              </Badge>
                                            )}
                                            {insight.confidence && (
                                              <Badge variant="outline" className={cn(
                                                "text-[10px]",
                                                insight.confidence === 'strong' ? 'border-emerald-500 text-emerald-600' :
                                                insight.confidence === 'moderate' ? 'border-amber-500 text-amber-600' :
                                                'border-slate-400 text-slate-500'
                                              )}>
                                                {insight.confidence}
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-2">{insight.observation}</p>
                                        {insight.suggestion && (
                                          <p className="text-xs text-primary/80 bg-primary/10 p-2 rounded flex items-start gap-1.5">
                                            <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                            <span>{insight.suggestion}</span>
                                          </p>
                                        )}
                                      </div>
                                    );
                                  })}
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

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Fingerprint className="w-5 h-5 text-purple-500" />
                                Identity Fragment Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {frontingPatterns.length > 0 ? (
                              <div className="space-y-3">
                                {frontingPatterns.map((pattern, i) => (
                                  <div key={i} className="p-3 bg-muted/30 rounded-lg border border-border/50">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-semibold text-sm" style={{ color: pattern.color }}>{pattern.name}</span>
                                      <Badge variant="secondary" className="text-[10px]">{pattern.count} entries</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Avg stress: {pattern.avgStress}% | Avg dissociation: {pattern.avgDissociation}%</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
                                <Users className="w-10 h-10 text-muted-foreground/20" />
                                <p className="text-sm text-muted-foreground">Insufficient Data</p>
                                <p className="text-xs text-muted-foreground/60">
                                    Log "Who is Fronting" consistently to enable fragment analysis.
                                </p>
                              </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>

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
                        {membersLoading ? (
                          <div className="flex items-center justify-center h-full">
                            <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
                          </div>
                        ) : alterPositions.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-slate-500">
                            <Users className="w-12 h-12 mb-3 opacity-30" />
                            <p>No members to display</p>
                            <p className="text-xs text-slate-600 mt-1">Add members in System Insight to see them here</p>
                          </div>
                        ) : (
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
                                  <Scatter name="Alters" data={alterPositions} fill="#8884d8">
                                      {alterPositions.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={entry.status === 'Fronting' ? '#6366f1' : entry.status === 'Co-con' ? '#a855f7' : '#64748b'} />
                                      ))}
                                  </Scatter>
                              </ScatterChart>
                          </ResponsiveContainer>
                        )}
                        
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-10">
                            <div className="w-[200px] h-[200px] rounded-full border border-indigo-500"></div>
                            <div className="absolute w-[400px] h-[400px] rounded-full border border-indigo-500"></div>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
