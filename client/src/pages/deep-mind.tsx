import { useState, useMemo, useRef, useEffect } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
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
      className: "bg-amber-100 text-amber-700 border-amber-200", 
      icon: <Sparkles className="w-3 h-3" />,
      label: "early signal" 
    },
    Medium: { 
      className: "bg-cyan-100 text-cyan-700 border-cyan-200", 
      icon: <TrendingUp className="w-3 h-3" />,
      label: "building" 
    },
    High: { 
      className: "bg-emerald-100 text-emerald-700 border-emerald-200", 
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
    Low: { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200", glow: "shadow-emerald-100" },
    Medium: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200", glow: "shadow-amber-100" },
    High: { bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-200", glow: "shadow-rose-100" },
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
            className="stroke-slate-200"
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
          <span className="text-xl font-mono font-bold text-slate-900">{value}%</span>
        </div>
      </div>
      <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider mt-2">{label}</span>
    </div>
  );
}

function GlassCard({ children, className, glow = false, glowColor = "cyan" }: { 
  children: React.ReactNode; 
  className?: string; 
  glow?: boolean;
  glowColor?: "cyan" | "rose" | "emerald" | "amber" | "violet";
}) {
  return (
    <div className={cn(
      "bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-lg",
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
        <Skeleton className="h-5 w-24 bg-slate-200" />
        <Skeleton className="h-5 w-20 bg-slate-200" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-full bg-slate-200" />
        <Skeleton className="h-4 w-3/4 bg-slate-200" />
        <Skeleton className="h-4 w-1/2 bg-slate-200" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-20 w-20 rounded-full bg-slate-200" />
        <Skeleton className="h-20 w-20 rounded-full bg-slate-200" />
      </div>
    </GlassCard>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="py-16 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
        <Icon className="w-8 h-8 text-slate-400" />
      </div>
      <p className="text-slate-700 font-medium">{title}</p>
      <p className="text-muted-foreground text-sm mt-1 max-w-xs mx-auto">{description}</p>
    </div>
  );
}

function AIInsightDisplay({ content }: { content: string }) {
  const parseInsight = (text: string) => {
    const sections: { title: string; content: string }[] = [];
    const parts = text.split(/\*\*([^*]+)\*\*/);
    
    for (let i = 1; i < parts.length; i += 2) {
      const title = parts[i];
      const body = parts[i + 1] || "";
      sections.push({ title, content: body.trim() });
    }
    return sections;
  };

  const sections = parseInsight(content);
  
  const getConfig = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes("facts")) return { 
      icon: Activity, 
      bg: "bg-sky-50/40",
      border: "border-sky-100/60",
      iconBg: "bg-sky-100/80",
      iconColor: "text-sky-600"
    };
    if (t.includes("driver")) return { 
      icon: Target, 
      bg: "bg-violet-50/40",
      border: "border-violet-100/60",
      iconBg: "bg-violet-100/80",
      iconColor: "text-violet-600"
    };
    if (t.includes("pattern")) return { 
      icon: Network, 
      bg: "bg-amber-50/40",
      border: "border-amber-100/60",
      iconBg: "bg-amber-100/80",
      iconColor: "text-amber-600"
    };
    if (t.includes("action")) return { 
      icon: CheckCircle, 
      bg: "bg-teal-50/40",
      border: "border-teal-100/60",
      iconBg: "bg-teal-100/80",
      iconColor: "text-teal-600"
    };
    return { 
      icon: Brain, 
      bg: "bg-slate-50/60",
      border: "border-slate-200/60",
      iconBg: "bg-slate-100",
      iconColor: "text-slate-500"
    };
  };

  const renderPatternFlow = (text: string) => {
    const arrowMatch = text.match(/Cycle:\s*(.+)/i);
    if (arrowMatch) {
      const steps = arrowMatch[1].split(/\s*[→➡]\s*/);
      return (
        <div className="flex items-center gap-2 flex-wrap py-2">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.15 }}
                className="px-3 py-1.5 rounded-lg bg-white border border-amber-200/60 shadow-sm"
              >
                <span className="text-sm font-medium text-slate-700">{step.replace(/[\[\]]/g, '')}</span>
              </motion.div>
              {i < steps.length - 1 && (
                <motion.div
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.15 + 0.1 }}
                >
                  <ArrowRight className="w-4 h-4 text-amber-400" />
                </motion.div>
              )}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderActionItems = (text: string) => {
    const lines = text.split('\n').filter(l => l.trim());
    const doItems = lines.filter(l => l.toLowerCase().includes('do:'));
    const avoidItems = lines.filter(l => l.toLowerCase().includes('avoid:'));
    
    if (doItems.length === 0 && avoidItems.length === 0) return null;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-2">
        {doItems.map((item, i) => (
          <motion.div
            key={`do-${i}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-start gap-3 p-3 rounded-xl bg-teal-50/50 border border-teal-100/60"
          >
            <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <CheckCircle className="w-3.5 h-3.5 text-teal-600" />
            </div>
            <div>
              <span className="text-xs font-semibold text-teal-600 uppercase">Do</span>
              <p className="text-sm text-slate-700 mt-0.5">{item.replace(/^[•\-]\s*Do:\s*/i, '')}</p>
            </div>
          </motion.div>
        ))}
        {avoidItems.map((item, i) => (
          <motion.div
            key={`avoid-${i}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (doItems.length + i) * 0.1 }}
            className="flex items-start gap-3 p-3 rounded-xl bg-rose-50/50 border border-rose-100/60"
          >
            <div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <XCircle className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <div>
              <span className="text-xs font-semibold text-rose-500 uppercase">Avoid</span>
              <p className="text-sm text-slate-700 mt-0.5">{item.replace(/^[•\-]\s*Avoid:\s*/i, '')}</p>
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
      {sections.map((section, idx) => {
        const config = getConfig(section.title);
        const Icon = config.icon;
        const isPattern = section.title.toLowerCase().includes("pattern");
        const isAction = section.title.toLowerCase().includes("action");
        
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1, duration: 0.4 }}
            className={cn(
              "rounded-xl p-4 border",
              config.bg,
              config.border,
              (isPattern || isAction) && "md:col-span-2"
            )}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", config.iconBg)}>
                <Icon className={cn("w-4 h-4", config.iconColor)} />
              </div>
              <h3 className="text-sm font-semibold text-slate-700">{section.title}</h3>
            </div>
            
            {isPattern && renderPatternFlow(section.content)}
            {isAction && renderActionItems(section.content)}
            
            {!isPattern && !isAction && (
              <div className="space-y-1.5">
                {section.content.split('\n').map((line, i) => {
                  const trimmed = line.trim();
                  if (!trimmed) return null;
                  
                  if (trimmed.toLowerCase().includes('confidence:')) {
                    const conf = trimmed.includes('High') ? 'High' : trimmed.includes('Medium') ? 'Medium' : 'Low';
                    const confColor = conf === 'High' ? 'bg-teal-50 text-teal-600 border-teal-100' : conf === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-100 text-slate-600 border-slate-200';
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-sm text-slate-600">Confidence:</span>
                        <Badge className={cn("text-xs", confColor)}>{conf}</Badge>
                      </div>
                    );
                  }
                  
                  if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
                    return (
                      <div key={i} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
                        <span className="text-sm text-slate-600">{trimmed.replace(/^[•\-]\s*/, '')}</span>
                      </div>
                    );
                  }
                  
                  return <p key={i} className="text-sm text-slate-600">{trimmed}</p>;
                })}
              </div>
            )}
            
            {(isPattern || isAction) && !renderPatternFlow(section.content) && !renderActionItems(section.content) && (
              <div className="space-y-1.5">
                {section.content.split('\n').map((line, i) => {
                  const trimmed = line.trim();
                  if (!trimmed) return null;
                  return <p key={i} className="text-sm text-slate-600">{trimmed.replace(/^[•\-]\s*/, '')}</p>;
                })}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

export default function DeepMind() {
  const [activeTab, setActiveTab] = useState("now");
  const [sleepMetric, setSleepMetric] = useState<"mood" | "dissociation" | "urges">("mood");
  const [aiInsight, setAiInsight] = useState("");
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const { data: nowData, isLoading: nowLoading } = useDeepMindNow();
  const { data: loopsData, isLoading: loopsLoading } = useDeepMindLoops();
  const { data: visualsData, isLoading: visualsLoading } = useDeepMindVisualizations();
  const { data: members = [], isLoading: membersLoading } = useMembers();
  const { data: entries = [], isLoading: entriesLoading } = useTrackerEntries(2000);

  const fetchAIInsight = async (focus: string = "system") => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    setIsLoadingInsight(true);
    setAiInsight("");
    
    try {
      const response = await fetch("/api/deep-mind/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ focus }),
        signal: abortControllerRef.current.signal,
      });
      
      if (!response.ok) throw new Error("Failed to fetch insights");
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");
      
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setAiInsight(prev => prev + decoder.decode(value));
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        setAiInsight("Unable to generate insights at this time. Please try again.");
      }
    } finally {
      setIsLoadingInsight(false);
    }
  };

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (activeTab === "analysis" && !aiInsight && !isLoadingInsight) {
      fetchAIInsight("system");
    }
  }, [activeTab]);

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
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-100 to-cyan-100 flex items-center justify-center border border-teal-200">
                <Brain className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <h1 className="text-3xl font-display font-bold tracking-tight bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                  Deep Mind
                </h1>
                <p className="text-muted-foreground text-sm">AI-powered pattern recognition & insights</p>
              </div>
            </div>
          </div>
        </motion.div>

        <Tabs defaultValue="now" value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-white/90 backdrop-blur-xl border border-slate-200/60 p-1.5 rounded-xl shadow-sm">
            <TabsTrigger 
              value="now" 
              className="gap-2 data-[state=active]:bg-slate-100 data-[state=active]:text-teal-600 data-[state=active]:shadow-sm rounded-lg px-4 py-2 transition-all" 
              data-testid="tab-now"
            >
              <Zap className="w-4 h-4" /> Now
            </TabsTrigger>
            <TabsTrigger 
              value="loops" 
              className="gap-2 data-[state=active]:bg-slate-100 data-[state=active]:text-teal-600 data-[state=active]:shadow-sm rounded-lg px-4 py-2 transition-all" 
              data-testid="tab-loops"
            >
              <RefreshCw className="w-4 h-4" /> Your 3 Loops
            </TabsTrigger>
            <TabsTrigger 
              value="visuals" 
              className="gap-2 data-[state=active]:bg-slate-100 data-[state=active]:text-teal-600 data-[state=active]:shadow-sm rounded-lg px-4 py-2 transition-all" 
              data-testid="tab-visuals"
            >
              <BarChart2 className="w-4 h-4" /> Visualizations
            </TabsTrigger>
            <TabsTrigger 
              value="analysis" 
              className="gap-2 data-[state=active]:bg-slate-100 data-[state=active]:text-teal-600 data-[state=active]:shadow-sm rounded-lg px-4 py-2 transition-all" 
              data-testid="tab-analysis"
            >
              <Sparkles className="w-4 h-4" /> AI Analysis
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
                          <CardTitle className="text-lg font-semibold text-foreground">NOW</CardTitle>
                        </div>
                        <ConfidenceBadge confidence={nowData.driverConfidence} sampleSize={nowData.sampleSize} />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-5 relative">
                      <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-sm text-muted-foreground">Current Driver</span>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
                            <Target className="w-3.5 h-3.5 text-violet-600" />
                          </div>
                          <span className="text-sm font-bold text-foreground">{nowData.driver}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-sm text-muted-foreground">Active State</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-foreground">{nowData.state}</span>
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
                        <CardTitle className="text-lg font-semibold text-foreground">Smart Suggestion</CardTitle>
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
                            <p className="text-sm text-slate-700 mt-1.5 leading-relaxed">{nowData.suggestion.do}</p>
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
                            <p className="text-sm text-slate-700 mt-1.5 leading-relaxed">{nowData.suggestion.avoid}</p>
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
                              <CardTitle className="text-base text-foreground">Top 3 Triggers</CardTitle>
                              <CardDescription className="text-xs text-muted-foreground">What destabilizes you</CardDescription>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {loopsData.triggers.length > 0 ? (
                          <ul className="space-y-3">
                            {loopsData.triggers.map((trigger, i) => (
                              <li key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="flex items-center gap-3">
                                  <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-rose-100 to-orange-100 flex items-center justify-center text-[11px] font-bold text-rose-600 border border-rose-200">
                                    {i + 1}
                                  </span>
                                  <span className="text-sm font-medium text-slate-700">{trigger.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground font-mono">{trigger.count}×</span>
                                  <Badge variant="outline" className="text-[9px] bg-slate-100 text-slate-600 border-slate-300 px-1.5">
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
                              <CardTitle className="text-base text-foreground">Top 3 Stabilizers</CardTitle>
                              <CardDescription className="text-xs text-muted-foreground">What helps you recover</CardDescription>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {loopsData.stabilizers.length > 0 ? (
                          <ul className="space-y-3">
                            {loopsData.stabilizers.map((stabilizer, i) => (
                              <li key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="flex items-center gap-3">
                                  <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center text-[11px] font-bold text-emerald-600 border border-emerald-200">
                                    {i + 1}
                                  </span>
                                  <span className="text-sm font-medium text-slate-700">{stabilizer.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground font-mono">{stabilizer.count}×</span>
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "text-[9px] px-1.5",
                                      stabilizer.effect === "Strong" 
                                        ? "bg-emerald-100 text-emerald-700 border-emerald-200" 
                                        : stabilizer.effect === "Moderate"
                                        ? "bg-cyan-100 text-cyan-700 border-cyan-200"
                                        : "bg-slate-100 text-slate-600 border-slate-300"
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
                              <CardTitle className="text-base text-foreground">Top 3 Crash Loops</CardTitle>
                              <CardDescription className="text-xs text-muted-foreground">Repeating negative patterns</CardDescription>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {loopsData.crashLoops.length > 0 ? (
                          <ul className="space-y-4">
                            {loopsData.crashLoops.map((loop, i) => (
                              <li key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                                <div className="flex items-start gap-3">
                                  <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-100 to-yellow-100 flex items-center justify-center text-[11px] font-bold text-amber-600 border border-amber-200 shrink-0">
                                    {i + 1}
                                  </span>
                                  <span className="text-sm font-mono text-slate-700">{loop.pattern}</span>
                                </div>
                                <div className="flex items-center justify-between pl-9">
                                  <span className="text-xs text-muted-foreground">
                                    {loop.count}× • {loop.recency === 0 ? "today" : `${loop.recency}d ago`}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 pl-9">
                                  <Badge className="bg-teal-100 text-teal-700 border-teal-200 text-[10px] px-2 py-0.5 gap-1">
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
                            <CardTitle className="text-base text-foreground">Sleep Impact Analysis</CardTitle>
                            <CardDescription className="text-xs text-muted-foreground">Sleep is your highest-leverage variable</CardDescription>
                          </div>
                        </div>
                        <ConfidenceBadge confidence={visualsData.sleepImpact.confidence} sampleSize={visualsData.sleepImpact.sampleSize} />
                      </div>
                      <div className="flex gap-1 mt-4 p-1 bg-slate-100 rounded-xl border border-slate-200 w-fit">
                        {(["mood", "dissociation", "urges"] as const).map((metric) => (
                          <button
                            key={metric}
                            onClick={() => setSleepMetric(metric)}
                            className={cn(
                              "px-4 py-2 text-xs font-medium rounded-lg transition-all",
                              sleepMetric === metric
                                ? "bg-white text-teal-600 border border-slate-200 shadow-sm"
                                : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
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
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis 
                              dataKey="sleepHours" 
                              tick={{ fill: '#64748b', fontSize: 12 }} 
                              axisLine={{ stroke: '#cbd5e1' }}
                              tickLine={{ stroke: '#cbd5e1' }}
                              label={{ value: 'Hours of Sleep', position: 'bottom', fill: '#64748b', fontSize: 11, offset: -5 }}
                            />
                            <YAxis 
                              tick={{ fill: '#64748b', fontSize: 12 }} 
                              axisLine={{ stroke: '#cbd5e1' }}
                              tickLine={{ stroke: '#cbd5e1' }}
                              domain={sleepMetric === "mood" ? [0, 10] : [0, 100]}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                                border: '1px solid #e2e8f0', 
                                borderRadius: '12px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                              }}
                              labelStyle={{ color: '#1e293b', fontWeight: 600, marginBottom: '4px' }}
                              itemStyle={{ color: '#64748b' }}
                              formatter={(value: number) => [
                                `${value}${sleepMetric === "mood" ? "/10" : "%"}`,
                                sleepMetric === "mood" ? "Avg Mood" : sleepMetric === "dissociation" ? "Avg Dissociation" : "Avg Stress"
                              ]}
                              cursor={{ fill: 'rgba(20, 184, 166, 0.1)' }}
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
                            <CardTitle className="text-base text-foreground">Driver Frequency Over Time</CardTitle>
                            <CardDescription className="text-xs text-muted-foreground">What's been running your life lately</CardDescription>
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
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                              <XAxis 
                                dataKey="week" 
                                tick={{ fill: '#64748b', fontSize: 11 }} 
                                axisLine={{ stroke: '#cbd5e1' }}
                                tickLine={{ stroke: '#cbd5e1' }}
                              />
                              <YAxis 
                                tick={{ fill: '#64748b', fontSize: 12 }} 
                                axisLine={{ stroke: '#cbd5e1' }}
                                tickLine={{ stroke: '#cbd5e1' }}
                              />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                                  border: '1px solid #e2e8f0', 
                                  borderRadius: '12px',
                                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}
                                labelStyle={{ color: '#1e293b', fontWeight: 600, marginBottom: '4px' }}
                                cursor={{ fill: 'rgba(20, 184, 166, 0.1)' }}
                              />
                              <Legend 
                                wrapperStyle={{ paddingTop: '20px' }}
                                formatter={(value) => <span className="text-slate-600 text-xs">{value}</span>}
                              />
                              <Bar dataKey="sleep" stackId="a" fill="#6366f1" name="Sleep" radius={[0, 0, 0, 0]} />
                              <Bar dataKey="work" stackId="a" fill="#f59e0b" name="Work" />
                              <Bar dataKey="loneliness" stackId="a" fill="#8b5cf6" name="Loneliness" />
                              <Bar dataKey="pain" stackId="a" fill="#ef4444" name="Pain" />
                              <Bar dataKey="urges" stackId="a" fill="#ec4899" name="Urges" />
                              <Bar dataKey="anxiety" stackId="a" fill="#14b8a6" name="Anxiety" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-200">
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
                                <span className="text-xs text-slate-600">{label}</span>
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

          <TabsContent value="analysis" className="space-y-6">
            <motion.div 
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="space-y-6"
            >
              <motion.div variants={staggerItem}>
                <GlassCard glow glowColor="cyan" className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/30 to-cyan-500/30 flex items-center justify-center border border-teal-500/30">
                          <Sparkles className="w-5 h-5 text-teal-400" />
                        </div>
                        <div>
                          <CardTitle className="text-lg text-foreground">AI System Analysis</CardTitle>
                          <CardDescription className="text-xs text-muted-foreground">AI-powered insights based on your tracking data</CardDescription>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        className="bg-teal-600 hover:bg-teal-500 text-white"
                        onClick={() => fetchAIInsight("system")}
                        disabled={isLoadingInsight}
                        data-testid="button-overview-insight"
                      >
                        {isLoadingInsight ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-1.5" />
                            Analyze
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {aiInsight ? (
                      <AIInsightDisplay content={aiInsight} />
                    ) : isLoadingInsight ? (
                      <div className="text-center py-16 px-6">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-teal-100 to-cyan-100 flex items-center justify-center"
                        >
                          <Brain className="w-8 h-8 text-teal-500" />
                        </motion.div>
                        <p className="text-sm text-slate-600 font-medium">Analyzing your patterns...</p>
                        <p className="text-xs text-muted-foreground mt-1">This may take a moment</p>
                      </div>
                    ) : (
                      <div className="text-center py-16 px-6">
                        <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-slate-100 flex items-center justify-center">
                          <Brain className="w-7 h-7 text-slate-400" />
                        </div>
                        <p className="text-sm text-slate-600 font-medium">Ready to analyze your patterns</p>
                        <p className="text-xs text-muted-foreground mt-1">Click "Analyze" to get AI-powered insights</p>
                      </div>
                    )}
                  </CardContent>
                </GlassCard>
              </motion.div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
