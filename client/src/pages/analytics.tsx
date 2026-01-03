import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from "recharts";
import { MOCK_HABITS } from "@/lib/mock-data";

export default function Analytics() {
  const data = [
    { name: "Mon", completed: 4 },
    { name: "Tue", completed: 3 },
    { name: "Wed", completed: 5 },
    { name: "Thu", completed: 2 },
    { name: "Fri", completed: 6 },
    { name: "Sat", completed: 4 },
    { name: "Sun", completed: 5 },
  ];

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">Visualize your progress and patterns.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-sm border-border/50">
            <CardHeader>
              <CardTitle>Weekly Completion</CardTitle>
              <CardDescription>Number of habits completed per day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'hsl(var(--muted-foreground))' }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'hsl(var(--muted-foreground))' }} 
                    />
                    <Tooltip 
                      cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                      contentStyle={{ 
                        borderRadius: '8px', 
                        border: 'none', 
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
                      }}
                    />
                    <Bar 
                      dataKey="completed" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]} 
                      barSize={30}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardHeader>
              <CardTitle>Consistency Score</CardTitle>
              <CardDescription>Monthly trend of habit adherence</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'hsl(var(--muted-foreground))' }} 
                      dy={10}
                    />
                    <Tooltip 
                       contentStyle={{ 
                        borderRadius: '8px', 
                        border: 'none', 
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="completed" 
                      stroke="hsl(var(--chart-2))" 
                      strokeWidth={3}
                      dot={{ r: 4, fill: "hsl(var(--chart-2))", strokeWidth: 0 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
            <h2 className="text-xl font-display font-semibold mb-4">Habit Breakdown</h2>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {MOCK_HABITS.map(habit => (
                    <Card key={habit.id} className="overflow-hidden border-border/50 shadow-xs hover:shadow-md transition-shadow">
                        <div className="h-2 w-full" style={{ backgroundColor: habit.color }} />
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg">{habit.title}</CardTitle>
                            <CardDescription className="flex items-center gap-2">
                                <span className="bg-secondary px-2 py-0.5 rounded text-xs text-secondary-foreground font-medium">{habit.category}</span>
                                <span className="text-xs">{habit.frequency}</span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-2xl font-mono font-bold">{habit.streak}</p>
                                    <p className="text-xs text-muted-foreground">Current Streak</p>
                                </div>
                                <div className="text-right">
                                     <p className="text-2xl font-mono font-bold text-muted-foreground">{habit.history.length}</p>
                                     <p className="text-xs text-muted-foreground">Total Days</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
             </div>
        </div>
      </div>
    </Layout>
  );
}
