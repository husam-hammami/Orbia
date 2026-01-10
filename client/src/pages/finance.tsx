import { useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  useTransactions, 
  useCreateTransaction, 
  useDeleteTransaction,
  useIncomeStreams,
  useCreateIncomeStream,
  useDeleteIncomeStream,
  useFinanceSettings, 
  useUpdateFinanceSettings,
  useImportTransactions,
  useCreateManyTransactions
} from "@/lib/api-hooks";
import type { Transaction, IncomeStream } from "@shared/schema";

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

const formatCurrency = (amount: number, currency = "AED") => 
  `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export default function FinancePage() {
  const [currentMonthIndex, setCurrentMonthIndex] = useState(new Date().getMonth());
  const currentYear = new Date().getFullYear();
  const currentMonth = `${MONTHS[currentMonthIndex]} ${currentYear}`;
  
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [isIncomeDialogOpen, setIsIncomeDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  
  const [transactionType, setTransactionType] = useState<"income" | "expense">("expense");
  const [importText, setImportText] = useState("");
  const [importPreview, setImportPreview] = useState<any[] | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const { data: transactions = [], isLoading: transactionsLoading } = useTransactions(currentMonth);
  const { data: incomeStreams = [], isLoading: incomeLoading } = useIncomeStreams();
  const { data: financeSettings } = useFinanceSettings();
  
  const createTransaction = useCreateTransaction();
  const deleteTransaction = useDeleteTransaction();
  const createIncomeStream = useCreateIncomeStream();
  const deleteIncomeStream = useDeleteIncomeStream();
  const updateFinanceSettings = useUpdateFinanceSettings();
  const importTransactions = useImportTransactions();
  const createManyTransactions = useCreateManyTransactions();

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

  const handleMonthChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentMonthIndex(prev => prev === 0 ? 11 : prev - 1);
    } else {
      setCurrentMonthIndex(prev => prev === 11 ? 0 : prev + 1);
    }
  };

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
      month: currentMonth,
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
      month: currentMonth,
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
      await createManyTransactions.mutateAsync(importPreview.map(t => ({
        type: t.type,
        name: t.name,
        amount: t.amount,
        category: t.category,
        date: new Date(t.date),
        month: currentMonth,
        isRecurring: 0,
        notes: t.notes,
        importSource: "ai_import"
      })));
      toast.success(`Imported ${importPreview.length} transactions`);
      setIsImportDialogOpen(false);
      setImportText("");
      setImportPreview(null);
    } catch (e) {
      toast.error("Failed to import transactions");
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
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-muted/50 rounded-lg p-1 border border-border/50">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8" 
                onClick={() => handleMonthChange('prev')}
                data-testid="btn-prev-month"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="px-3 font-medium min-w-[140px] text-center flex items-center justify-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                {currentMonth}
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => handleMonthChange('next')}
                data-testid="btn-next-month"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            
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
                  <CardDescription>All income and expenses for {currentMonth}</CardDescription>
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
                      className="group flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
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
                          variant="outline" 
                          size="sm" 
                          className="h-6 text-xs px-2 opacity-0 group-hover:opacity-100"
                          onClick={() => handleLogIncomePayment(stream)}
                          data-testid={`log-payment-${stream.id}`}
                        >
                          <Check className="w-3 h-3 mr-1" /> Log
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
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
          </div>
        </div>

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
                Record a new {transactionType} for {currentMonth}
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
          <DialogContent className="sm:max-w-[600px]">
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
              <div className="space-y-4 py-4">
                <Textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Paste your bank statement, receipt, or transaction history here..."
                  className="min-h-[200px] font-mono text-sm"
                  data-testid="textarea-import"
                />
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
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div className="text-sm text-muted-foreground mb-2">
                  Found {importPreview.length} transactions. Review and confirm:
                </div>
                <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-lg p-2">
                  {importPreview.map((tx, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                      <div className="flex items-center gap-2">
                        {tx.type === "income" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-500" />
                        )}
                        <span>{tx.name}</span>
                        <Badge variant="outline" className="text-xs">{tx.category}</Badge>
                      </div>
                      <span className={cn("font-mono", tx.type === "income" ? "text-emerald-600" : "text-rose-600")}>
                        {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount, currency)}
                      </span>
                    </div>
                  ))}
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
              </div>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </Layout>
  );
}
