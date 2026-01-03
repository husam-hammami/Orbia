import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  LineChart, 
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts";
import { MOCK_HABITS } from "@/lib/mock-data";
import { 
  BrainCircuit, 
  Utensils, 
  Briefcase, 
  TrendingUp, 
  Activity, 
  Zap, 
  Smile, 
  Frown,
  Meh,
  Calendar,
  CheckCircle2,
  Target
} from "lucide-react";

// --- Mock Data ---

const HABIT_DATA = [
  { name: "Mon", completed: 4, total: 6 },
  { name: "Tue", completed: 3, total: 6 },
  { name: "Wed", completed: 5, total: 6 },
  { name: "Thu", completed: 2, total: 6 },
  { name: "Fri", completed: 6, total: 6 },
  { name: "Sat", completed: 4, total: 6 },
  { name: "Sun", completed: 5, total: 6 },
];

const MOOD_DATA = [
  { name: "Mon", mood: 3, anxiety: 2, focus: 4 },
  { name: "Tue", mood: 4, anxiety: 1, focus: 5 },
  { name: "Wed", mood: 2, anxiety: 4, focus: 2 },
  { name: "Thu", mood: 3, anxiety: 3, focus: 3 },
  { name: "Fri", mood: 5, anxiety: 1, focus: 5 },
  { name: "Sat", mood: 4, anxiety: 2, focus: 4 },
  { name: "Sun", mood: 5, anxiety: 1, focus: 3 },
];

const FOOD_DATA = [
  { name: "Mon", cals: 2100, protein: 140 },
  { name: "Tue", cals: 1950, protein: 135 },
  { name: "Wed", cals: 2300, protein: 120 },
  { name: "Thu", cals: 1800, protein: 150 },
  { name: "Fri", cals: 2500, protein: 110 },
  { name: "Sat", cals: 2200, protein: 130 },
  { name: "Sun", cals: 2000, protein: 145 },
];

const CAREER_DATA = [
  { subject: 'Coding', A: 120, fullMark: 150 },
  { subject: 'Design', A: 98, fullMark: 150 },
  { subject: 'Writing', A: 86, fullMark: 150 },
  { subject: 'Networking', A: 99, fullMark: 150 },
  { subject: 'Learning', A: 85, fullMark: 150 },
  { subject: 'Planning', A: 65, fullMark: 150 },
];

const NUTRITION_DISTRIBUTION = [
  { name: 'Protein', value: 30, color: '#10b981' }, // Emerald
  { name: 'Carbs', value: 45, color: '#f59e0b' },   // Amber
  { name: 'Fats', value: 25, color: '#6366f1' },    // Indigo
];

