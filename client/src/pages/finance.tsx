import { useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Tooltip,
  Legend
} from "recharts";
import { 
  Wallet, 
  TrendingUp, 
  Home, 
  Landmark, 
  Zap, 
  CheckCircle2,
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense } from "@/lib/api-hooks";
import type { Expense } from "@shared/schema";

type ExpenseCategory = "Fixed" | "Variable" | "Savings" | "Debt";
type ExpenseStatus = "paid" | "pending" | "variable";

const MONTHLY_BUDGET = 4500;
const DAYS_LEFT = 12;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const LOAN_PROGRESS = {
    total: 25000,
    paid: 8500,
    monthlyPayment: 450,
    remainingMonths: 36
};

// Helper icons map
const getCategoryIcon = (category: ExpenseCategory) => {
  switch (category) {
    case "Fixed": return Home;
    case "Debt": return Landmark;
    case "Variable": return Zap; // Using Zap as generic for variable/shopping
    case "Savings": return Wallet;
    default: return DollarSign;
  }
};

const COLORS = {
  Fixed: '#6366f1',
  Variable: '#f59e0b',
  Debt: '#ef4444',
  Savings: '#10b981',
};

export default function FinancePage() {
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0); // 0 = January
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const currentMonth = MONTHS[currentMonthIndex];

  // Database hooks
  const { data: monthlyExpenses = [], isLoading } = useExpenses(currentMonth);
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    amount: number;
    budget: number;
    category: ExpenseCategory;
    status: ExpenseStatus;
    date: string;
  }>({
    name: "",
    amount: 0,
    budget: 0,
    category: "Variable",
    status: "pending",
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  });

  // Calculations
  const totalSpent = useMemo(() => monthlyExpenses.reduce((acc, curr) => acc + curr.amount, 0), [monthlyExpenses]);
  const percentSpent = (totalSpent / MONTHLY_BUDGET) * 100;
  
  const spendingData = useMemo(() => {
    const data: Record<string, number> = { Fixed: 0, Variable: 0, Debt: 0, Savings: 0 };
    monthlyExpenses.forEach(e => {
      if (data[e.category] !== undefined) {
        data[e.category] += e.amount;
      }
    });
    // Add remaining budget as "Savings/Buffer" if under budget
    const remaining = Math.max(0, MONTHLY_BUDGET - totalSpent);
    
    return [
      { name: 'Fixed', value: data.Fixed, color: COLORS.Fixed },
      { name: 'Variable', value: data.Variable, color: COLORS.Variable },
      { name: 'Debt', value: data.Debt, color: COLORS.Debt },
      { name: 'Remaining', value: remaining, color: COLORS.Savings },
    ].filter(item => item.value > 0);
  }, [monthlyExpenses, totalSpent]);

  // Handlers
  const handleMonthChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
        setCurrentMonthIndex(prev => Math.max(0, prev - 1));
    } else {
        setCurrentMonthIndex(prev => Math.min(MONTHS.length - 1, prev + 1));
    }
  };

  const handleOpenAdd = () => {
    setEditingExpense(null);
    setFormData({
      name: "",
      amount: 0,
      budget: 0,
      category: "Variable",
      status: "pending",
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      name: expense.name,
      amount: expense.amount,
      budget: expense.budget,
      category: expense.category as ExpenseCategory,
      status: expense.status as ExpenseStatus,
      date: expense.date
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteExpense.mutate(id, {
      onSuccess: () => {
        toast.success("Expense removed");
      },
      onError: () => {
        toast.error("Failed to delete expense");
      }
    });
  };

  const handleSave = () => {
    if (!formData.name || formData.amount === undefined) return;

    if (editingExpense) {
      updateExpense.mutate({
        id: editingExpense.id,
        name: formData.name,
        amount: formData.amount,
        budget: formData.budget,
        category: formData.category,
        status: formData.status,
        date: formData.date
      }, {
        onSuccess: () => {
          toast.success("Expense updated");
          setIsDialogOpen(false);
        },
        onError: () => {
          toast.error("Failed to update expense");
        }
      });
    } else {
      createExpense.mutate({
        name: formData.name || "Expense",
        amount: formData.amount || 0,
        budget: formData.budget || 0,
        category: formData.category || "Variable",
        status: formData.status || "pending",
        date: formData.date || new Date().toLocaleDateString(),
        month: currentMonth
      }, {
        onSuccess: () => {
          toast.success("Expense added");
          setIsDialogOpen(false);
        },
        onError: () => {
          toast.error("Failed to add expense");
        }
      });
    }
  };

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500 pb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/40 pb-6">
          <div className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight">Financial Wellness</h1>
            <p className="text-muted-foreground text-lg">Track your monthly flow and loan progress.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-muted/50 rounded-lg p-1 border border-border/50">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8" 
                    onClick={() => handleMonthChange('prev')}
                    disabled={currentMonthIndex === 0}
                >
                    <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="px-4 font-medium min-w-[100px] text-center flex items-center justify-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    {currentMonth}
                </div>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => handleMonthChange('next')}
                    disabled={currentMonthIndex === MONTHS.length - 1}
                >
                    <ChevronRight className="w-4 h-4" />
                </Button>
            </div>
            
            <Button onClick={handleOpenAdd} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="w-4 h-4" /> Add Expense
            </Button>
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
                            <span>Spent: ${totalSpent.toLocaleString()}</span>
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
                        {(MONTHLY_BUDGET - totalSpent).toLocaleString()}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        With {DAYS_LEFT} days left in the month.
                    </p>
                    <div className="mt-4 text-xs font-medium text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded inline-block">
                        Safe daily spend: ${Math.max(0, (MONTHLY_BUDGET - totalSpent) / DAYS_LEFT).toFixed(0)}
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
                            {currentMonth} Expenses
                        </CardTitle>
                        <CardDescription>Breakdown of fixed and variable costs.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {isLoading ? (
                                <div className="text-center py-12 flex flex-col items-center justify-center text-muted-foreground">
                                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
                                    <p className="font-medium">Loading expenses...</p>
                                </div>
                            ) : monthlyExpenses.length === 0 ? (
                                <div className="text-center py-12 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border/50 rounded-xl bg-muted/5">
                                    <div className="bg-muted p-3 rounded-full mb-3">
                                        <Calendar className="w-6 h-6 text-muted-foreground" />
                                    </div>
                                    <p className="font-medium">No expenses for {currentMonth}</p>
                                    <p className="text-sm mt-1">Start tracking by adding a new expense.</p>
                                </div>
                            ) : (
                                monthlyExpenses.map((expense) => {
                                    const Icon = getCategoryIcon(expense.category as ExpenseCategory);
                                    const isOverBudget = expense.amount > expense.budget && expense.budget > 0;
                                    const percent = expense.budget > 0 ? Math.min((expense.amount / expense.budget) * 100, 100) : 100;
                                    
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
                                                
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <div className="font-bold font-mono">${expense.amount}</div>
                                                        {expense.budget > 0 && <div className="text-xs text-muted-foreground">of ${expense.budget}</div>}
                                                    </div>
                                                    
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <MoreHorizontal className="w-4 h-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handleOpenEdit(expense)}>
                                                                <Pencil className="w-4 h-4 mr-2" /> Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleDelete(expense.id)} className="text-rose-600">
                                                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>
                                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                                <div 
                                                    className={cn("h-full rounded-full", isOverBudget ? "bg-rose-500" : expense.status === 'paid' ? "bg-emerald-500" : "bg-indigo-500")} 
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>
                                        </div>
                                    )
                                })
                            )}
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
                                        data={spendingData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {spendingData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        formatter={(value: number) => `$${value.toLocaleString()}`}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: 'hsl(var(--background))' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36}/>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="text-center">
                                    <div className="text-sm font-medium text-muted-foreground">Total</div>
                                    <div className="text-xl font-bold text-foreground">${totalSpent.toLocaleString()}</div>
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

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{editingExpense ? "Edit Expense" : "Add New Expense"}</DialogTitle>
                    <DialogDescription>
                        Track your spending to stay on top of your goals.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input 
                            id="name" 
                            value={formData.name} 
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            className="col-span-3" 
                            placeholder="e.g. Groceries"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="amount" className="text-right">Amount ($)</Label>
                        <Input 
                            id="amount" 
                            type="number"
                            value={formData.amount} 
                            onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                            className="col-span-3" 
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="budget" className="text-right">Budget ($)</Label>
                        <Input 
                            id="budget" 
                            type="number"
                            value={formData.budget} 
                            onChange={(e) => setFormData({...formData, budget: parseFloat(e.target.value) || 0})}
                            className="col-span-3" 
                            placeholder="Optional"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="category" className="text-right">Category</Label>
                        <Select 
                            value={formData.category} 
                            onValueChange={(val: ExpenseCategory) => setFormData({...formData, category: val})}
                        >
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Fixed">Fixed Bill</SelectItem>
                                <SelectItem value="Variable">Variable Spending</SelectItem>
                                <SelectItem value="Debt">Debt Repayment</SelectItem>
                                <SelectItem value="Savings">Savings</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="status" className="text-right">Status</Label>
                         <Select 
                            value={formData.status} 
                            onValueChange={(val: ExpenseStatus) => setFormData({...formData, status: val})}
                        >
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="paid">Paid</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="variable">Variable</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit" onClick={handleSave}>Save Expense</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      </div>
    </Layout>
  );
}