import { useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Brain, 
  Activity, 
  Users, 
  Zap, 
  AlertTriangle, 
  Ghost,
  Cpu,
  Save,
  History,
  Loader2,
  Sparkles,
  TrendingUp,
  Shield,
  ChevronDown,
  Mic2,
  CloudSun,
  Moon,
  Briefcase
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMembers, useTrackerEntries, useCreateTrackerEntry, useAllRoutineLogs } from "@/lib/api-hooks";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { analyzeSystem, type StabilityLevel, type PressureLevel } from "@/lib/system-analytics";

const stabilityConfig: Record<StabilityLevel, { label: string; color: string; bg: string; description: string }> = {
  stable: { 
    label: "Stable", 
    color: "text-slate-600 dark:text-slate-300", 
    bg: "bg-slate-100 dark:bg-slate-800",
    description: "The system is holding steady"
  },
  variable: { 
    label: "Variable", 
    color: "text-amber-600 dark:text-amber-400", 
    bg: "bg-amber-50 dark:bg-amber-900/20",
    description: "Some fluctuation is present"
  },
  strained: { 
    label: "Strained", 
    color: "text-slate-500 dark:text-slate-400", 
    bg: "bg-slate-50 dark:bg-slate-900/30",
    description: "The system is under pressure"
  },
};

const pressureConfig: Record<PressureLevel, { bars: number; color: string }> = {
  low: { bars: 1, color: "bg-slate-400" },
  medium: { bars: 3, color: "bg-amber-400" },
  high: { bars: 5, color: "bg-amber-500" },
  variable: { bars: 4, color: "bg-slate-500" },
};

function PressureBar({ level }: { level: PressureLevel }) {
  const config = pressureConfig[level];
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className={cn(
            "w-3 h-4 rounded-sm transition-colors",
            i <= config.bars ? config.color : "bg-muted"
          )}
        />
      ))}
    </div>
  );
}

function StatePresenceBar({ percentage, color }: { percentage: number; color: string }) {
  return (
    <div className="flex gap-0.5 flex-1">
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div
          key={i}
          className={cn(
            "h-5 flex-1 rounded-sm transition-colors",
            (percentage / 100) * 7 >= i ? "" : "bg-muted"
          )}
          style={{ backgroundColor: (percentage / 100) * 7 >= i ? color : undefined }}
        />
      ))}
    </div>
  );
}

