import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Brain,
  Loader2,
  CheckCircle2,
  ArrowRight,
  SkipForward,
  RefreshCw,
  AlertCircle,
  Link2,
  Sparkles,
  Activity,
  Heart,
  DollarSign,
  Briefcase,
  UtensilsCrossed,
  BookOpen,
  ListTodo,
  Stethoscope,
  Clock,
  Users,
  Target,
  Monitor,
  X,
  Check,
} from "lucide-react";
import { VoiceInputButton } from "@/components/voice-input-button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface UnloadItem {
  id: string;
  action: "create" | "update" | "skip";
  module: string;
  label: string;
  reason: string;
  actionName: string;
  actionArgs: Record<string, any>;
  linkedTo?: string[];
  linkReason?: string;
  enabled?: boolean;
}

interface UnloadResult {
  items: UnloadItem[];
  journalEntry: {
    content: string;
    entryType: string;
    mood?: number;
    energy?: number;
    tags: string[];
  } | null;
  summary: string;
  patterns: string[];
}

interface UnloadSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExecuteAction: (actionName: string, actionArgs: Record<string, any>) => Promise<{ success: boolean; message: string }>;
}

const MODULE_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  tracker: { icon: Activity, color: "text-blue-500", label: "Wellness" },
  habits: { icon: CheckCircle2, color: "text-emerald-500", label: "Habits" },
  tasks: { icon: ListTodo, color: "text-amber-500", label: "Tasks" },
  career_projects: { icon: Briefcase, color: "text-indigo-500", label: "Career" },
  career_tasks: { icon: Target, color: "text-indigo-400", label: "Career Task" },
  career_vision: { icon: Sparkles, color: "text-purple-500", label: "Vision" },
  finance: { icon: DollarSign, color: "text-green-500", label: "Finance" },
  meals: { icon: UtensilsCrossed, color: "text-orange-500", label: "Meals" },
  medical: { icon: Stethoscope, color: "text-red-500", label: "Medical" },
  journal: { icon: BookOpen, color: "text-violet-500", label: "Journal" },
  routine: { icon: Clock, color: "text-teal-500", label: "Routine" },
  work: { icon: Monitor, color: "text-sky-500", label: "Work" },
  system: { icon: Users, color: "text-pink-500", label: "System" },
};

const ACTION_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  create: { label: "New", variant: "default" },
  update: { label: "Update", variant: "secondary" },
  skip: { label: "Exists", variant: "outline" },
};

