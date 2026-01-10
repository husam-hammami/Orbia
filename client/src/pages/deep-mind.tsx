import { useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { 
  Brain, 
  Activity, 
  AlertTriangle, 
  Network, 
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
  Layers,
  Gauge,
  Sparkles,
  Target,
  Calendar,
  Users,
  Hash
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
  Cell
} from "recharts";

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1] as const
    }
  })
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const }
  }
};

function ConfidenceBadge({ confidence, sampleSize }: { confidence: "Low" | "Medium" | "High"; sampleSize: number }) {
  const config = {
    Low: { 
      className: "bg-amber-500/20 text-amber-400 border-amber-500/30", 
      icon: <Sparkles className="w-3 h-3" />,
      label: "early signal" 
    },
    Medium: { 
      className: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30", 
      icon: <TrendingUp className="w-3 h-3" />,
      label: "building" 
    },
    High: { 
      className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", 
      icon: <CheckCircle className="w-3 h-3" />,
      label: "validated" 
    },
  };
  
  const { className, icon, label } = config[confidence];
  
  return (
    <Badge variant="outline" className={cn("text-[10px] font-mono gap-1.5 px-2 py-0.5", className)} data-testid="confidence-badge">
      {icon}
      N={sampleSize} • {label}
    </Badge>
  );
}

function IntensityBadge({ intensity }: { intensity: "Low" | "Medium" | "High" }) {
  const config = {
    Low: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30", glow: "shadow-emerald-500/20" },
    Medium: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30", glow: "shadow-amber-500/20" },
    High: { bg: "bg-rose-500/20", text: "text-rose-400", border: "border-rose-500/30", glow: "shadow-rose-500/20" },
  };
  
  const style = config[intensity];
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        "text-[10px] px-2.5 py-0.5 font-semibold shadow-sm",
        style.bg, style.text, style.border
      )} 
      data-testid="intensity-badge"
    >
      {intensity} Intensity
    </Badge>
  );
}

