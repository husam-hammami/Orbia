import { useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useDateScope } from "@/hooks/use-date-scope";
import { DateScopeControl } from "@/components/date-scope-control";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown,
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  Briefcase,
  Upload,
  Sparkles,
  CheckCircle2,
  XCircle,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  useAllTransactions,
  useCreateTransaction, 
  useDeleteTransaction,
  useIncomeStreams,
  useCreateIncomeStream,
  useDeleteIncomeStream,
  useFinanceSettings, 
  useUpdateFinanceSettings,
  useImportTransactions,
  useCreateManyTransactions,
  useLoans,
  useCreateLoan,
  useDeleteLoan,
  useCreateLoanPayment
} from "@/lib/api-hooks";
import type { Transaction, IncomeStream, Loan } from "@shared/schema";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

type TransactionCategory = "salary" | "food" | "transport" | "utilities" | "entertainment" | "healthcare" | "shopping" | "debt_payment" | "savings" | "investment" | "freelance" | "benefits" | "other";

const CATEGORY_LABELS: Record<TransactionCategory, string> = {
  salary: "Salary",
  food: "Food & Dining",
  transport: "Transport",
  utilities: "Utilities",
  entertainment: "Entertainment",
  healthcare: "Healthcare",
  shopping: "Shopping",
  debt_payment: "Debt Payment",
  savings: "Savings",
  investment: "Investment",
  freelance: "Freelance",
  benefits: "Benefits",
  other: "Other"
};

const CATEGORY_COLORS: Record<TransactionCategory, string> = {
  salary: "bg-emerald-500",
  food: "bg-amber-500",
  transport: "bg-blue-500",
  utilities: "bg-slate-500",
  entertainment: "bg-purple-500",
  healthcare: "bg-rose-500",
  shopping: "bg-pink-500",
  debt_payment: "bg-red-600",
  savings: "bg-teal-500",
  investment: "bg-indigo-500",
  freelance: "bg-green-500",
  benefits: "bg-cyan-500",
  other: "bg-gray-500"
};

const CATEGORY_HEX_COLORS: Record<TransactionCategory, string> = {
  salary: "#10b981",
  food: "#f59e0b",
  transport: "#3b82f6",
  utilities: "#64748b",
  entertainment: "#a855f7",
  healthcare: "#f43f5e",
  shopping: "#ec4899",
  debt_payment: "#dc2626",
  savings: "#14b8a6",
  investment: "#6366f1",
  freelance: "#22c55e",
  benefits: "#06b6d4",
  other: "#6b7280"
};

