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
  Cell,
  PieChart,
  Pie,
  Legend
} from "recharts";
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  Home, 
  Landmark, 
  Zap, 
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Mock Data ---

const MONTHLY_BUDGET = 4500;
const TOTAL_SPENT = 3120;
const DAYS_LEFT = 12;

const EXPENSES = [
  { id: 1, name: "Rent & Utilities", amount: 1800, budget: 1800, icon: Home, status: "paid", date: "Jan 1" },
  { id: 2, name: "Student Loan", amount: 450, budget: 450, icon: Landmark, status: "paid", date: "Jan 5" },
  { id: 3, name: "Groceries & Food", amount: 420, budget: 600, icon: ShoppingBagIcon, status: "variable", date: "Multiple" },
  { id: 4, name: "Transport", amount: 120, budget: 200, icon: CarIcon, status: "variable", date: "Multiple" },
  { id: 5, name: "Entertainment", amount: 180, budget: 300, icon: TicketIcon, status: "variable", date: "Multiple" },
  { id: 6, name: "Subscriptions", amount: 150, budget: 150, icon: Zap, status: "pending", date: "Jan 25" },
];

// Helper icons
function ShoppingBagIcon(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg> }
function CarIcon(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg> }
function TicketIcon(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="8" x="2" y="8" rx="2" ry="2"/><path d="M7 8v8"/><path d="M17 8v8"/><path d="M2 12h20"/></svg> }

const SPENDING_DATA = [
    { name: 'Fixed', value: 2400, color: '#6366f1' }, // Rent, Loans, Subs
    { name: 'Variable', value: 720, color: '#f59e0b' }, // Food, Fun
    { name: 'Remaining', value: 1380, color: '#10b981' }, // Savings/Buffer
];

const LOAN_PROGRESS = {
    total: 25000,
    paid: 8500,
    monthlyPayment: 450,
    remainingMonths: 36
};

export default function FinancePage() {
  const percentSpent = (TOTAL_SPENT / MONTHLY_BUDGET) * 100;

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500 pb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/40 pb-6">
          <div className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight">Financial Wellness</h1>
            <p className="text-muted-foreground text-lg">Track your monthly flow and loan progress.</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="px-3 py-1 h-8 text-sm font-normal gap-2 border-emerald-500/20 bg-emerald-500/5 text-emerald-600">
               <CheckCircle2 className="w-3.5 h-3.5" /> All Bills Paid
            </Badge>
          </div>
        </div>

        {/* Top Level Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-border/50 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Monthly Budget</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold flex items-baseline gap-1">
                        <span className="text-base text-muted-foreground align-top mt-1">$</span>
                        {MONTHLY_BUDGET.toLocaleString()}
                    </div>
                    <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Spent: ${TOTAL_SPENT.toLocaleString()}</span>
                            <span className="text-muted-foreground">{percentSpent.toFixed(0)}%</span>
                        </div>
                        <Progress value={percentSpent} className={cn("h-2", percentSpent > 90 ? "bg-rose-100" : "bg-muted")} indicatorClassName={percentSpent > 90 ? "bg-rose-500" : percentSpent > 75 ? "bg-amber-500" : "bg-emerald-500"} />
                    </div>
                </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm">
                 <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Remaining</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold flex items-baseline gap-1 text-emerald-600">
                        <span className="text-base text-emerald-600/60 align-top mt-1">$</span>
                        {(MONTHLY_BUDGET - TOTAL_SPENT).toLocaleString()}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        With {DAYS_LEFT} days left in the month.
                    </p>
                    <div className="mt-4 text-xs font-medium text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded inline-block">
                        Safe daily spend: ${((MONTHLY_BUDGET - TOTAL_SPENT) / DAYS_LEFT).toFixed(0)}
                    </div>
                </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm">
                 <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Debt Repayment</CardTitle>
                </CardHeader>
                <CardContent>
                     <div className="text-3xl font-bold flex items-baseline gap-1">
                        <span className="text-base text-muted-foreground align-top mt-1">$</span>
                        {LOAN_PROGRESS.paid.toLocaleString()}
                        <span className="text-base font-normal text-muted-foreground"> / {LOAN_PROGRESS.total.toLocaleString()}</span>
                    </div>
                    <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium text-indigo-600">{((LOAN_PROGRESS.paid / LOAN_PROGRESS.total) * 100).toFixed(1)}%</span>
                        </div>
                        <Progress value={(LOAN_PROGRESS.paid / LOAN_PROGRESS.total) * 100} className="h-2 bg-indigo-500/10" indicatorClassName="bg-indigo-500" />
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Expense List */}
            <div className="lg:col-span-2 space-y-6">
                <Card className="border-border/50 shadow-sm h-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-indigo-500" />
                            Monthly Expenses
                        </CardTitle>
                        <CardDescription>Breakdown of fixed and variable costs.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {EXPENSES.map((expense) => {
                                const Icon = expense.icon;
                                const isOverBudget = expense.amount > expense.budget;
                                const percent = Math.min((expense.amount / expense.budget) * 100, 100);
                                
                                return (
                                    <div key={expense.id} className="group p-3 rounded-lg border border-border/40 hover:border-indigo-500/30 hover:bg-muted/30 transition-all">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className={cn("p-2 rounded-lg", expense.status === 'paid' ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground")}>
                                                    <Icon className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="font-medium">{expense.name}</div>
                                                    <div className="text-xs text-muted-foreground capitalize">{expense.status} • {expense.date}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold font-mono">${expense.amount}</div>
                                                <div className="text-xs text-muted-foreground">of ${expense.budget}</div>
                                            </div>
                                        </div>
                                        {/* Simple bar for visual budget tracking */}
                                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                            <div 
                                                className={cn("h-full rounded-full", isOverBudget ? "bg-rose-500" : expense.status === 'paid' ? "bg-emerald-500" : "bg-indigo-500")} 
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Visual Breakdown */}
            <div className="space-y-6">
                <Card className="border-border/50 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base">Spending Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px] w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={SPENDING_DATA}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {SPENDING_DATA.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        formatter={(value: number) => `$${value}`}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: 'hsl(var(--background))' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36}/>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="text-center">
                                    <div className="text-sm font-medium text-muted-foreground">Total</div>
                                    <div className="text-xl font-bold text-foreground">${TOTAL_SPENT}</div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-indigo-500/5 border-indigo-500/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-indigo-500" />
                            Insight
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Your <strong className="text-foreground">Groceries</strong> spending is 15% lower than last month. Great job sticking to the meal plan!
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
      </div>
    </Layout>
  );
}