function RingGauge({ value, max = 100, label, size = 80 }: { value: number; max?: number; label: string; size?: number }) {
  const percentage = Math.min((value / max) * 100, 100);
  const circumference = 2 * Math.PI * 35;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  const getColor = () => {
    if (label === "Load") {
      if (value > 70) return { stroke: "#f43f5e", glow: "rgba(244, 63, 94, 0.4)" };
      if (value > 40) return { stroke: "#f59e0b", glow: "rgba(245, 158, 11, 0.4)" };
      return { stroke: "#10b981", glow: "rgba(16, 185, 129, 0.4)" };
    } else {
      if (value > 60) return { stroke: "#10b981", glow: "rgba(16, 185, 129, 0.4)" };
      if (value > 40) return { stroke: "#f59e0b", glow: "rgba(245, 158, 11, 0.4)" };
      return { stroke: "#f43f5e", glow: "rgba(244, 63, 94, 0.4)" };
    }
  };
  
  const colors = getColor();
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
          <circle
            cx="40"
            cy="40"
            r="35"
            fill="none"
            strokeWidth="4"
            className="stroke-slate-800"
          />
          <motion.circle
            cx="40"
            cy="40"
            r="35"
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            stroke={colors.stroke}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: "easeOut" }}
            style={{ filter: `drop-shadow(0 0 6px ${colors.glow})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-mono font-bold text-slate-100">{value}%</span>
        </div>
      </div>
      <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mt-2">{label}</span>
    </div>
  );
}

function GlassCard({ children, className, glow = false, glowColor = "cyan" }: { 
  children: React.ReactNode; 
  className?: string; 
  glow?: boolean;
  glowColor?: "cyan" | "rose" | "emerald" | "amber" | "violet";
}) {
  const glowStyles = {
    cyan: "shadow-[0_0_30px_rgba(6,182,212,0.15)]",
    rose: "shadow-[0_0_30px_rgba(244,63,94,0.15)]",
    emerald: "shadow-[0_0_30px_rgba(16,185,129,0.15)]",
    amber: "shadow-[0_0_30px_rgba(245,158,11,0.15)]",
    violet: "shadow-[0_0_30px_rgba(139,92,246,0.15)]",
  };
  
  return (
    <div className={cn(
      "bg-slate-900/80 backdrop-blur-md border border-cyan-500/20 rounded-2xl",
      glow && glowStyles[glowColor],
      className
    )}>
      {children}
    </div>
  );
}

function SkeletonCard() {
  return (
    <GlassCard className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-24 bg-slate-800" />
        <Skeleton className="h-5 w-20 bg-slate-800" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-full bg-slate-800" />
        <Skeleton className="h-4 w-3/4 bg-slate-800" />
        <Skeleton className="h-4 w-1/2 bg-slate-800" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-20 w-20 rounded-full bg-slate-800" />
        <Skeleton className="h-20 w-20 rounded-full bg-slate-800" />
      </div>
    </GlassCard>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="py-16 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-800/50 flex items-center justify-center">
        <Icon className="w-8 h-8 text-slate-600" />
      </div>
      <p className="text-slate-400 font-medium">{title}</p>
      <p className="text-slate-600 text-sm mt-1 max-w-xs mx-auto">{description}</p>
    </div>
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
      mostCommonColor: topMember?.color || "#6366f1",
      avgShiftsPerDay,
      totalEntries: entries.length,
      daysTracked: daysWithEntries.size
    };
  }, [entries, members]);

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500 pb-20">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-cyan-500/10 pb-6"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center border border-cyan-500/20">
                <Brain className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-3xl font-display font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
                  Deep Mind
                </h1>
                <p className="text-slate-500 text-sm">AI-powered pattern recognition & insights</p>
              </div>
            </div>
          </div>
        </motion.div>

        <Tabs defaultValue="now" value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-slate-900/80 backdrop-blur-md border border-cyan-500/20 p-1.5 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.1)]">
            <TabsTrigger 
              value="now" 
              className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500/20 data-[state=active]:to-teal-500/20 data-[state=active]:text-cyan-400 data-[state=active]:border-cyan-500/30 rounded-lg px-4 py-2 transition-all" 
              data-testid="tab-now"
            >
              <Zap className="w-4 h-4" /> Now
            </TabsTrigger>
            <TabsTrigger 
              value="loops" 
              className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500/20 data-[state=active]:to-teal-500/20 data-[state=active]:text-cyan-400 data-[state=active]:border-cyan-500/30 rounded-lg px-4 py-2 transition-all" 
              data-testid="tab-loops"
            >
              <RefreshCw className="w-4 h-4" /> Your 3 Loops
            </TabsTrigger>
            <TabsTrigger 
              value="visuals" 
              className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500/20 data-[state=active]:to-teal-500/20 data-[state=active]:text-cyan-400 data-[state=active]:border-cyan-500/30 rounded-lg px-4 py-2 transition-all" 
              data-testid="tab-visuals"
            >
              <BarChart2 className="w-4 h-4" /> Visualizations
            </TabsTrigger>
            <TabsTrigger 
              value="timeline" 
              className="gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500/20 data-[state=active]:to-teal-500/20 data-[state=active]:text-cyan-400 data-[state=active]:border-cyan-500/30 rounded-lg px-4 py-2 transition-all" 
              data-testid="tab-timeline"
            >
              <Clock className="w-4 h-4" /> State Timeline
            </TabsTrigger>
          </TabsList>

          <TabsContent value="now" className="space-y-6">
            {nowLoading ? (
              <motion.div 
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                <motion.div variants={staggerItem}><SkeletonCard /></motion.div>
                <motion.div variants={staggerItem}><SkeletonCard /></motion.div>
              </motion.div>
            ) : nowData ? (
              <motion.div 
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                <motion.div variants={staggerItem}>
                  <GlassCard glow glowColor="cyan" className="overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-teal-500/5 pointer-events-none" />
                    <CardHeader className="pb-4 relative">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/30 to-teal-500/30 flex items-center justify-center border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                            <Activity className="w-5 h-5 text-cyan-400" />
                          </div>
                          <CardTitle className="text-lg font-semibold text-slate-100">NOW</CardTitle>
                        </div>
                        <ConfidenceBadge confidence={nowData.driverConfidence} sampleSize={nowData.sampleSize} />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-5 relative">
                      <div className="flex items-center justify-between py-3 px-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                        <span className="text-sm text-slate-400">Current Driver</span>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500/30 to-purple-500/30 flex items-center justify-center">
                            <Target className="w-3.5 h-3.5 text-violet-400" />
                          </div>
                          <span className="text-sm font-bold text-slate-100">{nowData.driver}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between py-3 px-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                        <span className="text-sm text-slate-400">Active State</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-slate-100">{nowData.state}</span>
                          <IntensityBadge intensity={nowData.stateIntensity} />
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-center gap-8 py-4">
                        <RingGauge value={nowData.load} label="Load" />
                        <RingGauge value={nowData.stability} label="Stability" />
                      </div>
                      
                      {nowData.riskFlag && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl shadow-[0_0_20px_rgba(244,63,94,0.1)]"
                        >
                          <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-5 h-5 text-rose-400" />
                          </div>
                          <div>
                            <span className="text-xs uppercase font-bold text-rose-400 tracking-wider">Risk Alert</span>
                            <p className="text-sm text-rose-300 mt-0.5">{nowData.riskFlag}</p>
                          </div>
                        </motion.div>
                      )}
                    </CardContent>
                  </GlassCard>
                </motion.div>
                
                <motion.div variants={staggerItem}>
                  <GlassCard glow glowColor="emerald" className="overflow-hidden h-full">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 pointer-events-none" />
                    <CardHeader className="pb-4 relative">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/30 to-teal-500/30 flex items-center justify-center border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                          <Brain className="w-5 h-5 text-emerald-400" />
                        </div>
                        <CardTitle className="text-lg font-semibold text-slate-100">Smart Suggestion</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 relative">
                      <div className="p-5 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 rounded-xl">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                            <CheckCircle className="w-5 h-5 text-emerald-400" />
                          </div>
                          <div className="flex-1">
                            <span className="text-xs uppercase font-bold text-emerald-400 tracking-wider">Do This</span>
                            <p className="text-sm text-slate-200 mt-1.5 leading-relaxed">{nowData.suggestion.do}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-5 bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-xl">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                            <XCircle className="w-5 h-5 text-amber-400" />
                          </div>
                          <div className="flex-1">
                            <span className="text-xs uppercase font-bold text-amber-400 tracking-wider">Avoid (Next 12-24h)</span>
                            <p className="text-sm text-slate-200 mt-1.5 leading-relaxed">{nowData.suggestion.avoid}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </GlassCard>
                </motion.div>
              </motion.div>
            ) : (
              <GlassCard>
                <EmptyState 
                  icon={Activity} 
                  title="No data available yet" 
                  description="Start logging entries to see your current mental state analysis"
                />
              </GlassCard>
            )}
          </TabsContent>

          <TabsContent value="loops" className="space-y-6">
            {loopsLoading ? (
              <motion.div 
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                {[0, 1, 2].map(i => (
                  <motion.div key={i} variants={staggerItem}><SkeletonCard /></motion.div>
                ))}
              </motion.div>
            ) : loopsData ? (
              <div className="space-y-6">
                <div className="flex items-center justify-end">
                  <ConfidenceBadge confidence={loopsData.confidence} sampleSize={loopsData.sampleSize} />
                </div>
                
                <motion.div 
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 md:grid-cols-3 gap-6"
                >
                  <motion.div variants={staggerItem}>
                    <GlassCard glow glowColor="rose" className="h-full overflow-hidden">
                      <div className="h-1 bg-gradient-to-r from-rose-500 to-orange-500" />
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-rose-500/20 flex items-center justify-center">
                              <AlertTriangle className="w-4 h-4 text-rose-400" />
                            </div>
                            <div>
                              <CardTitle className="text-base text-slate-100">Top 3 Triggers</CardTitle>
                              <CardDescription className="text-xs text-slate-500">What destabilizes you</CardDescription>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {loopsData.triggers.length > 0 ? (
                          <ul className="space-y-3">
                            {loopsData.triggers.map((trigger, i) => (
                              <li key={i} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                <div className="flex items-center gap-3">
                                  <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-rose-500/30 to-orange-500/30 flex items-center justify-center text-[11px] font-bold text-rose-400 border border-rose-500/20">
                                    {i + 1}
                                  </span>
                                  <span className="text-sm font-medium text-slate-200">{trigger.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-slate-500 font-mono">{trigger.count}×</span>
                                  <Badge variant="outline" className="text-[9px] bg-slate-800 text-slate-400 border-slate-600 px-1.5">
                                    {trigger.recency === 0 ? "today" : `${trigger.recency}d`}
                                  </Badge>
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <EmptyState 
                            icon={AlertTriangle} 
                            title="No triggers detected" 
                            description="Keep logging to discover patterns"
                          />
                        )}
                      </CardContent>
                    </GlassCard>
                  </motion.div>
                  
                  <motion.div variants={staggerItem}>
                    <GlassCard glow glowColor="emerald" className="h-full overflow-hidden">
                      <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                              <Shield className="w-4 h-4 text-emerald-400" />
                            </div>
                            <div>
                              <CardTitle className="text-base text-slate-100">Top 3 Stabilizers</CardTitle>
                              <CardDescription className="text-xs text-slate-500">What helps you recover</CardDescription>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {loopsData.stabilizers.length > 0 ? (
                          <ul className="space-y-3">
                            {loopsData.stabilizers.map((stabilizer, i) => (
                              <li key={i} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                <div className="flex items-center gap-3">
                                  <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500/30 to-teal-500/30 flex items-center justify-center text-[11px] font-bold text-emerald-400 border border-emerald-500/20">
                                    {i + 1}
                                  </span>
                                  <span className="text-sm font-medium text-slate-200">{stabilizer.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-slate-500 font-mono">{stabilizer.count}×</span>
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "text-[9px] px-1.5",
                                      stabilizer.effect === "Strong" 
                                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                                        : stabilizer.effect === "Moderate"
                                        ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                                        : "bg-slate-700 text-slate-400 border-slate-600"
                                    )}
                                  >
                                    {stabilizer.effect}
                                  </Badge>
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <EmptyState 
                            icon={Shield} 
                            title="No stabilizers detected" 
                            description="Keep logging to discover patterns"
                          />
                        )}
                      </CardContent>
                    </GlassCard>
                  </motion.div>
                  
                  <motion.div variants={staggerItem}>
                    <GlassCard glow glowColor="amber" className="h-full overflow-hidden">
                      <div className="h-1 bg-gradient-to-r from-amber-500 to-yellow-500" />
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
                              <RefreshCw className="w-4 h-4 text-amber-400" />
                            </div>
                            <div>
                              <CardTitle className="text-base text-slate-100">Top 3 Crash Loops</CardTitle>
                              <CardDescription className="text-xs text-slate-500">Repeating negative patterns</CardDescription>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {loopsData.crashLoops.length > 0 ? (
                          <ul className="space-y-4">
                            {loopsData.crashLoops.map((loop, i) => (
                              <li key={i} className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 space-y-2">
                                <div className="flex items-start gap-3">
                                  <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-500/30 to-yellow-500/30 flex items-center justify-center text-[11px] font-bold text-amber-400 border border-amber-500/20 shrink-0">
                                    {i + 1}
                                  </span>
                                  <span className="text-sm font-mono text-slate-200">{loop.pattern}</span>
                                </div>
                                <div className="flex items-center justify-between pl-9">
                                  <span className="text-xs text-slate-500">
                                    {loop.count}× • {loop.recency === 0 ? "today" : `${loop.recency}d ago`}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 pl-9">
                                  <Badge className="bg-teal-500/20 text-teal-400 border-teal-500/30 text-[10px] px-2 py-0.5 gap-1">
                                    <Sparkles className="w-3 h-3" />
                                    {loop.interrupt}
                                  </Badge>
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <EmptyState 
                            icon={RefreshCw} 
                            title="No crash loops detected" 
                            description="Keep logging to discover patterns"
                          />
                        )}
                      </CardContent>
                    </GlassCard>
                  </motion.div>
                </motion.div>
              </div>
            ) : (
              <GlassCard>
                <EmptyState 
                  icon={RefreshCw} 
                  title="No loop data available yet" 
                  description="Keep logging entries to discover your patterns"
                />
              </GlassCard>
            )}
          </TabsContent>

          <TabsContent value="visuals" className="space-y-6">
            {visualsLoading ? (
              <motion.div 
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 gap-6"
              >
                <motion.div variants={staggerItem}><SkeletonCard /></motion.div>
                <motion.div variants={staggerItem}><SkeletonCard /></motion.div>
              </motion.div>
            ) : visualsData ? (
              <motion.div 
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 gap-6"
              >
                <motion.div variants={staggerItem}>
                  <GlassCard glow glowColor="violet" className="overflow-hidden">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/30 to-violet-500/30 flex items-center justify-center border border-indigo-500/30">
                            <Moon className="w-5 h-5 text-indigo-400" />
                          </div>
                          <div>
                            <CardTitle className="text-base text-slate-100">Sleep Impact Analysis</CardTitle>
                            <CardDescription className="text-xs text-slate-500">Sleep is your highest-leverage variable</CardDescription>
                          </div>
                        </div>
                        <ConfidenceBadge confidence={visualsData.sleepImpact.confidence} sampleSize={visualsData.sleepImpact.sampleSize} />
                      </div>
                      <div className="flex gap-1 mt-4 p-1 bg-slate-800/50 rounded-xl border border-slate-700/50 w-fit">
                        {(["mood", "dissociation", "urges"] as const).map((metric) => (
                          <button
                            key={metric}
                            onClick={() => setSleepMetric(metric)}
                            className={cn(
                              "px-4 py-2 text-xs font-medium rounded-lg transition-all",
                              sleepMetric === metric
                                ? "bg-gradient-to-r from-cyan-500/30 to-teal-500/30 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                                : "text-slate-400 hover:text-slate-300 hover:bg-slate-700/50"
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
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart data={visualsData.sleepImpact.data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                            <defs>
                              <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#14b8a6" stopOpacity={1}/>
                                <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.6}/>
                              </linearGradient>
                              <linearGradient id="dissGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#f59e0b" stopOpacity={1}/>
                                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.6}/>
                              </linearGradient>
                              <linearGradient id="urgesGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#ef4444" stopOpacity={1}/>
                                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.6}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <XAxis 
                              dataKey="sleepHours" 
                              tick={{ fill: '#94a3b8', fontSize: 12 }} 
                              axisLine={{ stroke: '#475569' }}
                              tickLine={{ stroke: '#475569' }}
                              label={{ value: 'Hours of Sleep', position: 'bottom', fill: '#64748b', fontSize: 11, offset: -5 }}
                            />
                            <YAxis 
                              tick={{ fill: '#94a3b8', fontSize: 12 }} 
                              axisLine={{ stroke: '#475569' }}
                              tickLine={{ stroke: '#475569' }}
                              domain={sleepMetric === "mood" ? [0, 10] : [0, 100]}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                                border: '1px solid rgba(6, 182, 212, 0.3)', 
                                borderRadius: '12px',
                                boxShadow: '0 0 20px rgba(6, 182, 212, 0.1)'
                              }}
                              labelStyle={{ color: '#f1f5f9', fontWeight: 600, marginBottom: '4px' }}
                              itemStyle={{ color: '#94a3b8' }}
                              formatter={(value: number) => [
                                `${value}${sleepMetric === "mood" ? "/10" : "%"}`,
                                sleepMetric === "mood" ? "Avg Mood" : sleepMetric === "dissociation" ? "Avg Dissociation" : "Avg Stress"
                              ]}
                              cursor={{ fill: 'rgba(6, 182, 212, 0.1)' }}
                            />
                            <Bar 
                              dataKey={sleepMetric} 
                              fill={`url(#${sleepMetric === "mood" ? "moodGrad" : sleepMetric === "dissociation" ? "dissGrad" : "urgesGrad"})`}
                              radius={[6, 6, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <EmptyState 
                          icon={Moon} 
                          title="No sleep data yet" 
                          description="Log your sleep hours to see the impact on your mental state"
                        />
                      )}
                    </CardContent>
                  </GlassCard>
                </motion.div>

                <motion.div variants={staggerItem}>
                  <GlassCard glow glowColor="amber" className="overflow-hidden">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/30 to-orange-500/30 flex items-center justify-center border border-amber-500/30">
                            <TrendingUp className="w-5 h-5 text-amber-400" />
                          </div>
                          <div>
                            <CardTitle className="text-base text-slate-100">Driver Frequency Over Time</CardTitle>
                            <CardDescription className="text-xs text-slate-500">What's been running your life lately</CardDescription>
                          </div>
                        </div>
                        <ConfidenceBadge confidence={visualsData.driverFrequency.confidence} sampleSize={visualsData.driverFrequency.sampleSize} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      {visualsData.driverFrequency.data.length > 0 ? (
                        <>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={visualsData.driverFrequency.data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                              <XAxis 
                                dataKey="week" 
                                tick={{ fill: '#94a3b8', fontSize: 11 }} 
                                axisLine={{ stroke: '#475569' }}
                                tickLine={{ stroke: '#475569' }}
                              />
                              <YAxis 
                                tick={{ fill: '#94a3b8', fontSize: 12 }} 
                                axisLine={{ stroke: '#475569' }}
                                tickLine={{ stroke: '#475569' }}
                              />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                                  border: '1px solid rgba(6, 182, 212, 0.3)', 
                                  borderRadius: '12px',
                                  boxShadow: '0 0 20px rgba(6, 182, 212, 0.1)'
                                }}
                                labelStyle={{ color: '#f1f5f9', fontWeight: 600, marginBottom: '4px' }}
                                cursor={{ fill: 'rgba(6, 182, 212, 0.1)' }}
                              />
                              <Legend 
                                wrapperStyle={{ paddingTop: '20px' }}
                                formatter={(value) => <span className="text-slate-400 text-xs">{value}</span>}
                              />
                              <Bar dataKey="sleep" stackId="a" fill="#6366f1" name="Sleep" radius={[0, 0, 0, 0]} />
                              <Bar dataKey="work" stackId="a" fill="#f59e0b" name="Work" />
                              <Bar dataKey="loneliness" stackId="a" fill="#8b5cf6" name="Loneliness" />
                              <Bar dataKey="pain" stackId="a" fill="#ef4444" name="Pain" />
                              <Bar dataKey="urges" stackId="a" fill="#ec4899" name="Urges" />
                              <Bar dataKey="anxiety" stackId="a" fill="#14b8a6" name="Anxiety" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-800">
                            {[
                              { color: "#6366f1", label: "Sleep" },
                              { color: "#f59e0b", label: "Work" },
                              { color: "#8b5cf6", label: "Loneliness" },
                              { color: "#ef4444", label: "Pain" },
                              { color: "#ec4899", label: "Urges" },
                              { color: "#14b8a6", label: "Anxiety" },
                            ].map(({ color, label }) => (
                              <div key={label} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                                <span className="text-xs text-slate-400">{label}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <EmptyState 
                          icon={TrendingUp} 
                          title="No driver data yet" 
                          description="Tag drivers in your journal entries to see patterns"
                        />
                      )}
                    </CardContent>
                  </GlassCard>
                </motion.div>
              </motion.div>
            ) : (
              <GlassCard>
                <EmptyState 
                  icon={BarChart2} 
                  title="No visualization data available yet" 
                  description="Start logging entries to see your patterns"
                />
              </GlassCard>
            )}
          </TabsContent>

          <TabsContent value="timeline" className="space-y-6">
            {(membersLoading || entriesLoading) ? (
              <motion.div 
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="space-y-6"
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[0, 1, 2, 3].map(i => (
                    <motion.div key={i} variants={staggerItem}>
                      <GlassCard className="p-4">
                        <Skeleton className="h-4 w-20 bg-slate-800 mb-2" />
                        <Skeleton className="h-6 w-16 bg-slate-800" />
                      </GlassCard>
                    </motion.div>
                  ))}
                </div>
                <motion.div variants={staggerItem}><SkeletonCard /></motion.div>
              </motion.div>
            ) : (
              <motion.div 
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="space-y-6"
              >
                <motion.div variants={staggerItem} className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/30 to-purple-500/30 flex items-center justify-center border border-violet-500/30">
                      <Clock className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-100">State Timeline</h2>
                      <p className="text-xs text-slate-500">State distribution and patterns over time</p>
                    </div>
                  </div>
                  <ConfidenceBadge 
                    confidence={stateDriverAssociations.confidence} 
                    sampleSize={entries.length} 
                  />
                </motion.div>

                {timelineStats && (
                  <motion.div variants={staggerItem} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <GlassCard className="p-4 overflow-hidden relative">
                      <div 
                        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
                        style={{ backgroundColor: timelineStats.mostCommonColor }}
                      />
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-violet-400" />
                        <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Most Common</span>
                      </div>
                      <div className="text-lg font-semibold text-slate-100">{timelineStats.mostCommonState}</div>
                    </GlassCard>
                    
                    <GlassCard className="p-4 overflow-hidden relative">
                      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl bg-amber-500" />
                      <div className="flex items-center gap-2 mb-2">
                        <RefreshCw className="w-4 h-4 text-amber-400" />
                        <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Shifts/Day</span>
                      </div>
                      <div className="text-lg font-semibold text-slate-100">{timelineStats.avgShiftsPerDay}</div>
                    </GlassCard>
                    
                    <GlassCard className="p-4 overflow-hidden relative">
                      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl bg-cyan-500" />
                      <div className="flex items-center gap-2 mb-2">
                        <Hash className="w-4 h-4 text-cyan-400" />
                        <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Total Entries</span>
                      </div>
                      <div className="text-lg font-semibold text-slate-100">{timelineStats.totalEntries}</div>
                    </GlassCard>
                    
                    <GlassCard className="p-4 overflow-hidden relative">
                      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl bg-emerald-500" />
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-emerald-400" />
                        <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Days Tracked</span>
                      </div>
                      <div className="text-lg font-semibold text-slate-100">{timelineStats.daysTracked}</div>
                    </GlassCard>
                  </motion.div>
                )}

                <motion.div variants={staggerItem}>
                  <GlassCard glow glowColor="violet" className="overflow-hidden">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/30 to-purple-500/30 flex items-center justify-center border border-violet-500/30">
                          <Layers className="w-5 h-5 text-violet-400" />
                        </div>
                        <div>
                          <CardTitle className="text-base text-slate-100">State Distribution</CardTitle>
                          <CardDescription className="text-xs text-slate-500">State patterns and transitions over time</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <HeadspaceMap />
                    </CardContent>
                  </GlassCard>
                </motion.div>

                <motion.div variants={staggerItem}>
                  <GlassCard glow glowColor="amber" className="overflow-hidden">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/30 to-orange-500/30 flex items-center justify-center border border-amber-500/30">
                            <ArrowRight className="w-5 h-5 text-amber-400" />
                          </div>
                          <div>
                            <CardTitle className="text-base text-slate-100">State → Driver Association</CardTitle>
                            <CardDescription className="text-xs text-slate-500">Which drivers tend to precede which states</CardDescription>
                          </div>
                        </div>
                        <ConfidenceBadge 
                          confidence={stateDriverAssociations.confidence} 
                          sampleSize={stateDriverAssociations.sampleSize} 
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      {stateDriverAssociations.associations.length > 0 ? (
                        <div className="space-y-4">
                          {stateDriverAssociations.associations.slice(0, 5).map((assoc) => (
                            <motion.div 
                              key={assoc.memberId} 
                              className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 overflow-hidden relative"
                              data-testid={`state-driver-${assoc.memberId}`}
                              whileHover={{ scale: 1.01 }}
                              transition={{ duration: 0.2 }}
                            >
                              <div 
                                className="absolute left-0 top-0 bottom-0 w-1"
                                style={{ backgroundColor: assoc.memberColor }}
                              />
                              <div className="flex items-center gap-3 mb-3 pl-2">
                                <div 
                                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg"
                                  style={{ 
                                    background: `linear-gradient(135deg, ${assoc.memberColor}cc, ${assoc.memberColor}88)`,
                                    boxShadow: `0 4px 15px ${assoc.memberColor}40`
                                  }}
                                >
                                  {assoc.memberName.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <span className="font-semibold text-slate-100">{assoc.memberName}</span>
                                  <span className="text-slate-500 text-sm"> state most often follows:</span>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2 pl-2">
                                {assoc.topDrivers.map(({ driver, count }, i) => (
                                  <Badge 
                                    key={driver} 
                                    variant="outline" 
                                    className={cn(
                                      "text-xs px-3 py-1",
                                      i === 0 
                                        ? "bg-amber-500/20 text-amber-400 border-amber-500/30" 
                                        : "bg-slate-700/50 text-slate-300 border-slate-600"
                                    )}
                                  >
                                    {driver} <span className="text-slate-500 ml-1">({count}×)</span>
                                  </Badge>
                                ))}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <EmptyState 
                          icon={ArrowRight} 
                          title="No driver associations found yet" 
                          description="Log entries with triggers, sleep data, or work tags to see patterns"
                        />
                      )}
                    </CardContent>
                  </GlassCard>
                </motion.div>
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
