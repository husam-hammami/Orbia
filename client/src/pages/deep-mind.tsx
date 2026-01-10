import { useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, 
  Activity, 
  AlertTriangle, 
  Network, 
  Loader2,
  Zap,
  RefreshCw,
  Clock,
  BarChart2,
  CheckCircle,
  XCircle,
  TrendingUp,
  Shield,
  Moon,
  ArrowRight,
  Layers
} from "lucide-react";
import { HeadspaceMap } from "@/components/headspace-map";
import { cn } from "@/lib/utils";
import { useDeepMindNow, useDeepMindLoops, useDeepMindVisualizations, useMembers, useTrackerEntries } from "@/lib/api-hooks";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

function ConfidenceBadge({ confidence, sampleSize }: { confidence: "Low" | "Medium" | "High"; sampleSize: number }) {
  const config = {
    Low: { 
      className: "bg-amber-500/20 text-amber-400 border-amber-500/30", 
      label: "early signal" 
    },
    Medium: { 
      className: "bg-blue-500/20 text-blue-400 border-blue-500/30", 
      label: "building" 
    },
    High: { 
      className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", 
      label: "validated" 
    },
  };
  
  const { className, label } = config[confidence];
  
  return (
    <Badge variant="outline" className={cn("text-[10px] font-mono", className)} data-testid="confidence-badge">
      N={sampleSize} • {label}
    </Badge>
  );
}

function IntensityBadge({ intensity }: { intensity: "Low" | "Medium" | "High" }) {
  const config = {
    Low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    Medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    High: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  };
  
  return (
    <Badge variant="outline" className={cn("text-[10px]", config[intensity])} data-testid="intensity-badge">
      {intensity}
    </Badge>
  );
}