const formatCurrency = (amount: number, currency = "AED") => 
  `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export default function FinancePage() {
  const { scope, mode, setMode, goNext, goPrev, goToday, setCustomRange, isInRange } = useDateScope("monthly");
  
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [isIncomeDialogOpen, setIsIncomeDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isLoanDialogOpen, setIsLoanDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  
  const [transactionType, setTransactionType] = useState<"income" | "expense">("expense");
  const [importText, setImportText] = useState("");
  const [importPreview, setImportPreview] = useState<any[] | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const { data: allTransactions = [], isLoading: transactionsLoading } = useAllTransactions();
  
  const transactions = useMemo(() => {
    return allTransactions.filter(tx => {
      if (!tx.date) return false;
      const txDate = new Date(tx.date);
      return txDate >= scope.range.start && txDate <= scope.range.end;
    });
  }, [allTransactions, scope.range]);
  const { data: incomeStreams = [], isLoading: incomeLoading } = useIncomeStreams();
  const { data: financeSettings } = useFinanceSettings();
  const { data: loans = [], isLoading: loansLoading } = useLoans();
  
  const createTransaction = useCreateTransaction();
  const deleteTransaction = useDeleteTransaction();
  const createIncomeStream = useCreateIncomeStream();
  const deleteIncomeStream = useDeleteIncomeStream();
  const updateFinanceSettings = useUpdateFinanceSettings();
  const importTransactions = useImportTransactions();
  const createManyTransactions = useCreateManyTransactions();
  const createLoan = useCreateLoan();
  const deleteLoan = useDeleteLoan();
  const createLoanPayment = useCreateLoanPayment();

  const currency = financeSettings?.currency || "AED";
  const savingsGoal = financeSettings?.savingsGoal || 0;

  const [txForm, setTxForm] = useState({
    name: "",
    amount: 0,
    category: "other" as TransactionCategory,
    notes: ""
  });

  const [incomeForm, setIncomeForm] = useState({
    name: "",
    amount: 0,
    frequency: "monthly" as "monthly" | "biweekly" | "weekly" | "once",
    isActive: 1
  });

  const [settingsForm, setSettingsForm] = useState({
    currency: currency,
    savingsGoal: savingsGoal
  });

  const [loanForm, setLoanForm] = useState({
    name: "",
    lender: "",
    originalAmount: 0,
    minimumPayment: 0,
    interestRate: "",
    dueDay: "",
    notes: ""
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    notes: ""
  });

  const monthlyIncome = useMemo(() => {
    return transactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);
  }, [transactions]);

  const monthlyExpenses = useMemo(() => {
    return transactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);
  }, [transactions]);

  const netCashFlow = monthlyIncome - monthlyExpenses;
  const savingsProgress = savingsGoal > 0 ? Math.min((netCashFlow / savingsGoal) * 100, 100) : 0;

  const expectedMonthlyIncome = useMemo(() => {
    return incomeStreams
      .filter(s => s.isActive === 1)
      .reduce((sum, s) => {
        switch (s.frequency) {
          case "weekly": return sum + Number(s.amount) * 4;
          case "biweekly": return sum + Number(s.amount) * 2;
          default: return sum + Number(s.amount);
        }
      }, 0);
  }, [incomeStreams]);

  const expensesByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.filter(t => t.type === "expense").forEach(t => {
      const cat = t.category || "other";
      map[cat] = (map[cat] || 0) + Number(t.amount);
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [transactions]);

  const chartData = useMemo(() => {
    const now = new Date();
    const months: { month: string; income: number; expenses: number; netFlow: number }[] = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
      const shortMonth = MONTHS[date.getMonth()].slice(0, 3);
      
      const monthTransactions = allTransactions.filter(t => t.month === monthLabel);
      const income = monthTransactions
        .filter(t => t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const expenses = monthTransactions
        .filter(t => t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      months.push({
        month: shortMonth,
        income,
        expenses,
        netFlow: income - expenses
      });
    }
    
    return months;
  }, [allTransactions]);

  const chartData12Months = useMemo(() => {
    const now = new Date();
    const months: { month: string; income: number; expenses: number; netFlow: number }[] = [];
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
      const shortMonth = MONTHS[date.getMonth()].slice(0, 3);
      
      const monthTransactions = allTransactions.filter(t => t.month === monthLabel);
      const income = monthTransactions
        .filter(t => t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const expenses = monthTransactions
        .filter(t => t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      months.push({
        month: shortMonth,
        income,
        expenses,
        netFlow: income - expenses
      });
    }
    
    return months;
  }, [allTransactions]);

  const categoryChartData = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.filter(t => t.type === "expense").forEach(t => {
      const cat = t.category || "other";
      map[cat] = (map[cat] || 0) + Number(t.amount);
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, value]) => ({
        name: CATEGORY_LABELS[cat as TransactionCategory] || cat,
        value,
        color: CATEGORY_HEX_COLORS[cat as TransactionCategory] || "#6b7280"
      }));
  }, [transactions]);

  const handleAddTransaction = () => {
    if (!txForm.name || txForm.amount <= 0) {
      toast.error("Please enter a name and amount");
      return;
    }
    
    const now = new Date();
    createTransaction.mutate({
      type: transactionType,
      name: txForm.name,
      amount: txForm.amount,
      category: txForm.category,
      date: now,
      month: now.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
      isRecurring: 0,
      notes: txForm.notes || null
    }, {
      onSuccess: () => {
        toast.success(`${transactionType === "income" ? "Income" : "Expense"} added`);
        setIsTransactionDialogOpen(false);
        setTxForm({ name: "", amount: 0, category: "other", notes: "" });
      }
    });
  };

  const handleAddIncomeStream = () => {
    if (!incomeForm.name || incomeForm.amount <= 0) {
      toast.error("Please enter a name and amount");
      return;
    }
    
    createIncomeStream.mutate({
      name: incomeForm.name,
      amount: incomeForm.amount,
      frequency: incomeForm.frequency,
      isActive: 1
    }, {
      onSuccess: () => {
        toast.success("Income stream added");
        setIsIncomeDialogOpen(false);
        setIncomeForm({ name: "", amount: 0, frequency: "monthly", isActive: 1 });
      }
    });
  };

  const handleDeleteTransaction = (id: string) => {
    deleteTransaction.mutate(id, {
      onSuccess: () => toast.success("Transaction deleted")
    });
  };

  const handleDeleteIncomeStream = (id: string) => {
    deleteIncomeStream.mutate(id, {
      onSuccess: () => toast.success("Income stream removed")
    });
  };

  const handleLogIncomePayment = (stream: { id: string; name: string; amount: number; category?: string }) => {
    const now = new Date();
    createTransaction.mutate({
      type: "income",
      name: stream.name,
      amount: stream.amount,
      category: stream.category || "salary",
      date: now,
      month: now.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
      isRecurring: 0,
      incomeStreamId: stream.id,
      notes: null
    }, {
      onSuccess: () => {
        toast.success(`Logged ${stream.name} payment`);
      }
    });
  };

  const handleSaveSettings = () => {
    updateFinanceSettings.mutate({
      currency: settingsForm.currency,
      savingsGoal: settingsForm.savingsGoal
    }, {
      onSuccess: () => {
        toast.success("Settings saved");
        setIsSettingsDialogOpen(false);
      }
    });
  };

  const handleAddLoan = () => {
    if (!loanForm.name || loanForm.originalAmount <= 0 || loanForm.minimumPayment <= 0) {
      toast.error("Please enter name, original amount, and minimum payment");
      return;
    }
    
    const interestRateBasisPoints = loanForm.interestRate 
      ? Math.round(parseFloat(loanForm.interestRate) * 100) 
      : undefined;
    
    createLoan.mutate({
      name: loanForm.name,
      lender: loanForm.lender || null,
      principal: loanForm.originalAmount,
      currentBalance: loanForm.originalAmount,
      minimumPayment: loanForm.minimumPayment,
      interestRate: interestRateBasisPoints,
      dueDay: loanForm.dueDay ? parseInt(loanForm.dueDay) : undefined,
      notes: loanForm.notes || null,
      status: "active"
    }, {
      onSuccess: () => {
        toast.success("Loan added");
        setIsLoanDialogOpen(false);
        setLoanForm({ name: "", lender: "", originalAmount: 0, minimumPayment: 0, interestRate: "", dueDay: "", notes: "" });
      }
    });
  };

  const handleDeleteLoan = (id: string) => {
    deleteLoan.mutate(id, {
      onSuccess: () => toast.success("Loan deleted")
    });
  };

  const handleOpenPaymentDialog = (loan: Loan) => {
    setSelectedLoan(loan);
    setPaymentForm({ amount: loan.minimumPayment, notes: "" });
    setIsPaymentDialogOpen(true);
  };

  const handleMakePayment = () => {
    if (!selectedLoan || paymentForm.amount <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }
    
    createLoanPayment.mutate({
      loanId: selectedLoan.id,
      amount: paymentForm.amount,
      paymentDate: new Date(),
      notes: paymentForm.notes || null
    }, {
      onSuccess: () => {
        toast.success("Payment recorded");
        setIsPaymentDialogOpen(false);
        setSelectedLoan(null);
        setPaymentForm({ amount: 0, notes: "" });
      }
    });
  };

  const handleParseDocument = async () => {
    if (!importText.trim()) {
      toast.error("Please paste document text");
      return;
    }
    setIsImporting(true);
    try {
      const result = await importTransactions.mutateAsync({
        documentText: importText,
        documentType: "bank statement"
      });
      setImportPreview(result.transactions);
      toast.success(`Found ${result.count} transactions`);
    } catch (e) {
      toast.error("Failed to parse document");
    } finally {
      setIsImporting(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!importPreview?.length) return;
    
    try {
      const transactionsToImport = importPreview.map(t => {
        let txDate: Date;
        if (t.date) {
          txDate = new Date(t.date);
          if (isNaN(txDate.getTime())) {
            txDate = new Date();
          }
        } else {
          txDate = new Date();
        }
        const monthName = txDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        
        return {
          type: t.type,
          name: t.name,
          amount: Math.round(t.amount),
          category: t.category,
          date: txDate,
          month: monthName,
          isRecurring: 0,
          notes: t.notes || null,
          importSource: "ai_import"
        };
      });
      
      await createManyTransactions.mutateAsync(transactionsToImport);
      toast.success(`Imported ${importPreview.length} transactions`);
      setIsImportDialogOpen(false);
      setImportText("");
      setImportPreview(null);
    } catch (e: any) {
      console.error("Import error:", e);
      toast.error(e?.message || "Failed to import transactions");
    }
  };

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500 pb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/40 pb-6">
          <div className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight">Financial Wellness</h1>
            <p className="text-muted-foreground text-lg">Track income, expenses, and cash flow.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <DateScopeControl
              scope={scope}
              mode={mode}
              onModeChange={setMode}
              onPrev={goPrev}
              onNext={goNext}
              onToday={goToday}
              onCustomRange={setCustomRange}
            />
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsSettingsDialogOpen(true)}
              data-testid="btn-settings"
            >
              <Pencil className="w-4 h-4 mr-1" /> Settings
            </Button>
          </div>
        </div>

        <Tabs defaultValue="summary" className="space-y-6">
          <TabsList className="grid w-full max-w-[400px] grid-cols-2">
            <TabsTrigger value="summary" data-testid="tab-summary">Summary</TabsTrigger>
            <TabsTrigger value="insights" data-testid="tab-insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-6">
            {/* Cash Flow Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-border/50 shadow-sm bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-background">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                Income
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {formatCurrency(monthlyIncome, currency)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Expected: {formatCurrency(expectedMonthlyIncome, currency)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/30 dark:to-background">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-600">
                {formatCurrency(monthlyExpenses, currency)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {transactions.filter(t => t.type === "expense").length} transactions
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-background">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Net Flow
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold", netCashFlow >= 0 ? "text-blue-600" : "text-rose-600")}>
                {netCashFlow >= 0 ? "+" : ""}{formatCurrency(netCashFlow, currency)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {netCashFlow >= 0 ? "Surplus" : "Deficit"} this month
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Wallet className="w-4 h-4 text-indigo-600" />
                Savings Goal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {savingsProgress.toFixed(0)}%
              </div>
              {savingsGoal > 0 ? (
                <Progress 
                  value={savingsProgress} 
                  className="h-2 mt-2"
                  indicatorClassName={savingsProgress >= 100 ? "bg-emerald-500" : "bg-indigo-500"}
                />
              ) : (
                <p className="text-xs text-muted-foreground mt-1">No goal set</p>
              )}
            </CardContent>
          </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content - Transactions */}
              <div className="lg:col-span-2 space-y-6">
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-500" />
                    Transactions
                  </CardTitle>
                  <CardDescription>All income and expenses for {scope.label}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsImportDialogOpen(true)}
                    data-testid="btn-import"
                  >
                    <Upload className="w-4 h-4 mr-1" /> Import
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => {
                      setTransactionType("expense");
                      setIsTransactionDialogOpen(true);
                    }}
                    className="bg-rose-600 hover:bg-rose-700"
                    data-testid="btn-add-expense"
                  >
                    <TrendingDown className="w-4 h-4 mr-1" /> Expense
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => {
                      setTransactionType("income");
                      setIsTransactionDialogOpen(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700"
                    data-testid="btn-add-income"
                  >
                    <TrendingUp className="w-4 h-4 mr-1" /> Income
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {transactionsLoading ? (
                  <div className="text-center py-12 flex flex-col items-center text-muted-foreground">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
                    <p>Loading transactions...</p>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-12 flex flex-col items-center text-muted-foreground border-2 border-dashed rounded-xl bg-muted/5">
                    <Wallet className="w-10 h-10 mb-3 opacity-50" />
                    <p className="font-medium">No transactions yet</p>
                    <p className="text-sm mt-1">Add your first income or expense</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {transactions.map((tx) => (
                      <div 
                        key={tx.id} 
                        className="group flex items-center justify-between p-3 rounded-lg border border-border/40 hover:border-border hover:bg-muted/30 transition-all"
                        data-testid={`transaction-${tx.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center",
                            tx.type === "income" ? "bg-emerald-500/10" : "bg-rose-500/10"
                          )}>
                            {tx.type === "income" ? (
                              <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <ArrowUpRight className="w-5 h-5 text-rose-600" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{tx.name}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              <Badge variant="outline" className="text-xs py-0 px-1.5">
                                {CATEGORY_LABELS[tx.category as TransactionCategory] || tx.category}
                              </Badge>
                              {tx.date && new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "font-bold font-mono",
                            tx.type === "income" ? "text-emerald-600" : "text-rose-600"
                          )}>
                            {tx.type === "income" ? "+" : "-"}{formatCurrency(Number(tx.amount), currency)}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => handleDeleteTransaction(tx.id)} 
                                className="text-rose-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Income Streams */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-emerald-600" />
                  Income Streams
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7"
                  onClick={() => setIsIncomeDialogOpen(true)}
                  data-testid="btn-add-income-stream"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {incomeLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : incomeStreams.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No income sources added yet
                  </p>
                ) : (
                  incomeStreams.map((stream) => (
                    <div 
                      key={stream.id} 
                      className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/30"
                      data-testid={`income-stream-${stream.id}`}
                    >
                      <div>
                        <div className="font-medium text-sm">{stream.name}</div>
                        <div className="text-xs text-muted-foreground capitalize">{stream.frequency}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-emerald-600">
                          {formatCurrency(Number(stream.amount), currency)}
                        </span>
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="h-7 text-xs px-3 bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleLogIncomePayment(stream)}
                          data-testid={`log-payment-${stream.id}`}
                        >
                          <Check className="w-3 h-3 mr-1" /> Log Payment
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7"
                          onClick={() => handleDeleteIncomeStream(stream.id)}
                        >
                          <Trash2 className="w-3 h-3 text-rose-500" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Top Spending Categories */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-rose-500" />
                  Top Spending
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {expensesByCategory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No expenses recorded yet
                  </p>
                ) : (
                  expensesByCategory.map(([cat, amount]) => (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{CATEGORY_LABELS[cat as TransactionCategory] || cat}</span>
                        <span className="font-mono">{formatCurrency(amount, currency)}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full", CATEGORY_COLORS[cat as TransactionCategory] || "bg-gray-500")}
                          style={{ width: `${Math.min((amount / monthlyExpenses) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Loans */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-indigo-600" />
                  Loans
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7"
                  onClick={() => setIsLoanDialogOpen(true)}
                  data-testid="btn-add-loan"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {loansLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : loans.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No loans added yet
                  </p>
                ) : (
                  loans.map((loan) => {
                    const paidAmount = loan.principal - loan.currentBalance;
                    const progressPercent = loan.principal > 0 ? (paidAmount / loan.principal) * 100 : 0;
                    return (
                      <div 
                        key={loan.id} 
                        className="p-3 rounded-lg border border-border/50 bg-muted/30 space-y-2"
                        data-testid={`loan-${loan.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">{loan.name}</div>
                            {loan.lender && (
                              <div className="text-xs text-muted-foreground">{loan.lender}</div>
                            )}
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={() => handleDeleteLoan(loan.id)}
                          >
                            <Trash2 className="w-3 h-3 text-rose-500" />
                          </Button>
                        </div>
                        <div className="space-y-1">
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full bg-emerald-600"
                              style={{ width: `${Math.min(progressPercent, 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{progressPercent.toFixed(0)}% paid</span>
                            <span className="font-mono">
                              {formatCurrency(loan.currentBalance, currency)} / {formatCurrency(loan.principal, currency)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs text-muted-foreground">
                            Min: {formatCurrency(loan.minimumPayment, currency)}
                          </span>
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="h-7 text-xs px-3 bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => handleOpenPaymentDialog(loan)}
                            data-testid={`make-payment-${loan.id}`}
                          >
                            <DollarSign className="w-3 h-3 mr-1" /> Make Payment
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">Financial Insights</h2>
              <p className="text-muted-foreground">Analyze your spending patterns and cash flow trends</p>
            </div>

            <Card className="border-border/50 shadow-sm" data-testid="card-cash-flow-chart">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-500" />
                  Cash Flow Overview
                </CardTitle>
                <CardDescription>Income, expenses, and net flow for the last 12 months</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={chartData12Months} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickFormatter={(value) => {
                        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                        if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                        return value.toString();
                      }}
                    />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        formatCurrency(value, currency),
                        name
                      ]}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                      labelStyle={{ fontWeight: 600 }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: 10 }}
                      iconType="rect"
                    />
                    <Bar 
                      dataKey="income" 
                      fill="#10b981" 
                      name="Income" 
                      radius={[4, 4, 0, 0]}
                      opacity={0.9}
                    />
                    <Bar 
                      dataKey="expenses" 
                      fill="#f43f5e" 
                      name="Expenses" 
                      radius={[4, 4, 0, 0]}
                      opacity={0.9}
                    />
                    <Line 
                      type="monotone"
                      dataKey="netFlow" 
                      stroke="#6366f1" 
                      strokeWidth={2} 
                      name="Net Flow"
                      dot={{ r: 4, fill: '#6366f1' }}
                      activeDot={{ r: 6 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card className="border-border/50 shadow-sm" data-testid="card-net-flow-trend">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-500" />
                    Net Flow Trend
                  </CardTitle>
                  <CardDescription>Your financial trajectory over 12 months</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={chartData12Months} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="netFlowGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={{ stroke: '#e5e7eb' }}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={{ stroke: '#e5e7eb' }}
                        tickFormatter={(value) => {
                          if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                          if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                          return value.toString();
                        }}
                      />
                      <Tooltip 
                        formatter={(value: number) => [formatCurrency(value, currency), "Net Flow"]}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}
                        labelStyle={{ fontWeight: 600 }}
                      />
                      <Area 
                        type="monotone"
                        dataKey="netFlow"
                        stroke="#6366f1"
                        strokeWidth={2}
                        fill="url(#netFlowGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-border/50 shadow-sm" data-testid="card-spending-breakdown">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-rose-500" />
                    Spending Breakdown
                  </CardTitle>
                  <CardDescription>Expenses by category this month</CardDescription>
                </CardHeader>
                <CardContent>
                  {categoryChartData.length === 0 ? (
                    <div className="text-center py-12 flex flex-col items-center text-muted-foreground">
                      <Wallet className="w-10 h-10 mb-3 opacity-50" />
                      <p className="font-medium">No expenses recorded</p>
                      <p className="text-sm mt-1">Start tracking to see your spending patterns</p>
                    </div>
                  ) : (
                    <div className="relative">
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie
                            data={categoryChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={110}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {categoryChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number, name: string) => [formatCurrency(value, currency), name]}
                            contentStyle={{
                              backgroundColor: 'hsl(var(--background))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }}
                          />
                          <Legend 
                            layout="horizontal"
                            verticalAlign="bottom"
                            align="center"
                            wrapperStyle={{ paddingTop: 20 }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginBottom: 40 }}>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Total</p>
                          <p className="text-xl font-bold text-rose-600">{formatCurrency(monthlyExpenses, currency)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Add Transaction Dialog */}
        <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {transactionType === "income" ? (
                  <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                ) : (
                  <ArrowUpRight className="w-5 h-5 text-rose-600" />
                )}
                Add {transactionType === "income" ? "Income" : "Expense"}
              </DialogTitle>
              <DialogDescription>
                Record a new {transactionType}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tx-name" className="text-right">Name</Label>
                <Input 
                  id="tx-name" 
                  value={txForm.name}
                  onChange={(e) => setTxForm({...txForm, name: e.target.value})}
                  className="col-span-3"
                  placeholder={transactionType === "income" ? "e.g. Salary" : "e.g. Groceries"}
                  data-testid="input-tx-name"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tx-amount" className="text-right">Amount</Label>
                <Input 
                  id="tx-amount" 
                  type="number"
                  value={txForm.amount || ""}
                  onChange={(e) => setTxForm({...txForm, amount: parseFloat(e.target.value) || 0})}
                  className="col-span-3"
                  data-testid="input-tx-amount"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tx-category" className="text-right">Category</Label>
                <Select 
                  value={txForm.category}
                  onValueChange={(val) => setTxForm({...txForm, category: val as TransactionCategory})}
                >
                  <SelectTrigger className="col-span-3" data-testid="select-tx-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {transactionType === "income" ? (
                      <>
                        <SelectItem value="salary">Salary</SelectItem>
                        <SelectItem value="freelance">Freelance</SelectItem>
                        <SelectItem value="benefits">Benefits</SelectItem>
                        <SelectItem value="investment">Investment</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="food">Food & Dining</SelectItem>
                        <SelectItem value="transport">Transport</SelectItem>
                        <SelectItem value="utilities">Utilities</SelectItem>
                        <SelectItem value="entertainment">Entertainment</SelectItem>
                        <SelectItem value="healthcare">Healthcare</SelectItem>
                        <SelectItem value="shopping">Shopping</SelectItem>
                        <SelectItem value="debt_payment">Debt Payment</SelectItem>
                        <SelectItem value="savings">Savings</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="tx-notes" className="text-right">Notes</Label>
                <Input 
                  id="tx-notes" 
                  value={txForm.notes}
                  onChange={(e) => setTxForm({...txForm, notes: e.target.value})}
                  className="col-span-3"
                  placeholder="Optional"
                  data-testid="input-tx-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTransactionDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleAddTransaction}
                disabled={createTransaction.isPending}
                className={transactionType === "income" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}
                data-testid="btn-save-tx"
              >
                {createTransaction.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add {transactionType === "income" ? "Income" : "Expense"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Income Stream Dialog */}
        <Dialog open={isIncomeDialogOpen} onOpenChange={setIsIncomeDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-emerald-600" />
                Add Income Stream
              </DialogTitle>
              <DialogDescription>
                Track recurring income sources
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="income-name" className="text-right">Name</Label>
                <Input 
                  id="income-name" 
                  value={incomeForm.name}
                  onChange={(e) => setIncomeForm({...incomeForm, name: e.target.value})}
                  className="col-span-3"
                  placeholder="e.g. Salary, Freelance"
                  data-testid="input-income-name"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="income-amount" className="text-right">Amount</Label>
                <Input 
                  id="income-amount" 
                  type="number"
                  value={incomeForm.amount || ""}
                  onChange={(e) => setIncomeForm({...incomeForm, amount: parseFloat(e.target.value) || 0})}
                  className="col-span-3"
                  data-testid="input-income-amount"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Frequency</Label>
                <Select 
                  value={incomeForm.frequency}
                  onValueChange={(val) => setIncomeForm({...incomeForm, frequency: val as any})}
                >
                  <SelectTrigger className="col-span-3" data-testid="select-income-frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="once">One-time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsIncomeDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleAddIncomeStream}
                disabled={createIncomeStream.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
                data-testid="btn-save-income-stream"
              >
                {createIncomeStream.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Stream
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Settings Dialog */}
        <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Finance Settings</DialogTitle>
              <DialogDescription>
                Configure your currency and savings goal
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Currency</Label>
                <Select 
                  value={settingsForm.currency}
                  onValueChange={(val) => setSettingsForm({...settingsForm, currency: val})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AED">AED (UAE Dirham)</SelectItem>
                    <SelectItem value="USD">USD (US Dollar)</SelectItem>
                    <SelectItem value="EUR">EUR (Euro)</SelectItem>
                    <SelectItem value="GBP">GBP (British Pound)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="savings-goal" className="text-right">Savings Goal</Label>
                <Input 
                  id="savings-goal" 
                  type="number"
                  value={settingsForm.savingsGoal || ""}
                  onChange={(e) => setSettingsForm({...settingsForm, savingsGoal: parseFloat(e.target.value) || 0})}
                  className="col-span-3"
                  placeholder="Monthly target"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSettingsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveSettings} disabled={updateFinanceSettings.isPending}>
                {updateFinanceSettings.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import Dialog */}
        <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
          setIsImportDialogOpen(open);
          if (!open) {
            setImportText("");
            setImportPreview(null);
          }
        }}>
          <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                Smart Import
              </DialogTitle>
              <DialogDescription>
                Paste bank statement or receipt text and let AI extract transactions
              </DialogDescription>
            </DialogHeader>
            
            {!importPreview ? (
              <>
                <div className="flex-1 py-4">
                  <Textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder="Paste your bank statement, receipt, or transaction history here..."
                    className="min-h-[200px] font-mono text-sm"
                    data-testid="textarea-import"
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>Cancel</Button>
                  <Button 
                    onClick={handleParseDocument}
                    disabled={isImporting || !importText.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700"
                    data-testid="btn-parse-import"
                  >
                    {isImporting ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
                    ) : (
                      <><Sparkles className="w-4 h-4 mr-2" /> Parse Document</>
                    )}
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <div className="text-sm text-muted-foreground">
                  Found {importPreview.length} transactions. Review and confirm:
                </div>
                <div className="flex-1 overflow-y-auto space-y-1 border rounded-lg p-2 my-2">
                  {importPreview.map((tx, i) => {
                    const txDate = tx.date ? new Date(tx.date) : null;
                    const dateStr = txDate && !isNaN(txDate.getTime()) 
                      ? txDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                      : null;
                    return (
                      <div key={i} className="grid grid-cols-[auto,1fr,auto] gap-2 p-2 rounded bg-muted/50 text-sm items-start">
                        <div className="pt-0.5">
                          {tx.type === "income" ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium">{tx.name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {tx.category}
                            </Badge>
                            {tx.merchant && (
                              <span className="text-[10px] text-muted-foreground">{tx.merchant}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={cn("font-mono font-medium", tx.type === "income" ? "text-emerald-600" : "text-rose-600")}>
                            {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount, currency)}
                          </div>
                          {dateStr && (
                            <div className="text-[10px] text-muted-foreground mt-0.5">{dateStr}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setImportPreview(null)}>Back</Button>
                  <Button 
                    onClick={handleConfirmImport}
                    disabled={createManyTransactions.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700"
                    data-testid="btn-confirm-import"
                  >
                    {createManyTransactions.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing...</>
                    ) : (
                      <><CheckCircle2 className="w-4 h-4 mr-2" /> Import All</>
                    )}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Add Loan Dialog */}
        <Dialog open={isLoanDialogOpen} onOpenChange={setIsLoanDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-indigo-600" />
                Add Loan
              </DialogTitle>
              <DialogDescription>
                Track a loan or debt to monitor your repayment progress
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="loan-name" className="text-right">Name *</Label>
                <Input 
                  id="loan-name" 
                  value={loanForm.name}
                  onChange={(e) => setLoanForm({...loanForm, name: e.target.value})}
                  className="col-span-3"
                  placeholder="e.g. Car Loan, Credit Card"
                  data-testid="input-loan-name"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="loan-lender" className="text-right">Lender</Label>
                <Input 
                  id="loan-lender" 
                  value={loanForm.lender}
                  onChange={(e) => setLoanForm({...loanForm, lender: e.target.value})}
                  className="col-span-3"
                  placeholder="e.g. Bank ABC"
                  data-testid="input-loan-lender"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="loan-amount" className="text-right">Original Amount *</Label>
                <Input 
                  id="loan-amount" 
                  type="number"
                  value={loanForm.originalAmount || ""}
                  onChange={(e) => setLoanForm({...loanForm, originalAmount: parseFloat(e.target.value) || 0})}
                  className="col-span-3"
                  data-testid="input-loan-amount"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="loan-min-payment" className="text-right">Min Payment *</Label>
                <Input 
                  id="loan-min-payment" 
                  type="number"
                  value={loanForm.minimumPayment || ""}
                  onChange={(e) => setLoanForm({...loanForm, minimumPayment: parseFloat(e.target.value) || 0})}
                  className="col-span-3"
                  data-testid="input-loan-min-payment"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="loan-rate" className="text-right">Interest Rate</Label>
                <Input 
                  id="loan-rate" 
                  type="number"
                  step="0.1"
                  value={loanForm.interestRate}
                  onChange={(e) => setLoanForm({...loanForm, interestRate: e.target.value})}
                  className="col-span-3"
                  placeholder="e.g. 5.5%"
                  data-testid="input-loan-rate"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="loan-due-day" className="text-right">Due Day</Label>
                <Input 
                  id="loan-due-day" 
                  type="number"
                  min="1"
                  max="31"
                  value={loanForm.dueDay}
                  onChange={(e) => setLoanForm({...loanForm, dueDay: e.target.value})}
                  className="col-span-3"
                  placeholder="1-31"
                  data-testid="input-loan-due-day"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="loan-notes" className="text-right">Notes</Label>
                <Input 
                  id="loan-notes" 
                  value={loanForm.notes}
                  onChange={(e) => setLoanForm({...loanForm, notes: e.target.value})}
                  className="col-span-3"
                  placeholder="Optional notes"
                  data-testid="input-loan-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsLoanDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleAddLoan}
                disabled={createLoan.isPending}
                className="bg-indigo-600 hover:bg-indigo-700"
                data-testid="btn-save-loan"
              >
                {createLoan.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Loan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Make Payment Dialog */}
        <Dialog open={isPaymentDialogOpen} onOpenChange={(open) => {
          setIsPaymentDialogOpen(open);
          if (!open) {
            setSelectedLoan(null);
            setPaymentForm({ amount: 0, notes: "" });
          }
        }}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Make Payment
              </DialogTitle>
              <DialogDescription>
                {selectedLoan && `Record a payment for ${selectedLoan.name}`}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="payment-amount" className="text-right">Amount *</Label>
                <Input 
                  id="payment-amount" 
                  type="number"
                  value={paymentForm.amount || ""}
                  onChange={(e) => setPaymentForm({...paymentForm, amount: parseFloat(e.target.value) || 0})}
                  className="col-span-3"
                  data-testid="input-payment-amount"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="payment-notes" className="text-right">Notes</Label>
                <Input 
                  id="payment-notes" 
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                  className="col-span-3"
                  placeholder="Optional notes"
                  data-testid="input-payment-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleMakePayment}
                disabled={createLoanPayment.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
                data-testid="btn-submit-payment"
              >
                {createLoanPayment.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Submit Payment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </Layout>
  );
}