export default function UnloadSheet({ open, onOpenChange, onExecuteAction }: UnloadSheetProps) {
  const [phase, setPhase] = useState<"input" | "loading" | "review" | "executing" | "done">("input");
  const [rawText, setRawText] = useState("");
  const [result, setResult] = useState<UnloadResult | null>(null);
  const [itemStates, setItemStates] = useState<Record<string, boolean>>({});
  const [executionResults, setExecutionResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [executionProgress, setExecutionProgress] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && phase === "input") {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open, phase]);

  const handleReset = () => {
    setPhase("input");
    setRawText("");
    setResult(null);
    setItemStates({});
    setExecutionResults({});
    setExecutionProgress(0);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(handleReset, 300);
  };

  const handleParse = async () => {
    if (!rawText.trim() || rawText.trim().length < 5) return;
    setPhase("loading");

    try {
      const res = await fetch("/api/orbit/unload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText }),
      });

      if (!res.ok) throw new Error("Failed to parse");
      const data: UnloadResult = await res.json();
      setResult(data);

      // Initialize all non-skip items as enabled
      const states: Record<string, boolean> = {};
      data.items.forEach((item) => {
        states[item.id] = item.action !== "skip";
      });
      setItemStates(states);
      setPhase("review");
    } catch (e) {
      toast.error("Failed to process your unload. Please try again.");
      setPhase("input");
    }
  };

  const handleExecute = async () => {
    if (!result) return;
    setPhase("executing");

    const enabledItems = result.items.filter(
      (item) => itemStates[item.id] && item.action !== "skip"
    );
    const total = enabledItems.length + (result.journalEntry ? 1 : 0);
    let completed = 0;

    // Execute journal entry first
    if (result.journalEntry) {
      try {
        const jr = await onExecuteAction("create_journal", {
          content: result.journalEntry.content,
          entry_type: result.journalEntry.entryType,
          mood: result.journalEntry.mood,
          energy: result.journalEntry.energy,
          tags: result.journalEntry.tags,
          is_private: false,
        });
        setExecutionResults((prev) => ({ ...prev, journal_auto: jr }));
      } catch {
        setExecutionResults((prev) => ({
          ...prev,
          journal_auto: { success: false, message: "Failed to save journal entry" },
        }));
      }
      completed++;
      setExecutionProgress(Math.round((completed / total) * 100));
    }

    // Execute each enabled item
    for (const item of enabledItems) {
      try {
        const itemResult = await onExecuteAction(item.actionName, item.actionArgs);
        setExecutionResults((prev) => ({ ...prev, [item.id]: itemResult }));
      } catch (err: any) {
        setExecutionResults((prev) => ({
          ...prev,
          [item.id]: { success: false, message: err.message || "Action failed" },
        }));
      }
      completed++;
      setExecutionProgress(Math.round((completed / total) * 100));
    }

    setPhase("done");
  };

  const enabledCount = result
    ? result.items.filter((item) => itemStates[item.id] && item.action !== "skip").length +
      (result.journalEntry ? 1 : 0)
    : 0;

  const getLinkedItems = (item: UnloadItem): UnloadItem[] => {
    if (!item.linkedTo?.length || !result) return [];
    return result.items.filter((other) => item.linkedTo!.includes(other.id));
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-lg">Unload</SheetTitle>
              <SheetDescription className="text-xs">
                {phase === "input" && "Tell Orbit everything. It'll sort it out."}
                {phase === "loading" && "Processing your thoughts..."}
                {phase === "review" && "Review what Orbit found"}
                {phase === "executing" && "Logging everything..."}
                {phase === "done" && "All done!"}
              </SheetDescription>
            </div>
            {phase === "review" && (
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Redo
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-hidden px-6">
          <AnimatePresence mode="wait">
            {/* INPUT PHASE */}
            {phase === "input" && (
              <motion.div
                key="input"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="h-full flex flex-col"
              >
                <Textarea
                  ref={textareaRef}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="What's going on? Tell me everything — mood, what happened today, what you ate, what you need to do, how you're feeling, work stuff, health, money... just let it all out."
                  className="flex-1 resize-none border-0 bg-muted/30 rounded-xl p-4 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[200px]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      handleParse();
                    }
                  }}
                />
                <div className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-2">
                    <VoiceInputButton
                      onTranscript={(text) => {
                        setRawText(prev => prev ? prev + " " + text : text);
                      }}
                      variant="outline"
                      size="default"
                      className="gap-2 px-3"
                      conversationMode={true}
                      onConversationResponse={(userText, _assistantText) => {
                        setRawText(prev => prev ? prev + "\n\n" + userText : userText);
                      }}
                      aiMode="orbit"
                    />
                    <span className="text-xs text-muted-foreground">
                      {rawText.length > 0
                        ? `${rawText.length} characters`
                        : "Tap mic or type"}
                    </span>
                  </div>
                  <Button
                    onClick={handleParse}
                    disabled={rawText.trim().length < 5}
                    className="gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Process
                  </Button>
                </div>
              </motion.div>
            )}

            {/* LOADING PHASE */}
            {phase === "loading" && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-full flex flex-col items-center justify-center gap-4"
              >
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Brain className="w-8 h-8 text-primary animate-pulse" />
                  </div>
                  <Loader2 className="w-6 h-6 text-primary animate-spin absolute -bottom-1 -right-1" />
                </div>
                <div className="text-center">
                  <p className="font-medium">Orbit is reading your mind...</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Checking existing data, finding patterns, sorting everything out
                  </p>
                </div>
              </motion.div>
            )}

            {/* REVIEW PHASE */}
            {phase === "review" && result && (
              <motion.div
                key="review"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="h-full flex flex-col"
              >
                {/* Orbit's summary */}
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-3">
                  <p className="text-sm">{result.summary}</p>
                  {result.patterns.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {result.patterns.map((p, i) => (
                        <Badge key={i} variant="secondary" className="text-xs font-normal">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {p}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Items list */}
                <ScrollArea className="flex-1">
                  <div className="space-y-2 pb-4">
                    {/* Journal entry (always first) */}
                    {result.journalEntry && (
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                        <div className={cn("mt-0.5", MODULE_CONFIG.journal.color)}>
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">Journal Entry</span>
                            <Badge variant="default" className="text-[10px] px-1.5 py-0">
                              Auto
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {result.journalEntry.content.substring(0, 120)}...
                          </p>
                          {result.journalEntry.mood && (
                            <span className="text-xs text-muted-foreground">
                              Mood: {result.journalEntry.mood}/10
                              {result.journalEntry.energy
                                ? ` · Energy: ${result.journalEntry.energy}/10`
                                : ""}
                            </span>
                          )}
                        </div>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-1" />
                      </div>
                    )}

                    {/* Parsed items */}
                    {result.items.map((item) => {
                      const config = MODULE_CONFIG[item.module] || MODULE_CONFIG.tasks;
                      const Icon = config.icon;
                      const badge = ACTION_BADGES[item.action];
                      const linkedItems = getLinkedItems(item);
                      const isEnabled = itemStates[item.id] ?? false;
                      const isSkip = item.action === "skip";

                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-xl border transition-all",
                            isSkip
                              ? "bg-muted/10 border-border/30 opacity-60"
                              : isEnabled
                                ? "bg-muted/30 border-border/50"
                                : "bg-muted/10 border-border/30 opacity-50"
                          )}
                        >
                          <div className={cn("mt-0.5", config.color)}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-medium">{item.label}</span>
                              <Badge
                                variant={badge.variant}
                                className="text-[10px] px-1.5 py-0"
                              >
                                {badge.label}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{item.reason}</p>
                            {linkedItems.length > 0 && item.linkReason && (
                              <div className="flex items-center gap-1 mt-1.5 text-xs text-primary/70">
                                <Link2 className="w-3 h-3" />
                                <span>{item.linkReason}</span>
                              </div>
                            )}
                          </div>
                          {!isSkip && (
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={(checked) =>
                                setItemStates((prev) => ({
                                  ...prev,
                                  [item.id]: checked,
                                }))
                              }
                              className="mt-1"
                            />
                          )}
                          {isSkip && (
                            <SkipForward className="w-4 h-4 text-muted-foreground mt-1" />
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </ScrollArea>

                {/* Action bar */}
                <div className="flex items-center justify-between py-4 border-t">
                  <span className="text-xs text-muted-foreground">
                    {enabledCount} action{enabledCount !== 1 ? "s" : ""} to log
                  </span>
                  <Button onClick={handleExecute} disabled={enabledCount === 0} className="gap-2">
                    <Check className="w-4 h-4" />
                    Log All
                  </Button>
                </div>
              </motion.div>
            )}

            {/* EXECUTING PHASE */}
            {phase === "executing" && (
              <motion.div
                key="executing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center gap-4"
              >
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
                <div className="text-center">
                  <p className="font-medium">Logging everything...</p>
                  <p className="text-sm text-muted-foreground mt-1">{executionProgress}% complete</p>
                </div>
                <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${executionProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </motion.div>
            )}

            {/* DONE PHASE */}
            {phase === "done" && result && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col"
              >
                <div className="flex flex-col items-center justify-center py-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  >
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    </div>
                  </motion.div>
                  <h3 className="text-lg font-semibold mb-1">Unloaded</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-xs">
                    {result.summary}
                  </p>
                </div>

                <ScrollArea className="flex-1">
                  <div className="space-y-1.5 pb-4">
                    {/* Journal result */}
                    {result.journalEntry && executionResults.journal_auto && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30">
                        {executionResults.journal_auto.success ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-destructive shrink-0" />
                        )}
                        <span className="text-xs">
                          {executionResults.journal_auto.success
                            ? "Journal entry saved"
                            : executionResults.journal_auto.message}
                        </span>
                      </div>
                    )}
                    {/* Item results */}
                    {result.items
                      .filter((item) => itemStates[item.id] && item.action !== "skip")
                      .map((item) => {
                        const r = executionResults[item.id];
                        return (
                          <div
                            key={item.id}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30"
                          >
                            {r?.success ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            ) : (
                              <X className="w-3.5 h-3.5 text-destructive shrink-0" />
                            )}
                            <span className="text-xs">
                              {r?.success ? item.label : r?.message || "Failed"}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </ScrollArea>

                <div className="py-4 border-t">
                  <Button onClick={handleClose} className="w-full">
                    Done
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  );
}