export default function DeepMind() {
  const [activeTab, setActiveTab] = useState("now");
  const [sleepMetric, setSleepMetric] = useState<"mood" | "dissociation" | "urges">("mood");
  
  const { data: nowData, isLoading: nowLoading } = useDeepMindNow();
  const { data: loopsData, isLoading: loopsLoading } = useDeepMindLoops();
  const { data: visualsData, isLoading: visualsLoading } = useDeepMindVisualizations();
  const { data: members = [], isLoading: membersLoading } = useMembers();
  const { data: entries = [], isLoading: entriesLoading } = useTrackerEntries(2000);

  const stateDriverAssociations = useMemo(() => {
    if (entries.length === 0 || members.length === 0) return { associations: [], sampleSize: 0, confidence: "Low" as const };

    const memberDrivers: { [memberId: string]: { [driver: string]: number } } = {};
    let entriesWithData = 0;

    entries.forEach((entry: any) => {
      if (!entry.frontingMemberId) return;
      
      const memberId = entry.frontingMemberId;
      if (!memberDrivers[memberId]) {
        memberDrivers[memberId] = {};
      }

      const drivers: string[] = [];
      
      if (entry.triggerTag) {
        drivers.push(entry.triggerTag);
      }
      
      if (entry.sleepHours !== null && entry.sleepHours !== undefined) {
        if (entry.sleepHours < 5.5) {
          drivers.push("sleep <5.5h");
        } else if (entry.sleepHours < 7) {
          drivers.push("sleep 5.5-7h");
        }
      }
      
      if (entry.workTag) {
        drivers.push(`work: ${entry.workTag}`);
      }
      
      if (entry.workLoad !== null && entry.workLoad !== undefined && entry.workLoad >= 7) {
        drivers.push("high work load");
      }

      if (drivers.length > 0) {
        entriesWithData++;
        drivers.forEach(driver => {
          memberDrivers[memberId][driver] = (memberDrivers[memberId][driver] || 0) + 1;
        });
      }
    });

    const associations = members
      .filter((m: any) => memberDrivers[m.id] && Object.keys(memberDrivers[m.id]).length > 0)
      .map((member: any) => {
        const driverCounts = memberDrivers[member.id];
        const sorted = Object.entries(driverCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3);
        
        return {
          memberId: member.id,
          memberName: member.name,
          memberColor: member.color,
          topDrivers: sorted.map(([driver, count]) => ({ driver, count: count as number })),
          totalOccurrences: Object.values(driverCounts).reduce((a, b) => a + b, 0)
        };
      })
      .filter(a => a.topDrivers.length > 0)
      .sort((a, b) => b.totalOccurrences - a.totalOccurrences);

    const confidence: "Low" | "Medium" | "High" = 
      entriesWithData >= 50 ? "High" : 
      entriesWithData >= 20 ? "Medium" : "Low";

    return { associations, sampleSize: entriesWithData, confidence };
  }, [entries, members]);

  const timelineStats = useMemo(() => {
    if (entries.length === 0 || members.length === 0) return null;

    const memberCounts: { [id: string]: number } = {};
    let stateShifts = 0;
    let lastMemberId: string | null = null;
    const daysWithEntries = new Set<string>();

    entries.forEach((entry: any) => {
      if (!entry.frontingMemberId) return;
      
      memberCounts[entry.frontingMemberId] = (memberCounts[entry.frontingMemberId] || 0) + 1;
      
      if (lastMemberId && lastMemberId !== entry.frontingMemberId) {
        stateShifts++;
      }
      lastMemberId = entry.frontingMemberId;
      
      if (entry.timestamp) {
        const dateStr = new Date(entry.timestamp).toISOString().split('T')[0];
        daysWithEntries.add(dateStr);
      }
    });

    const topMemberId = Object.entries(memberCounts).sort(([, a], [, b]) => b - a)[0]?.[0];
    const topMember = members.find((m: any) => m.id === topMemberId);
    const avgShiftsPerDay = daysWithEntries.size > 0 
      ? Math.round(stateShifts / daysWithEntries.size * 10) / 10 
      : 0;

    return {
      mostCommonState: topMember?.name || "Unknown",
      avgShiftsPerDay,
      totalEntries: entries.length,
      daysTracked: daysWithEntries.size
    };
  }, [entries, members]);

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500 pb-20">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-6">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight">Deep Mind</h1>
            <p className="text-muted-foreground text-sm">Your mental state at a glance.</p>
          </div>
        </div>

        <Tabs defaultValue="now" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/30 border border-border/50 p-1">
            <TabsTrigger value="now" className="gap-2" data-testid="tab-now">
              <Zap className="w-4 h-4" /> Now
            </TabsTrigger>
            <TabsTrigger value="loops" className="gap-2" data-testid="tab-loops">
              <RefreshCw className="w-4 h-4" /> Your 3 Loops
            </TabsTrigger>
            <TabsTrigger value="visuals" className="gap-2" data-testid="tab-visuals">
              <BarChart2 className="w-4 h-4" /> Visualizations
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-2" data-testid="tab-timeline">
              <Clock className="w-4 h-4" /> State Timeline
            </TabsTrigger>
          </TabsList>

          <TabsContent value="now" className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            {nowLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
              </div>
            ) : nowData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-slate-950 border-slate-800">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="w-4 h-4 text-teal-400" /> NOW
                      </CardTitle>
                      <ConfidenceBadge confidence={nowData.driverConfidence} sampleSize={nowData.sampleSize} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between py-2 border-b border-slate-800">
                      <span className="text-sm text-slate-400">Driver</span>
                      <span className="text-sm font-semibold text-slate-100">{nowData.driver}</span>
                    </div>
                    
                    <div className="flex items-center justify-between py-2 border-b border-slate-800">
                      <span className="text-sm text-slate-400">State</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-100">{nowData.state}</span>
                        <IntensityBadge intensity={nowData.stateIntensity} />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="bg-slate-900 rounded-lg p-3 text-center">
                        <div className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1">Load</div>
                        <div className={cn(
                          "text-xl font-mono font-bold",
                          nowData.load > 70 ? "text-rose-400" : nowData.load > 40 ? "text-amber-400" : "text-emerald-400"
                        )}>
                          {nowData.load}%
                        </div>
                      </div>
                      <div className="bg-slate-900 rounded-lg p-3 text-center">
                        <div className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1">Stability</div>
                        <div className={cn(
                          "text-xl font-mono font-bold",
                          nowData.stability > 60 ? "text-emerald-400" : nowData.stability > 40 ? "text-amber-400" : "text-rose-400"
                        )}>
                          {nowData.stability}%
                        </div>
                      </div>
                    </div>
                    
                    {nowData.riskFlag && (
                      <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg mt-4">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span className="text-xs text-rose-400 font-medium">{nowData.riskFlag}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card className="bg-slate-950 border-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Brain className="w-4 h-4 text-emerald-400" /> Smart Suggestion
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[10px] uppercase text-emerald-500 font-bold tracking-wider mb-1">Do</div>
                        <p className="text-sm text-slate-100">{nowData.suggestion.do}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                      <XCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[10px] uppercase text-amber-500 font-bold tracking-wider mb-1">Avoid (next 12-24h)</div>
                        <p className="text-sm text-slate-100">{nowData.suggestion.avoid}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="bg-slate-950 border-slate-800">
                <CardContent className="py-12 text-center">
                  <Activity className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No data available yet</p>
                  <p className="text-slate-600 text-xs mt-1">Start logging entries to see your current state</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="loops" className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            {loopsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
              </div>
            ) : loopsData ? (
              <div className="space-y-6">
                <div className="flex items-center justify-end">
                  <ConfidenceBadge confidence={loopsData.confidence} sampleSize={loopsData.sampleSize} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="bg-slate-950 border-slate-800">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400" /> Top 3 Triggers
                      </CardTitle>
                      <CardDescription className="text-xs">What destabilizes you most</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {loopsData.triggers.length > 0 ? (
                        <ul className="space-y-3">
                          {loopsData.triggers.map((trigger, i) => (
                            <li key={i} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-rose-500/20 flex items-center justify-center text-[10px] font-bold text-rose-400">
                                  {i + 1}
                                </span>
                                <span className="text-sm text-slate-200">{trigger.name}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span>{trigger.count}×</span>
                                <span>•</span>
                                <span>{trigger.recency === 0 ? "today" : `${trigger.recency}d ago`}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-slate-500 text-center py-4">No triggers detected yet</p>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-slate-950 border-slate-800">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Shield className="w-4 h-4 text-emerald-400" /> Top 3 Stabilizers
                      </CardTitle>
                      <CardDescription className="text-xs">What helps you recover</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {loopsData.stabilizers.length > 0 ? (
                        <ul className="space-y-3">
                          {loopsData.stabilizers.map((stabilizer, i) => (
                            <li key={i} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] font-bold text-emerald-400">
                                  {i + 1}
                                </span>
                                <span className="text-sm text-slate-200">{stabilizer.name}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-slate-500">{stabilizer.count}×</span>
                                <Badge variant="outline" className={cn(
                                  "text-[9px]",
                                  stabilizer.effect === "Strong" ? "border-emerald-500 text-emerald-400" :
                                  stabilizer.effect === "Moderate" ? "border-blue-500 text-blue-400" :
                                  "border-slate-500 text-slate-400"
                                )}>
                                  {stabilizer.effect}
                                </Badge>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-slate-500 text-center py-4">No stabilizers detected yet</p>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-slate-950 border-slate-800">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-amber-400" /> Top 3 Crash Loops
                      </CardTitle>
                      <CardDescription className="text-xs">Repeating negative patterns</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {loopsData.crashLoops.length > 0 ? (
                        <ul className="space-y-4">
                          {loopsData.crashLoops.map((loop, i) => (
                            <li key={i} className="space-y-2 pb-3 border-b border-slate-800 last:border-0">
                              <div className="flex items-start gap-2">
                                <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px] font-bold text-amber-400 shrink-0">
                                  {i + 1}
                                </span>
                                <span className="text-sm text-slate-200 font-mono">{loop.pattern}</span>
                              </div>
                              <div className="flex items-center justify-between pl-7 text-xs">
                                <span className="text-slate-500">
                                  {loop.count}× • {loop.recency === 0 ? "today" : `${loop.recency}d ago`}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 pl-7 mt-1">
                                <TrendingUp className="w-3 h-3 text-teal-400" />
                                <span className="text-xs text-teal-400">{loop.interrupt}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-slate-500 text-center py-4">No crash loops detected yet</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <Card className="bg-slate-950 border-slate-800">
                <CardContent className="py-12 text-center">
                  <RefreshCw className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No loop data available yet</p>
                  <p className="text-slate-600 text-xs mt-1">Keep logging to discover your patterns</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="visuals" className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            {visualsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
              </div>
            ) : visualsData ? (
              <div className="grid grid-cols-1 gap-6">
                <Card className="bg-slate-950 border-slate-800">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Moon className="w-4 h-4 text-indigo-400" />
                        <CardTitle className="text-base">Sleep Hours vs {sleepMetric === "mood" ? "Mood" : sleepMetric === "dissociation" ? "Dissociation" : "Stress/Urges"}</CardTitle>
                      </div>
                      <ConfidenceBadge confidence={visualsData.sleepImpact.confidence} sampleSize={visualsData.sleepImpact.sampleSize} />
                    </div>
                    <CardDescription className="text-xs">Sleep is your highest-leverage variable</CardDescription>
                    <div className="flex gap-1 mt-2">
                      {(["mood", "dissociation", "urges"] as const).map((metric) => (
                        <button
                          key={metric}
                          onClick={() => setSleepMetric(metric)}
                          className={cn(
                            "px-3 py-1 text-xs rounded-full transition-colors",
                            sleepMetric === metric
                              ? "bg-teal-500/20 text-teal-400 border border-teal-500/40"
                              : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
                          )}
                          data-testid={`toggle-${metric}`}
                        >
                          {metric === "mood" ? "Mood" : metric === "dissociation" ? "Dissociation" : "Stress/Urges"}
                        </button>
                      ))}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {visualsData.sleepImpact.data.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={visualsData.sleepImpact.data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis 
                            dataKey="sleepHours" 
                            tick={{ fill: '#94a3b8', fontSize: 12 }} 
                            axisLine={{ stroke: '#475569' }}
                          />
                          <YAxis 
                            tick={{ fill: '#94a3b8', fontSize: 12 }} 
                            axisLine={{ stroke: '#475569' }}
                            domain={sleepMetric === "mood" ? [0, 10] : [0, 100]}
                          />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                            labelStyle={{ color: '#f1f5f9' }}
                            itemStyle={{ color: '#94a3b8' }}
                            formatter={(value: number, name: string) => [
                              `${value}${sleepMetric === "mood" ? "/10" : "%"}`,
                              sleepMetric === "mood" ? "Avg Mood" : sleepMetric === "dissociation" ? "Avg Dissociation" : "Avg Stress"
                            ]}
                          />
                          <Bar 
                            dataKey={sleepMetric} 
                            fill={sleepMetric === "mood" ? "#14b8a6" : sleepMetric === "dissociation" ? "#f59e0b" : "#ef4444"}
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="py-12 text-center">
                        <Moon className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-500 text-sm">No sleep data yet</p>
                        <p className="text-slate-600 text-xs mt-1">Log your sleep hours to see the impact</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-slate-950 border-slate-800">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-amber-400" />
                        <CardTitle className="text-base">Driver Frequency Over Time</CardTitle>
                      </div>
                      <ConfidenceBadge confidence={visualsData.driverFrequency.confidence} sampleSize={visualsData.driverFrequency.sampleSize} />
                    </div>
                    <CardDescription className="text-xs">What's been running your life lately</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {visualsData.driverFrequency.data.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={visualsData.driverFrequency.data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis 
                            dataKey="week" 
                            tick={{ fill: '#94a3b8', fontSize: 11 }} 
                            axisLine={{ stroke: '#475569' }}
                          />
                          <YAxis 
                            tick={{ fill: '#94a3b8', fontSize: 12 }} 
                            axisLine={{ stroke: '#475569' }}
                          />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                            labelStyle={{ color: '#f1f5f9' }}
                          />
                          <Legend 
                            wrapperStyle={{ fontSize: '11px' }}
                            iconSize={10}
                          />
                          <Bar dataKey="sleep" stackId="a" fill="#6366f1" name="Sleep" />
                          <Bar dataKey="work" stackId="a" fill="#f59e0b" name="Work" />
                          <Bar dataKey="loneliness" stackId="a" fill="#8b5cf6" name="Loneliness" />
                          <Bar dataKey="pain" stackId="a" fill="#ef4444" name="Pain" />
                          <Bar dataKey="urges" stackId="a" fill="#ec4899" name="Urges" />
                          <Bar dataKey="anxiety" stackId="a" fill="#14b8a6" name="Anxiety" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="py-12 text-center">
                        <TrendingUp className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-500 text-sm">No driver data yet</p>
                        <p className="text-slate-600 text-xs mt-1">Tag drivers in your journal entries to see patterns</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="bg-slate-950 border-slate-800">
                <CardContent className="py-12 text-center">
                  <BarChart2 className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No visualization data available yet</p>
                  <p className="text-slate-600 text-xs mt-1">Start logging entries to see your patterns</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="timeline" className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            {(membersLoading || entriesLoading) ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-indigo-500" />
                    <div>
                      <h2 className="text-lg font-semibold">State Timeline</h2>
                      <p className="text-xs text-muted-foreground">State distribution and patterns over time</p>
                    </div>
                  </div>
                  <ConfidenceBadge 
                    confidence={stateDriverAssociations.confidence} 
                    sampleSize={entries.length} 
                  />
                </div>

                {timelineStats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card className="bg-slate-950 border-slate-800">
                      <CardContent className="p-4">
                        <div className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1">Most Common State</div>
                        <div className="text-lg font-semibold text-slate-100">{timelineStats.mostCommonState}</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-slate-950 border-slate-800">
                      <CardContent className="p-4">
                        <div className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1">Avg State Shifts/Day</div>
                        <div className="text-lg font-semibold text-slate-100">{timelineStats.avgShiftsPerDay}</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-slate-950 border-slate-800">
                      <CardContent className="p-4">
                        <div className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1">Total Entries</div>
                        <div className="text-lg font-semibold text-slate-100">{timelineStats.totalEntries}</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-slate-950 border-slate-800">
                      <CardContent className="p-4">
                        <div className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1">Days Tracked</div>
                        <div className="text-lg font-semibold text-slate-100">{timelineStats.daysTracked}</div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                <Card className="border-border shadow-md overflow-hidden">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Layers className="w-4 h-4 text-violet-500" />
                      State Distribution
                    </CardTitle>
                    <CardDescription className="text-xs">State patterns and transitions over time</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <HeadspaceMap />
                  </CardContent>
                </Card>

                <Card className="bg-slate-950 border-slate-800">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <ArrowRight className="w-4 h-4 text-amber-400" />
                        State → Driver Association
                      </CardTitle>
                      <ConfidenceBadge 
                        confidence={stateDriverAssociations.confidence} 
                        sampleSize={stateDriverAssociations.sampleSize} 
                      />
                    </div>
                    <CardDescription className="text-xs">Which drivers tend to precede which states</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {stateDriverAssociations.associations.length > 0 ? (
                      <div className="space-y-4">
                        {stateDriverAssociations.associations.slice(0, 5).map((assoc) => (
                          <div 
                            key={assoc.memberId} 
                            className="p-4 rounded-lg border border-slate-800 bg-slate-900/50"
                            data-testid={`state-driver-${assoc.memberId}`}
                          >
                            <div className="flex items-center gap-3 mb-3">
                              <div 
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                                style={{ backgroundColor: assoc.memberColor }}
                              >
                                {assoc.memberName.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-semibold text-slate-100">{assoc.memberName}</span>
                                <span className="text-slate-500 text-sm"> state most often follows:</span>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {assoc.topDrivers.map(({ driver, count }, i) => (
                                <Badge 
                                  key={driver} 
                                  variant="outline" 
                                  className={cn(
                                    "text-xs",
                                    i === 0 
                                      ? "bg-amber-500/20 text-amber-400 border-amber-500/30" 
                                      : "bg-slate-800 text-slate-300 border-slate-700"
                                  )}
                                >
                                  {driver} ({count}×)
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center">
                        <ArrowRight className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-500 text-sm">No driver associations found yet</p>
                        <p className="text-slate-600 text-xs mt-1">Log entries with triggers, sleep data, or work tags to see patterns</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
