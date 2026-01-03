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
  // Input Layer (Sensory/State) - X: 10-20
  { id: 'n1', x: 15, y: 20, z: 50, name: "Sleep Quality", type: "Input", cluster: "bio" },
  { id: 'n2', x: 15, y: 50, z: 60, name: "Work Stress", type: "Input", cluster: "env" },
  { id: 'n3', x: 15, y: 80, z: 40, name: "Nutrition", type: "Input", cluster: "bio" },
  
  // Hidden Layer (Processing) - X: 45-55
  { id: 'n4', x: 50, y: 30, z: 90, name: "Amygdala", type: "Hidden", cluster: "brain" },
  { id: 'n5', x: 50, y: 70, z: 85, name: "Prefrontal Cortex", type: "Hidden", cluster: "brain" },

  // Output Layer (System State) - X: 80-90
  { id: 'n6', x: 85, y: 20, z: 100, name: "Dissociation", type: "Output", cluster: "result" },
  { id: 'n7', x: 85, y: 50, z: 90, name: "Switch Risk", type: "Output", cluster: "result" },
  { id: 'n8', x: 85, y: 80, z: 80, name: "Urge Intensity", type: "Output", cluster: "result" },
];

const NEURAL_EDGES = [
    { source: 'n1', target: 'n5', strength: 0.8, type: 'positive' }, // Sleep -> Cortex
    { source: 'n2', target: 'n4', strength: 0.9, type: 'positive' }, // Stress -> Amygdala
    { source: 'n2', target: 'n5', strength: 0.7, type: 'negative' }, // Stress -> Cortex (neg)
    { source: 'n3', target: 'n4', strength: 0.4, type: 'positive' }, // Nutrition -> Amygdala
    { source: 'n3', target: 'n5', strength: 0.6, type: 'positive' }, // Nutrition -> Cortex
    
    { source: 'n4', target: 'n6', strength: 0.9, type: 'positive' }, // Amygdala -> Dissociation
    { source: 'n4', target: 'n7', strength: 0.8, type: 'positive' }, // Amygdala -> Switch
    { source: 'n4', target: 'n8', strength: 0.7, type: 'positive' }, // Amygdala -> Urge
    
    { source: 'n5', target: 'n7', strength: 0.6, type: 'negative' }, // Cortex -> Switch (Inhibits)
    { source: 'n5', target: 'n8', strength: 0.8, type: 'negative' }, // Cortex -> Urge (Inhibits)
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

const CustomNeuralNode = (props: any) => {
    const { cx, cy, payload } = props;
    const isOutput = payload.type === 'Output';
    const isHidden = payload.type === 'Hidden';
    
    const color = isOutput ? '#ef4444' : isHidden ? '#a855f7' : '#6366f1';
    const radius = isOutput ? 12 : isHidden ? 10 : 8; // Slightly larger for better readability
    
    return (
        <g className="cursor-pointer group">
            {/* Glow Effect */}
            <circle cx={cx} cy={cy} r={radius * 2.5} fill={color} opacity={0.15} className="animate-pulse" />
            <circle cx={cx} cy={cy} r={radius * 1.2} fill={color} opacity={0.3} />
            
            {/* Core Node */}
            <circle cx={cx} cy={cy} r={radius} fill={color} stroke="hsl(var(--background))" strokeWidth={2} className="group-hover:stroke-white transition-colors" />
            
            {/* Label always visible for clarity */}
            <text x={cx} y={cy + radius + 15} textAnchor="middle" fill={color} fontSize={10} fontWeight="bold" className="opacity-70 group-hover:opacity-100 transition-opacity pointer-events-none uppercase tracking-wider">
                {payload.name}
            </text>
        </g>
    );
};

export default function DeepMind() {
  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500 pb-12">
        {/* Header with AI Status */}
        <div className="flex flex-col md:flex-row justify-between gap-6 border-b border-border/40 pb-6">
          <div className="space-y-2">
             <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 bg-indigo-500/10 gap-1.5 px-3 py-1">
                    <Bot className="w-3.5 h-3.5" /> Deep Mind Engine v3.0
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
                    <CardDescription>
                        Interactive Map: <span className="text-indigo-400">Inputs</span> (Left) → <span className="text-purple-400">Processing</span> (Center) → <span className="text-rose-400">Outcomes</span> (Right). 
                        Thicker lines indicate stronger influence.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[500px] w-full bg-slate-950 rounded-xl border border-indigo-500/10 shadow-inner p-4 relative overflow-hidden group">
                        {/* Dynamic Background Pattern */}
                        <div className="absolute inset-0 opacity-20" 
                             style={{ 
                                 backgroundImage: 'radial-gradient(circle at 50% 50%, #6366f1 1px, transparent 1px)', 
                                 backgroundSize: '40px 40px' 
                             }} 
                        />
                        
                        {/* Data-Driven Edge Layer */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none">
                            <defs>
                                <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0.4" />
                                </linearGradient>
                            </defs>
                            
                            {NEURAL_EDGES.map((edge, i) => {
                                const sourceNode = NEURAL_NODES.find(n => n.id === edge.source);
                                const targetNode = NEURAL_NODES.find(n => n.id === edge.target);
                                
                                if (!sourceNode || !targetNode) return null;

                                // Convert logical coordinates (0-100) to percentage for SVG
                                const x1 = `${sourceNode.x}%`;
                                const y1 = `${100 - sourceNode.y}%`; // Recharts flips Y axis? No, Scatterchart Y is bottom-up usually. Let's assume standard logical coords
                                const x2 = `${targetNode.x}%`;
                                const y2 = `${100 - targetNode.y}%`;

                                return (
                                    <g key={i}>
                                        <path 
                                            d={`M ${x1} ${y1} C ${parseFloat(x1)+15}% ${y1}, ${parseFloat(x2)-15}% ${y2}, ${x2} ${y2}`} 
                                            stroke="url(#edge-gradient)" 
                                            strokeWidth={edge.strength * 3} 
                                            fill="none" 
                                            opacity={0.6}
                                            className="transition-all duration-500"
                                        />
                                        {/* Animated particle for flow */}
                                        <circle r="2" fill="#fff">
                                            <animateMotion 
                                                dur={`${2 / edge.strength}s`} 
                                                repeatCount="indefinite"
                                                path={`M ${sourceNode.x * 10} ${1000 - sourceNode.y * 10} C ${(sourceNode.x + 15) * 10} ${1000 - sourceNode.y * 10}, ${(targetNode.x - 15) * 10} ${1000 - targetNode.y * 10}, ${targetNode.x * 10} ${1000 - targetNode.y * 10}`}
                                                // Note: coordinate mapping for animateMotion is tricky with percentages. 
                                                // Simplifying: we'll use CSS animation on the path instead if possible, or skip particles for robust SVG lines.
                                                // Actually, let's just use a pulsing opacity on the line itself.
                                            />
                                        </circle>
                                    </g>
                                );
                            })}
                        </svg>

                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#6366f1" opacity={0.05} vertical={false} horizontal={false} />
                                <XAxis type="number" dataKey="x" hide domain={[0, 100]} />
                                <YAxis type="number" dataKey="y" hide domain={[0, 100]} />
                                <ZAxis type="number" dataKey="z" range={[100, 600]} />
                                <Tooltip 
                                    cursor={{ strokeDasharray: '3 3', stroke: '#6366f1', strokeOpacity: 0.5 }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-slate-900/95 backdrop-blur-md border border-indigo-500/30 p-4 rounded-xl shadow-2xl text-white min-w-[200px]">
                                                    <p className="font-bold text-lg flex items-center gap-2 mb-2">
                                                        {data.type === 'Output' ? <Sparkles className="w-5 h-5 text-rose-500" /> : 
                                                         data.type === 'Hidden' ? <Cpu className="w-5 h-5 text-purple-500" /> :
                                                         <Activity className="w-5 h-5 text-indigo-500" />}
                                                        {data.name}
                                                    </p>
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex items-center justify-between text-xs text-slate-400 uppercase tracking-wider font-semibold">
                                                            <span>Activation Level</span>
                                                            <span className="text-white">{data.z}%</span>
                                                        </div>
                                                        <Progress value={data.z} className="h-1.5 bg-slate-700" indicatorClassName={
                                                            data.type === 'Output' ? "bg-rose-500" : 
                                                            data.type === 'Hidden' ? "bg-purple-500" : "bg-indigo-500"
                                                        } />
                                                        
                                                        <div className="mt-2 pt-2 border-t border-slate-800 text-xs text-slate-300">
                                                            {data.type === 'Input' && "Primary environmental driver."}
                                                            {data.type === 'Hidden' && "Internal processing node."}
                                                            {data.type === 'Output' && "Predicted system state."}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Scatter name="Nodes" data={NEURAL_NODES} shape={<CustomNeuralNode />} />
                            </ScatterChart>
                        </ResponsiveContainer>
                        
                        <div className="absolute bottom-4 left-4 text-xs text-slate-500 font-mono">
                            Graph Logic v4.2<br/>
                            {NEURAL_EDGES.length} Active Correlations
                        </div>
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