export default function DeepMind() {
  const [activeTab, setActiveTab] = useState("monitor");
  const [timePeriod, setTimePeriod] = useState<"24h" | "7d">("7d");
  
  const { data: members, isLoading: membersLoading } = useMembers();
  const { data: trackerEntries, isLoading: entriesLoading } = useTrackerEntries(30);
  const { data: routineLogs = [] } = useAllRoutineLogs();
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
  
  const systemAnalytics = useMemo(() => {
    if (!trackerEntries || !members) return null;
    const days = timePeriod === "24h" ? 1 : 7;
    return analyzeSystem(trackerEntries, members, routineLogs, days);
  }, [trackerEntries, members, routineLogs, timePeriod]);

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
      capacity: null,
      triggerTag: null,
      workLoad: null,
      workTag: null,
      timeOfDay: null,
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
      date: format(new Date(entry.timestamp), "MMM d"),
      dissociation: entry.dissociation || 0,
      stress: entry.stress || 0,
      front: member?.name || "Unknown",
      note: entry.notes || "",
    };
  });

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500 pb-20">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/40 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="bg-slate-500/10 text-slate-500 border-slate-500/20 px-2 py-0.5 text-xs font-mono uppercase tracking-wider">
                Deep Mind
              </Badge>
              <Badge variant="outline" className="bg-slate-500/10 text-slate-500 border-slate-500/20 px-2 py-0.5 text-xs font-mono uppercase tracking-wider flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-slate-500"></span>
                </span>
                Active
              </Badge>
            </div>
            <h1 className="text-3xl font-display font-bold tracking-tight">System Overview</h1>
            <p className="text-muted-foreground text-sm">Track, understand, and support your system.</p>
          </div>

          <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-lg border border-border/50">
            <Button
              variant={timePeriod === "24h" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setTimePeriod("24h")}
              className="text-xs"
              data-testid="button-period-24h"
            >
              Last 24h
            </Button>
            <Button
              variant={timePeriod === "7d" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setTimePeriod("7d")}
              className="text-xs"
              data-testid="button-period-7d"
            >
              Last 7 Days
            </Button>
          </div>
        </div>

        <Tabs defaultValue="monitor" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/30 border border-border/50 p-1">
            <TabsTrigger value="monitor" className="gap-2" data-testid="tab-monitor">
              <Activity className="w-4 h-4" /> Monitor
            </TabsTrigger>
            <TabsTrigger value="analysis" className="gap-2" data-testid="tab-analysis">
              <Brain className="w-4 h-4" /> Analysis
            </TabsTrigger>
          </TabsList>

          <TabsContent value="monitor" className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              <Card className="lg:col-span-4 border-l-4 border-l-slate-400 shadow-lg">
                <CardHeader className="bg-muted/10 pb-4">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <span>Quick Log</span>
                    <Cpu className="w-4 h-4 text-slate-500 animate-pulse" />
                  </CardTitle>
                  <CardDescription>Log current system state</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  
                  <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Users className="w-3.5 h-3.5" /> Who's Present
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
                                ? "bg-slate-600 text-white border-slate-700 shadow-md" 
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
                        <span className="flex items-center gap-1.5"><Ghost className="w-3.5 h-3.5 text-slate-500" /> Dissociation</span>
                        <span className="font-mono">{dissociation}%</span>
                      </div>
                      <Slider value={dissociation} onValueChange={setDissociation} max={100} step={1} className="[&>span:first-child]:bg-slate-500/20 [&_[role=slider]]:bg-slate-500" />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="flex items-center gap-1.5"><Mic2 className="w-3.5 h-3.5 text-sky-500" /> Communication</span>
                        <span className="font-mono">{communication}%</span>
                      </div>
                      <Slider value={communication} onValueChange={setCommunication} max={100} step={1} className="[&>span:first-child]:bg-sky-500/20 [&_[role=slider]]:bg-sky-500" />
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
                        <span className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-slate-400" /> Intrusive Urges</span>
                        <span className="font-mono">{urges}%</span>
                      </div>
                      <Slider value={urges} onValueChange={setUrges} max={100} step={1} className="[&>span:first-child]:bg-slate-400/20 [&_[role=slider]]:bg-slate-400" />
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full bg-slate-600 hover:bg-slate-700 text-white shadow-lg shadow-slate-500/20" 
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
                    Commit Log
                  </Button>
                </CardContent>
              </Card>

              <div className="lg:col-span-8 space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  <Card className="border-l-4 border-l-sky-400" data-testid="card-state-activity">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Users className="w-4 h-4 text-sky-500" />
                        State Activity
                      </CardTitle>
                      <CardDescription className="text-xs">Who's been present</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {entriesLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : systemAnalytics && systemAnalytics.stateFrequencies.length > 0 ? (
                        systemAnalytics.stateFrequencies.slice(0, 4).map((state, i) => (
                          <div key={i} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-medium">{state.stateName}</span>
                              <span className="text-muted-foreground">{state.percentage}%</span>
                            </div>
                            <StatePresenceBar percentage={state.percentage} color={state.color} />
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 text-muted-foreground text-sm">
                          <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p>Start logging to see state activity</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-amber-400" data-testid="card-stability-meter">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Shield className="w-4 h-4 text-amber-500" />
                        System Stability
                      </CardTitle>
                      <CardDescription className="text-xs">Informational</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {entriesLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : systemAnalytics ? (
                        <div className="space-y-4">
                          <div className={cn(
                            "p-4 rounded-lg text-center",
                            stabilityConfig[systemAnalytics.stability.level].bg
                          )}>
                            <div className={cn(
                              "text-2xl font-bold mb-1",
                              stabilityConfig[systemAnalytics.stability.level].color
                            )}>
                              {stabilityConfig[systemAnalytics.stability.level].label}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {stabilityConfig[systemAnalytics.stability.level].description}
                            </div>
                          </div>
                          
                          {systemAnalytics.nothingChanged && systemAnalytics.nothingChangedMessage && (
                            <div className="p-3 bg-sky-50 dark:bg-sky-900/20 rounded-lg border border-sky-200 dark:border-sky-800">
                              <p className="text-xs text-sky-700 dark:text-sky-300">
                                {systemAnalytics.nothingChangedMessage}
                              </p>
                            </div>
                          )}
                          
                          <Collapsible>
                            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground w-full">
                              <ChevronDown className="w-3 h-3" />
                              Details
                            </CollapsibleTrigger>
                            <CollapsibleContent className="pt-2">
                              <div className="space-y-1 text-xs text-muted-foreground">
                                <div className="flex justify-between">
                                  <span>State switches:</span>
                                  <span>{systemAnalytics.stability.factors.stateSwitches}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Routine consistency:</span>
                                  <span>{systemAnalytics.stability.factors.routineConsistency}%</span>
                                </div>
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        </div>
                      ) : (
                        <div className="text-center py-6 text-muted-foreground text-sm">
                          <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p>More data needed</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-slate-400" data-testid="card-external-pressure">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <CloudSun className="w-4 h-4 text-slate-500" />
                        External Load
                      </CardTitle>
                      <CardDescription className="text-xs">This is not all from you</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {entriesLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : systemAnalytics && systemAnalytics.pressureSources.length > 0 ? (
                        systemAnalytics.pressureSources.map((source, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {source.source === "Work" && <Briefcase className="w-3.5 h-3.5 text-slate-500" />}
                              {source.source === "Pain" && <Zap className="w-3.5 h-3.5 text-amber-500" />}
                              {source.source === "Sleep" && <Moon className="w-3.5 h-3.5 text-sky-500" />}
                              <span className="text-sm font-medium">{source.source}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground capitalize">{source.level}</span>
                              <PressureBar level={source.level} />
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 text-muted-foreground text-sm">
                          <CloudSun className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p>No pressure data yet</p>
                          <p className="text-xs mt-1">Log work load and metrics</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

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
                              <div className="min-w-[60px] font-mono text-xs text-muted-foreground pt-0.5">
                                <div>{log.time}</div>
                                <div className="text-[10px]">{log.date}</div>
                              </div>
                              <div className="space-y-1 flex-1">
                                <div className="flex justify-between items-center">
                                  <span className="font-semibold text-slate-600 dark:text-slate-300">{log.front}</span>
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

              </div>
            </div>
          </TabsContent>

          <TabsContent value="analysis" className="animate-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-slate-500" />
                    Pattern Analysis
                  </CardTitle>
                  <CardDescription>Insights from your tracking data.</CardDescription>
                </CardHeader>
                <CardContent>
                  {insightsLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                      <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
                      <p className="text-muted-foreground text-sm">Analyzing patterns...</p>
                    </div>
                  ) : insights?.insights && insights.insights.length > 0 ? (
                    <div className="space-y-4">
                      {insights.encouragement && (
                        <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300">
                          {insights.encouragement}
                        </div>
                      )}
                      
                      {(() => {
                        const meaningfulCorrelations = insights.correlationHighlights?.filter((c: any) => 
                          c.strength === 'strong' || c.strength === 'moderate'
                        ) || [];
                        
                        if (meaningfulCorrelations.length === 0) return null;
                        
                        return (
                          <div className="p-4 bg-gradient-to-r from-slate-100 to-sky-50 dark:from-slate-800 dark:to-sky-900/20 rounded-lg border border-slate-200 dark:border-slate-700">
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                              <TrendingUp className="w-4 h-4" />
                              Validated Patterns
                            </h4>
                            <div className="grid md:grid-cols-2 gap-3">
                              {meaningfulCorrelations.map((corr: any, i: number) => (
                                <div key={i} className="flex items-center gap-3 bg-background/50 p-3 rounded-lg">
                                  <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0",
                                    corr.relationship === 'positive' ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-600' :
                                    corr.relationship === 'negative' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' :
                                    'bg-slate-100 dark:bg-slate-800 text-slate-600'
                                  )}>
                                    {corr.relationship === 'positive' ? '↑' : corr.relationship === 'negative' ? '↓' : '~'}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate">{corr.factor1} → {corr.factor2}</div>
                                    <div className="text-xs text-muted-foreground">{corr.summary}</div>
                                  </div>
                                  <Badge variant="outline" className={cn(
                                    "shrink-0 text-[10px]",
                                    corr.strength === 'strong' ? 'border-sky-500 text-sky-600' : 'border-amber-500 text-amber-600'
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
                            sleep: 'border-l-sky-400 bg-sky-50/50 dark:bg-sky-900/10',
                            habits: 'border-l-slate-400 bg-slate-50/50 dark:bg-slate-900/10',
                            routines: 'border-l-amber-400 bg-amber-50/50 dark:bg-amber-900/10',
                            system: 'border-l-slate-500 bg-slate-50/50 dark:bg-slate-900/10',
                            overall: 'border-l-slate-400 bg-slate-50/50 dark:bg-slate-900/10',
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
                                    categoryColors[insight.category] || 'border-l-slate-400 bg-muted/30'
                                  )}>
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                      <div className="flex items-center gap-2">
                                        <span>{categoryIcons[insight.category] || '💡'}</span>
                                        <h4 className="font-semibold text-sm text-foreground">{insight.title}</h4>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        {insight.dataPoint && (
                                          <Badge className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                                            {insight.dataPoint}
                                          </Badge>
                                        )}
                                        <Badge variant="outline" className={cn(
                                          "text-[10px]",
                                          insight.confidence === 'strong' ? 'border-sky-500 text-sky-600' :
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
                                <div className="p-6 bg-gradient-to-br from-amber-50 to-slate-50 dark:from-amber-900/10 dark:to-slate-900/10 border border-amber-200 dark:border-amber-800/30 rounded-lg">
                                  <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                                      <Activity className="w-6 h-6 text-amber-600" />
                                    </div>
                                    <div className="flex-1">
                                      <h3 className="font-semibold text-lg text-amber-700 dark:text-amber-400 mb-1">Collecting Data</h3>
                                      <p className="text-sm text-muted-foreground mb-4">
                                        Meaningful patterns need at least 7 days of tracking. Keep logging to unlock insights.
                                      </p>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="text-center">
                                          <div className="text-2xl font-bold text-amber-600">{insights.dataRange?.entriesAnalyzed || 0}</div>
                                          <div className="text-xs text-muted-foreground">Days Logged</div>
                                          <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                            <div className="h-full bg-amber-400 rounded-full" style={{ width: `${Math.min(100, ((insights.dataRange?.entriesAnalyzed || 0) / 7) * 100)}%` }}></div>
                                          </div>
                                        </div>
                                        <div className="text-center">
                                          <div className="text-2xl font-bold text-slate-600">{Math.max(0, 7 - (insights.dataRange?.entriesAnalyzed || 0))}</div>
                                          <div className="text-xs text-muted-foreground">Days Until Insights</div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {limitedInsights.length > 0 && (
                                <Collapsible className="mt-2">
                                  <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground py-1">
                                    <ChevronDown className="w-3 h-3" />
                                    {limitedInsights.length} preliminary observation{limitedInsights.length > 1 ? 's' : ''} (needs more data)
                                  </CollapsibleTrigger>
                                  <CollapsibleContent className="pt-2">
                                    <div className="space-y-2 pl-2 border-l border-muted">
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
                                  </CollapsibleContent>
                                </Collapsible>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Start tracking to see patterns</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
