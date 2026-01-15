import { useState, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { startOfWeek, isAfter, formatDistanceToNow, format } from "date-fns";
import { 
  BookOpen, 
  Plus, 
  Sun,
  Moon,
  Sunset,
  Cloud,
  Trash2,
  Edit,
  Save,
  ChevronRight,
  Lightbulb,
  Zap,
  Bold,
  Italic,
  List,
  Heading2,
  Eye,
  PenLine,
  Sparkles,
  Smile,
  Battery
} from "lucide-react";
import { toast } from "sonner";
import { useJournalEntries, useCreateJournalEntry, useUpdateJournalEntry, useDeleteJournalEntry } from "@/lib/api-hooks";
import { cn } from "@/lib/utils";

const timeOfDayOptions = [
  { value: "morning", label: "Morning", icon: Sun, color: "text-amber-500" },
  { value: "afternoon", label: "Afternoon", icon: Cloud, color: "text-blue-400" },
  { value: "evening", label: "Evening", icon: Sunset, color: "text-orange-500" },
  { value: "night", label: "Night", icon: Moon, color: "text-indigo-400" },
];

const writingPrompts = [
  "What's weighing on my mind right now?",
  "Three things I'm grateful for today...",
  "A moment of peace I experienced...",
  "Something I want to tell myself...",
  "What would help me feel safer right now?",
  "A small win I'm proud of...",
];

const moodLabels = ["Very Low", "Low", "Below Average", "Neutral", "Above Average", "Good", "Very Good", "Great", "Excellent", "Amazing"];
const energyLabels = ["Depleted", "Very Low", "Low", "Below Average", "Moderate", "Adequate", "Good", "High", "Very High", "Energized"];

const challengingDrivers = [
  { value: "sleep", label: "Sleep", emoji: "😴", color: "#6366f1" },
  { value: "work", label: "Work", emoji: "💼", color: "#f59e0b" },
  { value: "relationships", label: "Relationships", emoji: "💔", color: "#ec4899" },
  { value: "body", label: "Body", emoji: "🩹", color: "#ef4444" },
  { value: "anxiety", label: "Anxiety", emoji: "😰", color: "#8b5cf6" },
  { value: "urges", label: "Urges/Escape", emoji: "🌀", color: "#f97316" },
  { value: "shame", label: "Shame", emoji: "😔", color: "#78716c" },
  { value: "trauma", label: "Trauma", emoji: "⚡", color: "#dc2626" },
];

const positiveDrivers = [
  { value: "joy", label: "Joy", emoji: "✨", color: "#eab308" },
  { value: "connection", label: "Connection", emoji: "💝", color: "#ec4899" },
  { value: "growth", label: "Growth", emoji: "🌱", color: "#22c55e" },
  { value: "peace", label: "Peace", emoji: "🕊️", color: "#06b6d4" },
  { value: "none", label: "None/Neutral", emoji: "➖", color: "#94a3b8" },
];

const allDrivers = [...challengingDrivers, ...positiveDrivers];

function getTimeOfDayAuto(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

export function JournalTab() {
  const { data: entries, isLoading } = useJournalEntries();
  const createMutation = useCreateJournalEntry();
  const updateMutation = useUpdateJournalEntry();
  const deleteMutation = useDeleteJournalEntry();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [isWriting, setIsWriting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [timeOfDay, setTimeOfDay] = useState(getTimeOfDayAuto());
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [entryDate, setEntryDate] = useState<Date>(new Date());
  const [primaryDriver, setPrimaryDriver] = useState<string | null>(null);
  const [secondaryDriver, setSecondaryDriver] = useState<string | null>(null);

  const insertFormatting = useCallback((prefix: string, suffix: string = prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = content.substring(0, start) + prefix + selectedText + suffix + content.substring(end);
    setContent(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  }, [content]);

  const stats = useMemo(() => {
    if (!entries) return { total: 0, thisWeek: 0 };
    const weekStart = startOfWeek(new Date());
    const thisWeek = entries.filter(e => isAfter(new Date(e.createdAt), weekStart)).length;
    return { total: entries.length, thisWeek };
  }, [entries]);

  const resetForm = () => {
    setContent("");
    setMood(null);
    setEnergy(null);
    setTimeOfDay(getTimeOfDayAuto());
    setEditingId(null);
    setIsWriting(false);
    setShowPreview(false);
    setEntryDate(new Date());
    setPrimaryDriver(null);
    setSecondaryDriver(null);
  };

  const handleSubmit = () => {
    if (!content.trim()) {
      toast.error("Please write something first");
      return;
    }

    const data = {
      content: content.trim(),
      entryType: "freewrite",
      mood,
      energy,
      authorId: null,
      timeOfDay,
      tags: [],
      isPrivate: 0,
      entryDate,
      primaryDriver,
      secondaryDriver,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data }, {
        onSuccess: () => {
          toast.success("Entry updated");
          resetForm();
        },
        onError: () => toast.error("Failed to update entry"),
      });
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          toast.success("Entry saved");
          resetForm();
        },
        onError: () => toast.error("Failed to save entry"),
      });
    }
  };

  const handleEdit = (entry: any) => {
    setEditingId(entry.id);
    setContent(entry.content);
    setMood(entry.mood);
    setEnergy(entry.energy);
    setTimeOfDay(entry.timeOfDay || getTimeOfDayAuto());
    setEntryDate(entry.entryDate ? new Date(entry.entryDate) : new Date());
    setPrimaryDriver(entry.primaryDriver || null);
    setSecondaryDriver(entry.secondaryDriver || null);
    setIsWriting(true);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success("Entry deleted"),
      onError: () => toast.error("Failed to delete entry"),
    });
  };

  const insertPrompt = (prompt: string) => {
    setContent(prev => prev ? `${prev}\n\n${prompt}` : prompt);
    textareaRef.current?.focus();
  };

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {!isWriting ? (
          <motion.div
            key="list-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/15 text-primary shadow-sm">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Journal</h2>
                  <p className="text-xs text-muted-foreground">{stats.total} entries · {stats.thisWeek} this week</p>
                </div>
              </div>
              
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  onClick={() => setIsWriting(true)} 
                  size="lg"
                  className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 text-base px-3 md:px-6 min-w-[44px]"
                  data-testid="button-new-entry"
                >
                  <Plus className="w-5 h-5" />
                  <span className="hidden md:inline">Write</span>
                </Button>
              </motion.div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="w-6 h-6 text-primary" />
                </motion.div>
              </div>
            ) : entries?.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-16"
              >
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="inline-flex p-5 rounded-2xl bg-primary/15 mb-4"
                >
                  <BookOpen className="w-10 h-10 text-primary" />
                </motion.div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Your journal awaits</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                  A safe space to express yourself, process experiences, and track your inner world.
                </p>
                <Button 
                  onClick={() => setIsWriting(true)}
                  className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
                  data-testid="button-first-entry"
                >
                  <Plus className="w-4 h-4" />
                  Start writing
                </Button>
              </motion.div>
            ) : (
              <div className="space-y-2">
                {entries?.map((entry, index) => {
                  const isExpanded = expandedEntry === entry.id;
                  const preview = entry.content.slice(0, 120);
                  const driverInfo = entry.primaryDriver ? allDrivers.find(d => d.value === entry.primaryDriver) : null;
                  
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className={cn(
                        "bg-card/80 backdrop-blur-sm rounded-xl border border-border overflow-hidden transition-all",
                        isExpanded ? "shadow-lg" : "hover:border-primary/30 hover:shadow-sm"
                      )}
                      data-testid={`entry-${entry.id}`}
                    >
                      <button
                        onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                        className="w-full text-left p-4 flex items-start gap-3"
                        data-testid={`button-expand-${entry.id}`}
                      >
                        <span 
                          className="text-lg shrink-0"
                          role="img" 
                          aria-label={driverInfo?.label || "Journal"}
                        >
                          {driverInfo?.emoji || "📝"}
                        </span>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-muted-foreground">
                              {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          
                          <div className={cn(
                            "text-sm text-foreground prose prose-sm max-w-none dark:prose-invert",
                            !isExpanded && "line-clamp-2"
                          )}>
                            {isExpanded ? (
                              <ReactMarkdown>{entry.content}</ReactMarkdown>
                            ) : (
                              <span>{preview + (entry.content.length > 120 ? "..." : "")}</span>
                            )}
                          </div>
                          
                          {entry.primaryDriver && !isExpanded && (
                            <div className="flex gap-1 mt-2 flex-wrap">
                              <span className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded flex items-center gap-1">
                                <Zap className="w-2.5 h-2.5" />
                                {allDrivers.find(d => d.value === entry.primaryDriver)?.label}
                                {entry.secondaryDriver && ` → ${allDrivers.find(d => d.value === entry.secondaryDriver)?.label}`}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <ChevronRight className={cn(
                          "w-4 h-4 text-muted-foreground transition-transform shrink-0 mt-1",
                          isExpanded && "rotate-90"
                        )} />
                      </button>
                      
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-border"
                          >
                            <div className="p-4 pt-3 space-y-3">
                              {(entry.mood || entry.energy) && (
                                <div className="flex gap-4 text-xs">
                                  {entry.mood && (
                                    <div className="flex items-center gap-2">
                                      <Smile className="w-3.5 h-3.5 text-amber-500" />
                                      <span className="text-muted-foreground">{moodLabels[entry.mood - 1]}</span>
                                    </div>
                                  )}
                                  {entry.energy && (
                                    <div className="flex items-center gap-2">
                                      <Battery className="w-3.5 h-3.5 text-cyan-500" />
                                      <span className="text-muted-foreground">{energyLabels[entry.energy - 1]}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {entry.primaryDriver && (
                                <div className="flex gap-1.5 flex-wrap items-center">
                                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                                  <span className="text-xs text-muted-foreground">
                                    {allDrivers.find(d => d.value === entry.primaryDriver)?.emoji} {allDrivers.find(d => d.value === entry.primaryDriver)?.label}
                                    {entry.secondaryDriver && ` → ${allDrivers.find(d => d.value === entry.secondaryDriver)?.emoji} ${allDrivers.find(d => d.value === entry.secondaryDriver)?.label}`}
                                  </span>
                                </div>
                              )}
                              
                              <div className="flex gap-2 pt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(entry)}
                                  className="text-xs gap-1.5"
                                  data-testid={`button-edit-${entry.id}`}
                                >
                                  <Edit className="w-3 h-3" />
                                  Edit
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-xs gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
                                      data-testid={`button-delete-${entry.id}`}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      Delete
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDelete(entry.id)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="write-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <button
              onClick={resetForm}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-back"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              <span className="text-sm font-medium">Back</span>
            </button>

            {/* Drivers Section - always visible at top */}
            <div className="bg-card/80 backdrop-blur-sm rounded-xl border border-border p-3">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-medium text-muted-foreground">What's driving this entry?</span>
                {primaryDriver && (
                  <span className="text-xs text-indigo-500 ml-auto">
                    {allDrivers.find(d => d.value === primaryDriver)?.emoji} {allDrivers.find(d => d.value === primaryDriver)?.label}
                    {secondaryDriver && ` → ${allDrivers.find(d => d.value === secondaryDriver)?.emoji}`}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {challengingDrivers.map((driver) => (
                  <button
                    key={driver.value}
                    type="button"
                    onClick={() => setPrimaryDriver(primaryDriver === driver.value ? null : driver.value)}
                    className={cn(
                      "px-2 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1",
                      primaryDriver === driver.value
                        ? "text-white shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                    style={primaryDriver === driver.value ? { backgroundColor: driver.color } : {}}
                    data-testid={`driver-primary-${driver.value}`}
                  >
                    <span>{driver.emoji}</span>
                    <span>{driver.label}</span>
                  </button>
                ))}
                <div className="w-px h-5 bg-border mx-1 self-center" />
                {positiveDrivers.map((driver) => (
                  <button
                    key={driver.value}
                    type="button"
                    onClick={() => setPrimaryDriver(primaryDriver === driver.value ? null : driver.value)}
                    className={cn(
                      "px-2 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1",
                      primaryDriver === driver.value
                        ? "text-white shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                    style={primaryDriver === driver.value ? { backgroundColor: driver.color } : {}}
                    data-testid={`driver-primary-${driver.value}`}
                  >
                    <span>{driver.emoji}</span>
                    <span>{driver.label}</span>
                  </button>
                ))}
              </div>
              {primaryDriver && !["none", "joy", "connection", "growth", "peace"].includes(primaryDriver) && (
                <div className="pt-2 border-t border-border">
                  <p className="text-[10px] text-muted-foreground/70 mb-2">Secondary driver? (e.g., Work → Urges)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[...challengingDrivers.filter(d => d.value !== primaryDriver), ...positiveDrivers.filter(d => d.value !== "none")].map((driver) => (
                      <button
                        key={driver.value}
                        type="button"
                        onClick={() => setSecondaryDriver(secondaryDriver === driver.value ? null : driver.value)}
                        className={cn(
                          "px-2 py-1 rounded-lg text-[10px] font-medium transition-all flex items-center gap-1",
                          secondaryDriver === driver.value
                            ? "text-white shadow-sm"
                            : "bg-muted/60 text-muted-foreground hover:bg-muted"
                        )}
                        style={secondaryDriver === driver.value ? { backgroundColor: driver.color } : {}}
                        data-testid={`driver-secondary-${driver.value}`}
                      >
                        <span>{driver.emoji}</span>
                        <span>{driver.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-card/90 backdrop-blur-sm rounded-2xl border border-border shadow-sm overflow-hidden">
              <TooltipProvider>
                <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-muted/30">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => insertFormatting("**")}
                        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        aria-label="Bold"
                        data-testid="button-format-bold"
                      >
                        <Bold className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Bold</TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => insertFormatting("*")}
                        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        aria-label="Italic"
                        data-testid="button-format-italic"
                      >
                        <Italic className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Italic</TooltipContent>
                  </Tooltip>
                  
                  <div className="w-px h-5 bg-border mx-1" />
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => insertFormatting("## ", "")}
                        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        aria-label="Heading"
                        data-testid="button-format-heading"
                      >
                        <Heading2 className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Heading</TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => insertFormatting("- ", "")}
                        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        aria-label="List"
                        data-testid="button-format-list"
                      >
                        <List className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>List</TooltipContent>
                  </Tooltip>
                  
                  <div className="flex-1" />
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setShowPreview(!showPreview)}
                        className={cn(
                          "p-2 rounded-lg transition-colors",
                          showPreview 
                            ? "bg-indigo-100 text-indigo-600" 
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                        aria-label={showPreview ? "Edit" : "Preview"}
                        data-testid="button-toggle-preview"
                      >
                        {showPreview ? <PenLine className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{showPreview ? "Edit" : "Preview"}</TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
              
              {showPreview ? (
                <div className="min-h-[280px] p-4 prose prose-sm prose-slate max-w-none">
                  {content ? (
                    <ReactMarkdown>{content}</ReactMarkdown>
                  ) : (
                    <p className="text-muted-foreground/70 italic">Nothing to preview yet...</p>
                  )}
                </div>
              ) : (
                <textarea
                  ref={textareaRef}
                  placeholder="What's on your mind?"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full min-h-[280px] p-4 text-base text-foreground bg-transparent placeholder:text-muted-foreground/60 resize-none focus:outline-none leading-relaxed"
                  data-testid="textarea-content"
                />
              )}
              
              <div className="border-t border-border px-3 py-2">
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {writingPrompts.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => insertPrompt(prompt)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors whitespace-nowrap"
                      data-testid={`button-prompt-${i}`}
                    >
                      <Lightbulb className="w-3 h-3" />
                      {prompt.length > 30 ? prompt.slice(0, 30) + "..." : prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-card/80 rounded-xl border border-border space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Mood</span>
                    <span className="text-xs text-primary">{mood ? moodLabels[mood - 1] : "—"}</span>
                  </div>
                  <Slider
                    value={mood !== null ? [mood] : [5]}
                    onValueChange={([v]) => setMood(v)}
                    min={1}
                    max={10}
                    step={1}
                    data-testid="slider-mood"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Energy</span>
                    <span className="text-xs text-primary">{energy ? energyLabels[energy - 1] : "—"}</span>
                  </div>
                  <Slider
                    value={energy !== null ? [energy] : [5]}
                    onValueChange={([v]) => setEnergy(v)}
                    min={1}
                    max={10}
                    step={1}
                    data-testid="slider-energy"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {timeOfDayOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = timeOfDay === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setTimeOfDay(opt.value)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all border",
                        isSelected 
                          ? "bg-primary/10 border-primary/30 text-primary" 
                          : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50"
                      )}
                      data-testid={`time-${opt.value}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Date:</span>
                <input
                  type="date"
                  value={format(entryDate, "yyyy-MM-dd")}
                  onChange={(e) => {
                    const date = new Date(e.target.value + "T12:00:00");
                    if (!isNaN(date.getTime())) {
                      setEntryDate(date);
                    }
                  }}
                  className="flex-1 px-3 py-1.5 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  data-testid="input-entry-date"
                />
                <button
                  type="button"
                  onClick={() => setEntryDate(new Date())}
                  className="px-2 py-1.5 text-xs text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  data-testid="button-today"
                >
                  Today
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={resetForm} 
                className="flex-1"
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending || !content.trim()}
                className="flex-1 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                data-testid="button-save-entry"
              >
                <Save className="w-4 h-4" />
                {editingId ? "Update" : "Save Entry"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
