import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ResponsiveContainer, 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  ZAxis, 
  Tooltip, 
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from "recharts";
import { 
  Brain, 
  Sparkles, 
  Zap, 
  Network, 
  GitBranch, 
  Lightbulb, 
  Microscope,
  Bot,
  AlertTriangle,
  Fingerprint,
  Cpu,
  ArrowRight,
  TrendingUp,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Mock Data ---

const NEURAL_NODES = [
  { x: 10, y: 30, z: 50, name: "Sleep", type: "Input" },
  { x: 30, y: 80, z: 80, name: "Stress", type: "Input" },
  { x: 50, y: 20, z: 60, name: "Nutrition", type: "Input" },
  { x: 40, y: 50, z: 90, name: "Trigger", type: "Input" },
  { x: 70, y: 70, z: 100, name: "Switch Risk", type: "Output" },
  { x: 80, y: 30, z: 70, name: "Dissociation", type: "Output" },
];

const PREDICTION_DATA = [
  { time: "Now", risk: 20, confidence: 95 },
  { time: "+1h", risk: 25, confidence: 92 },
  { time: "+2h", risk: 45, confidence: 88 }, // Rising risk
  { time: "+3h", risk: 75, confidence: 85 }, // High risk
  { time: "+4h", risk: 85, confidence: 80 }, // Peak
  { time: "+5h", risk: 60, confidence: 75 },
];

const PATTERN_RECOGNITION = [
  { 
    id: 1, 
    pattern: "Sleep Deprivation Loop", 
    trigger: "Sleep < 5h", 
    outcome: "Dissociation +40%", 
    confidence: 94,
    severity: "high"
  },
  { 
    id: 2, 
    pattern: "Caffeine Sensitivity", 
    trigger: "Coffee > 2 cups", 
    outcome: "Anxiety +30%", 
    confidence: 88,
    severity: "medium"
  },
  { 
    id: 3, 
    pattern: "Protector Trigger", 
    trigger: "Work Conflict", 
    outcome: "Protector Fronting", 
    confidence: 91,
    severity: "high"
  }
];

const SUGGESTIONS = [
  {
    type: "Immediate",
    action: "Box Breathing",
    duration: "5 min",
    reason: "Predicted anxiety spike in 30 mins based on current heart rate variability.",
    icon: Activity
  },
  {
    type: "Preventative",
    action: "Protein Snack",
    duration: "10 min",
    reason: "Blood sugar instability detected as a recurring trigger for afternoon dissociation.",
    icon: Zap
  },
  {
    type: "System",
    action: "Journal Check-in",
    duration: "15 min",
    reason: "Communication gap detected between Host and Little alters over last 48h.",
    icon: Network
  }
];

export default function GeniusAI() {
  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500 pb-12">
        {/* Header with AI Status */}
        <div className="flex flex-col md:flex-row justify-between gap-6 border-b border-border/40 pb-6">
          <div className="space-y-2">
             <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 bg-indigo-500/10 gap-1.5 px-3 py-1">
                    <Bot className="w-3.5 h-3.5" /> Genius Engine v3.0
                </Badge>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 gap-1.5 px-3 py-1 animate-pulse">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Live Monitoring
                </Badge>
             </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Deep Mind Analysis
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Neural network processing of your biometric and psychological data to predict system changes and optimize mental health.
            </p>
          </div>
          
          <div className="flex flex-col gap-3 min-w-[200px] bg-muted/20 p-4 rounded-xl border border-border/50">
             <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                    <Cpu className="w-4 h-4" /> Processing
                </span>
                <span className="font-mono text-indigo-400">2.4 TFLOPS</span>
             </div>
             <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                    <DatabaseIcon className="w-4 h-4" /> Data Points
                </span>
                <span className="font-mono text-emerald-400">14,203</span>
             </div>
             <Progress value={78} className="h-1 bg-indigo-500/10" indicatorClassName="bg-indigo-500" />
          </div>
        </div>

        {/* Main Neural Graph Visualization */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 bg-gradient-to-br from-background via-background to-indigo-950/20 border-indigo-500/20 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none" />
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <Network className="w-5 h-5 text-indigo-400" />
                        Neural Correlation Graph
                    </CardTitle>
                    <CardDescription>Visualizing hidden connections between your habits, triggers, and system states.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[400px] w-full bg-slate-950/30 rounded-xl border border-indigo-500/10 backdrop-blur-sm p-4 relative">
                        {/* Custom Lines for "Neural Connections" - purely decorative for mockup */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
                            <line x1="20%" y1="30%" x2="40%" y2="80%" stroke="#6366f1" strokeWidth="2" />
                            <line x1="20%" y1="30%" x2="50%" y2="50%" stroke="#6366f1" strokeWidth="1" />
                            <line x1="40%" y1="80%" x2="80%" y2="70%" stroke="#ef4444" strokeWidth="3" />
                            <line x1="50%" y1="50%" x2="80%" y2="30%" stroke="#6366f1" strokeWidth="1" />
                            <line x1="50%" y1="50%" x2="70%" y2="70%" stroke="#6366f1" strokeWidth="2" />
                        </svg>

                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.1} />
                                <XAxis type="number" dataKey="x" hide domain={[0, 100]} />
                                <YAxis type="number" dataKey="y" hide domain={[0, 100]} />
                                <ZAxis type="number" dataKey="z" range={[400, 4000]} />
                                <Tooltip 
                                    cursor={{ strokeDasharray: '3 3' }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-background/95 backdrop-blur-md border border-border p-3 rounded-lg shadow-xl">
                                                    <p className="font-bold text-base flex items-center gap-2">
                                                        {data.type === 'Output' ? <Sparkles className="w-4 h-4 text-amber-500" /> : <Activity className="w-4 h-4 text-indigo-500" />}
                                                        {data.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{data.type} Node</p>
                                                    <p className="text-sm mt-1">Weight: <span className="font-mono text-primary">{data.z}</span></p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Scatter name="Nodes" data={NEURAL_NODES} fill="#8884d8">
                                    {NEURAL_NODES.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={entry.type === 'Output' ? '#ef4444' : '#6366f1'} 
                                            stroke="hsl(var(--background))"
                                            strokeWidth={3}
                                        />
                                    ))}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Predictive Dashboard */}
            <div className="space-y-6">
                <Card className="border-l-4 border-l-amber-500 border-border/50 shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Lightbulb className="w-5 h-5 text-amber-500" />
                            Next 4 Hours
                        </CardTitle>
                        <CardDescription>System State Forecast</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold mb-1 flex items-baseline gap-2">
                            Switch Risk
                            <span className="text-sm font-normal text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">High</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                            Probability of switching to <strong className="text-foreground">Protector</strong> increases to 85% by 4 PM.
                        </p>
                        
                        <div className="h-[150px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={PREDICTION_DATA}>
                                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: 'hsl(var(--background))' }} />
                                    <Line type="monotone" dataKey="risk" stroke="#ef4444" strokeWidth={3} dot={{r: 3}} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/50 bg-muted/5">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <Microscope className="w-4 h-4" /> Root Cause Analysis
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span>Stress Level</span>
                            <Progress value={85} className="w-24 h-2 bg-muted" indicatorClassName="bg-rose-500" />
                        </div>
                         <div className="flex justify-between items-center text-sm">
                            <span>Sleep Debt</span>
                            <Progress value={60} className="w-24 h-2 bg-muted" indicatorClassName="bg-amber-500" />
                        </div>
                         <div className="flex justify-between items-center text-sm">
                            <span>Social Battery</span>
                            <Progress value={20} className="w-24 h-2 bg-muted" indicatorClassName="bg-slate-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>

        {/* Deep Learning Insights & Suggestions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Pattern Recognition */}
            <div className="space-y-4">
                 <h2 className="text-2xl font-semibold flex items-center gap-2">
                    <Fingerprint className="w-6 h-6 text-purple-500" />
                    Recognized Patterns
                </h2>
                <div className="space-y-3">
                    {PATTERN_RECOGNITION.map((pattern) => (
                        <div key={pattern.id} className="group p-4 rounded-xl border border-border/50 bg-background hover:border-purple-500/50 transition-all shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-lg group-hover:text-purple-500 transition-colors">{pattern.pattern}</h3>
                                <Badge variant={pattern.severity === 'high' ? 'destructive' : 'secondary'}>
                                    {pattern.confidence}% Confidence
                                </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <span className="bg-muted px-2 py-1 rounded text-muted-foreground">{pattern.trigger}</span>
                                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium text-foreground">{pattern.outcome}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Smart Interventions */}
            <div className="space-y-4">
                 <h2 className="text-2xl font-semibold flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-indigo-500" />
                    AI Prescriptions
                </h2>
                <div className="space-y-3">
                    {SUGGESTIONS.map((suggestion, i) => {
                        const Icon = suggestion.icon;
                        return (
                            <div key={i} className="flex gap-4 p-4 rounded-xl border border-border/50 bg-indigo-500/5 hover:bg-indigo-500/10 transition-colors">
                                <div className="mt-1 bg-background p-2 rounded-full border border-indigo-500/20 shadow-sm h-fit">
                                    <Icon className="w-5 h-5 text-indigo-500" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-base">{suggestion.action}</h3>
                                        <span className="text-xs text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border/50">{suggestion.duration}</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {suggestion.reason}
                                    </p>
                                    <div className="pt-2">
                                        <button className="text-xs font-medium text-indigo-500 hover:text-indigo-400 flex items-center gap-1">
                                            Accept Suggestion <ArrowRight className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>

      </div>
    </Layout>
  );
}

function DatabaseIcon(props: any) {
    return (
        <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        >
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
    )
}