export default function Analytics() {
  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500 pb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/40 pb-6">
          <div className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight">System Analytics</h1>
            <p className="text-muted-foreground text-lg">Comprehensive telemetry for your life OS.</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="px-3 py-1 h-8 text-sm font-normal gap-2">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              Last 7 Days
            </Badge>
          </div>
        </div>

        {/* Top Level KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           <Card className="bg-emerald-500/5 border-emerald-500/20">
              <CardContent className="p-4 flex flex-col gap-2">
                 <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Habit Rate
                 </span>
                 <div className="text-2xl font-mono font-bold">82%</div>
                 <Progress value={82} className="h-1 bg-emerald-500/20" indicatorClassName="bg-emerald-500" />
              </CardContent>
           </Card>
           <Card className="bg-indigo-500/5 border-indigo-500/20">
              <CardContent className="p-4 flex flex-col gap-2">
                 <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5" /> Career Focus
                 </span>
                 <div className="text-2xl font-mono font-bold">5.2h</div>
                 <div className="text-xs text-muted-foreground">Avg. Deep Work / Day</div>
              </CardContent>
           </Card>
           <Card className="bg-rose-500/5 border-rose-500/20">
              <CardContent className="p-4 flex flex-col gap-2">
                 <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5" /> Avg Mood
                 </span>
                 <div className="text-2xl font-mono font-bold flex items-center gap-2">
                    3.8 <span className="text-sm font-normal text-muted-foreground">/ 5.0</span>
                 </div>
                 <div className="flex gap-1">
                    {[1,2,3,4,5].map(n => (
                       <div key={n} className={`h-1.5 flex-1 rounded-full ${n <= 4 ? 'bg-rose-500' : 'bg-rose-500/20'}`} />
                    ))}
                 </div>
              </CardContent>
           </Card>
           <Card className="bg-amber-500/5 border-amber-500/20">
              <CardContent className="p-4 flex flex-col gap-2">
                 <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Utensils className="w-3.5 h-3.5" /> Adherence
                 </span>
                 <div className="text-2xl font-mono font-bold">94%</div>
                 <div className="text-xs text-muted-foreground">Nutrition Plan</div>
              </CardContent>
           </Card>
        </div>

        {/* Mental & Mood Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <Card className="lg:col-span-2 border-border/50 shadow-sm">
              <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5 text-indigo-500" />
                    Mental Telemetry
                 </CardTitle>
                 <CardDescription>Mood stability vs. Anxiety & Focus levels</CardDescription>
              </CardHeader>
              <CardContent>
                 <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={MOOD_DATA}>
                          <defs>
                             <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                             </linearGradient>
                             <linearGradient id="colorFocus" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                             </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                          <Tooltip 
                             contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: 'hsl(var(--background))' }}
                          />
                          <Area type="monotone" dataKey="mood" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorMood)" strokeWidth={2} name="Mood" />
                          <Area type="monotone" dataKey="focus" stroke="#10b981" fillOpacity={1} fill="url(#colorFocus)" strokeWidth={2} name="Focus" />
                          <Line type="monotone" dataKey="anxiety" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Anxiety" />
                       </AreaChart>
                    </ResponsiveContainer>
                 </div>
              </CardContent>
           </Card>

           <Card className="border-border/50 shadow-sm">
              <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                    <Smile className="w-5 h-5 text-rose-500" />
                    Mood Distribution
                 </CardTitle>
                 <CardDescription>Weekly emotional summary</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center items-center">
                 <div className="h-[250px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                          <Pie
                             data={[
                                { name: 'Great', value: 30, color: '#10b981' },
                                { name: 'Good', value: 45, color: '#3b82f6' },
                                { name: 'Okay', value: 15, color: '#f59e0b' },
                                { name: 'Low', value: 10, color: '#ef4444' },
                             ]}
                             cx="50%"
                             cy="50%"
                             innerRadius={60}
                             outerRadius={80}
                             paddingAngle={5}
                             dataKey="value"
                          >
                             {[
                                { name: 'Great', value: 30, color: '#10b981' },
                                { name: 'Good', value: 45, color: '#3b82f6' },
                                { name: 'Okay', value: 15, color: '#f59e0b' },
                                { name: 'Low', value: 10, color: '#ef4444' },
                             ].map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                             ))}
                          </Pie>
                          <Tooltip />
                       </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                       <div className="text-center">
                          <div className="text-2xl font-bold">4.2</div>
                          <div className="text-xs text-muted-foreground uppercase tracking-wide">Avg Score</div>
                       </div>
                    </div>
                 </div>
              </CardContent>
           </Card>
        </div>

        {/* Habits & Career Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <Card className="border-border/50 shadow-sm">
              <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    Habit Consistency
                 </CardTitle>
                 <CardDescription>Daily completion vs Total habits</CardDescription>
              </CardHeader>
              <CardContent>
                 <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={HABIT_DATA} barGap={0} barSize={20}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                          <Tooltip 
                             cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                             contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: 'hsl(var(--background))' }}
                          />
                          <Bar dataKey="completed" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Completed" />
                          <Bar dataKey="total" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} name="Total Target" />
                       </BarChart>
                    </ResponsiveContainer>
                 </div>
              </CardContent>
           </Card>

           <Card className="border-border/50 shadow-sm">
              <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-blue-500" />
                    Career Performance
                 </CardTitle>
                 <CardDescription>Skill focus and output distribution</CardDescription>
              </CardHeader>
              <CardContent>
                 <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                       <RadarChart cx="50%" cy="50%" outerRadius="80%" data={CAREER_DATA}>
                          <PolarGrid stroke="hsl(var(--border))" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                          <Radar
                             name="Performance"
                             dataKey="A"
                             stroke="#3b82f6"
                             fill="#3b82f6"
                             fillOpacity={0.3}
                          />
                          <Tooltip 
                             contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: 'hsl(var(--background))' }}
                          />
                       </RadarChart>
                    </ResponsiveContainer>
                 </div>
              </CardContent>
           </Card>
        </div>

        {/* Nutrition Section */}
        <Card className="border-border/50 shadow-sm">
           <CardHeader>
              <CardTitle className="flex items-center gap-2">
                 <Utensils className="w-5 h-5 text-amber-500" />
                 Nutritional Intake
              </CardTitle>
              <CardDescription>Calorie and macro tracking</CardDescription>
           </CardHeader>
           <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 <div className="lg:col-span-2 h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                       <LineChart data={FOOD_DATA}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                          <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                          <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                          <Tooltip 
                             contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: 'hsl(var(--background))' }}
                          />
                          <Line yAxisId="left" type="monotone" dataKey="cals" stroke="#f59e0b" strokeWidth={3} dot={{r:4}} activeDot={{r:6}} name="Calories" />
                          <Line yAxisId="right" type="monotone" dataKey="protein" stroke="#10b981" strokeWidth={2} dot={false} name="Protein (g)" />
                       </LineChart>
                    </ResponsiveContainer>
                 </div>
                 <div className="h-[250px] flex flex-col justify-center gap-4">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Macro Distribution</h4>
                    {NUTRITION_DISTRIBUTION.map(item => (
                       <div key={item.name} className="space-y-1">
                          <div className="flex justify-between text-sm">
                             <span className="font-medium">{item.name}</span>
                             <span>{item.value}%</span>
                          </div>
                          <Progress value={item.value} className="h-2" indicatorClassName={`bg-[${item.color}]`} style={{ '--indicator-color': item.color } as any} />
                       </div>
                    ))}
                 </div>
              </div>
           </CardContent>
        </Card>

      </div>
    </Layout>
  );
}
