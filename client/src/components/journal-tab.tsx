import { useState, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { startOfWeek, isAfter, formatDistanceToNow, format, startOfDay } from "date-fns";
import { 
  BookOpen, 
  Plus, 
  Sparkles, 
  Heart, 
  Flame, 
  Leaf, 
  Brain, 
  Users,
  Sun,
  Moon,
  Sunset,
  Cloud,
  Trash2,
  Edit,
  Save,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Zap,
  Shield,
  MessageCircle,
  Star,
  AlertTriangle,
  Smile,
  Battery,
  User,
  Bold,
  Italic,
  List,
  Heading2,
  Eye,
  PenLine,
  Calendar
} from "lucide-react";
import { toast } from "sonner";
import { useJournalEntries, useCreateJournalEntry, useUpdateJournalEntry, useDeleteJournalEntry, useMembers } from "@/lib/api-hooks";
import { cn } from "@/lib/utils";

const entryTypes = [
  { value: "freewrite", label: "Free Write", icon: BookOpen, color: "#6366f1", emoji: "✍️" },
  { value: "reflection", label: "Reflect", icon: Lightbulb, color: "#3b82f6", emoji: "💭" },
  { value: "vent", label: "Vent", icon: Flame, color: "#ef4444", emoji: "🔥" },
  { value: "gratitude", label: "Grateful", icon: Heart, color: "#ec4899", emoji: "💝" },
  { value: "grounding", label: "Ground", icon: Leaf, color: "#22c55e", emoji: "🌿" },
  { value: "system_note", label: "System", icon: Users, color: "#8b5cf6", emoji: "👥" },
  { value: "memory", label: "Memory", icon: Brain, color: "#a855f7", emoji: "🧠" },
  { value: "achievement", label: "Win", icon: Star, color: "#eab308", emoji: "⭐" },
  { value: "safety", label: "Safety Plan", icon: Shield, color: "#06b6d4", emoji: "🛡️" },
  { value: "letter", label: "Letter", icon: MessageCircle, color: "#f97316", emoji: "💌" },
  { value: "trigger", label: "Trigger Log", icon: AlertTriangle, color: "#dc2626", emoji: "⚡" },
];

const timeOfDayOptions = [
  { value: "morning", label: "Morning", icon: Sun, color: "text-amber-500" },
  { value: "afternoon", label: "Afternoon", icon: Cloud, color: "text-blue-400" },
  { value: "evening", label: "Evening", icon: Sunset, color: "text-orange-500" },
  { value: "night", label: "Night", icon: Moon, color: "text-indigo-400" },
];

const tagOptions = [
  "anxiety", "calm", "dissociation", "grounded", "triggered", "safe", 
  "state shift", "co-conscious", "pain", "tired", "hopeful", "overwhelmed",
  "productive", "creative", "lonely", "connected", "numb", "present"
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

function getTimeOfDayAuto(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

export function JournalTab() {
  const { data: entries, isLoading } = useJournalEntries();
  const { data: members } = useMembers();
  const createMutation = useCreateJournalEntry();
  const updateMutation = useUpdateJournalEntry();
  const deleteMutation = useDeleteJournalEntry();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [isWriting, setIsWriting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [entryType, setEntryType] = useState("freewrite");
  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [authorId, setAuthorId] = useState<string | null>(null);
  const [timeOfDay, setTimeOfDay] = useState(getTimeOfDayAuto());
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [showContext, setShowContext] = useState(false);
  const [showVitals, setShowVitals] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [entryDate, setEntryDate] = useState<Date>(new Date());

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
    setEntryType("freewrite");
    setMood(null);
    setEnergy(null);
    setAuthorId(null);
    setTimeOfDay(getTimeOfDayAuto());
    setSelectedTags([]);
    setEditingId(null);
    setIsWriting(false);
    setShowContext(false);
    setShowVitals(false);
    setShowPreview(false);
    setEntryDate(new Date());
  };

  const handleSubmit = () => {
    if (!content.trim()) {
      toast.error("Please write something first");
      return;
    }

    const data = {
      content: content.trim(),
      entryType,
      mood,
      energy,
      authorId,
      timeOfDay,
      tags: selectedTags,
      isPrivate: 0,
      entryDate,
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
    setEntryType(entry.entryType);
    setMood(entry.mood);
    setEnergy(entry.energy);
    setAuthorId(entry.authorId);
    setTimeOfDay(entry.timeOfDay || getTimeOfDayAuto());
    setSelectedTags(entry.tags || []);
    setEntryDate(entry.entryDate ? new Date(entry.entryDate) : new Date());
    setIsWriting(true);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success("Entry deleted"),
      onError: () => toast.error("Failed to delete entry"),
    });
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const insertPrompt = (prompt: string) => {
    setContent(prev => prev ? `${prev}\n\n${prompt}` : prompt);
    textareaRef.current?.focus();
  };

  const getTypeConfig = (type: string) => entryTypes.find(t => t.value === type) || entryTypes[0];
  const getAuthor = (id: string | null) => members?.find(m => m.id === id);
  const currentTypeConfig = getTypeConfig(entryType);

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
                <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">Journal</h2>
                  <p className="text-xs text-slate-500">{stats.total} entries · {stats.thisWeek} this week</p>
                </div>
              </div>
              
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  onClick={() => setIsWriting(true)} 
                  size="lg"
                  className="gap-2 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 shadow-lg shadow-indigo-500/25 text-base px-6"
                  data-testid="button-new-entry"
                >
                  <Plus className="w-5 h-5" />
                  Write
                </Button>
              </motion.div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="w-6 h-6 text-indigo-500" />
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
                  className="inline-flex p-5 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 mb-4"
                >
                  <BookOpen className="w-10 h-10 text-indigo-600" />
                </motion.div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">Your journal awaits</h3>
                <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
                  A safe space to express yourself, process experiences, and track your inner world.
                </p>
                <Button 
                  onClick={() => setIsWriting(true)}
                  className="gap-2 bg-gradient-to-r from-indigo-500 to-violet-500"
                  data-testid="button-first-entry"
                >
                  <Plus className="w-4 h-4" />
                  Start writing
                </Button>
              </motion.div>
            ) : (
              <div className="space-y-2">
                {entries?.map((entry, index) => {
                  const typeConfig = getTypeConfig(entry.entryType);
                  const author = getAuthor(entry.authorId);
                  const isExpanded = expandedEntry === entry.id;
                  const preview = entry.content.slice(0, 120);
                  
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className={cn(
                        "bg-white rounded-xl border border-slate-200/80 overflow-hidden transition-all",
                        isExpanded ? "shadow-lg" : "hover:border-slate-300 hover:shadow-sm"
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
                          aria-label={typeConfig.label}
                        >
                          {typeConfig.emoji}
                        </span>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-slate-500">
                              {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                            </span>
                            {author && (
                              <span 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: author.color }}
                                title={author.name}
                              />
                            )}
                          </div>
                          
                          <div className={cn(
                            "text-sm text-slate-700 prose prose-sm prose-slate max-w-none",
                            !isExpanded && "line-clamp-2"
                          )}>
                            {isExpanded ? (
                              <ReactMarkdown>{entry.content}</ReactMarkdown>
                            ) : (
                              <span>{preview + (entry.content.length > 120 ? "..." : "")}</span>
                            )}
                          </div>
                          
                          {entry.tags && entry.tags.length > 0 && !isExpanded && (
                            <div className="flex gap-1 mt-2 flex-wrap">
                              {entry.tags.slice(0, 3).map((tag: string) => (
                                <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">
                                  {tag}
                                </span>
                              ))}
                              {entry.tags.length > 3 && (
                                <span className="text-[10px] px-1.5 py-0.5 text-slate-400">
                                  +{entry.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <ChevronRight className={cn(
                          "w-4 h-4 text-slate-400 transition-transform shrink-0 mt-1",
                          isExpanded && "rotate-90"
                        )} />
                      </button>
                      
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-slate-100"
                          >
                            <div className="p-4 pt-3 space-y-3">
                              {(entry.mood || entry.energy) && (
                                <div className="flex gap-4 text-xs">
                                  {entry.mood && (
                                    <div className="flex items-center gap-2">
                                      <Smile className="w-3.5 h-3.5 text-amber-500" />
                                      <span className="text-slate-600">{moodLabels[entry.mood - 1]}</span>
                                    </div>
                                  )}
                                  {entry.energy && (
                                    <div className="flex items-center gap-2">
                                      <Battery className="w-3.5 h-3.5 text-cyan-500" />
                                      <span className="text-slate-600">{energyLabels[entry.energy - 1]}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {entry.tags && entry.tags.length > 0 && (
                                <div className="flex gap-1.5 flex-wrap">
                                  {entry.tags.map((tag: string) => (
                                    <span key={tag} className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full">
                                      {tag}
                                    </span>
                                  ))}
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
              className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
              data-testid="button-back"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              <span className="text-sm font-medium">Back</span>
            </button>

            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
              {entryTypes.map((type) => {
                const isSelected = entryType === type.value;
                return (
                  <motion.button
                    key={type.value}
                    onClick={() => setEntryType(type.value)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border",
                      isSelected
                        ? "text-white shadow-md"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                    )}
                    style={isSelected ? { backgroundColor: type.color, borderColor: type.color } : {}}
                    data-testid={`button-type-${type.value}`}
                  >
                    <span>{type.emoji}</span>
                    {type.label}
                  </motion.button>
                );
              })}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <TooltipProvider>
                <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-100 bg-slate-50/50">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => insertFormatting("**")}
                        className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
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
                        className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        aria-label="Italic"
                        data-testid="button-format-italic"
                      >
                        <Italic className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Italic</TooltipContent>
                  </Tooltip>
                  
                  <div className="w-px h-5 bg-slate-200 mx-1" />
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => insertFormatting("## ", "")}
                        className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
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
                        className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
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
                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
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
                    <p className="text-slate-400 italic">Nothing to preview yet...</p>
                  )}
                </div>
              ) : (
                <textarea
                  ref={textareaRef}
                  placeholder="What's on your mind?"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full min-h-[280px] p-4 text-base text-slate-700 placeholder:text-slate-400 resize-none focus:outline-none leading-relaxed"
                  data-testid="textarea-content"
                />
              )}
              
              <div className="border-t border-slate-100 px-3 py-2">
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {writingPrompts.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => insertPrompt(prompt)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors whitespace-nowrap"
                      data-testid={`button-prompt-${i}`}
                    >
                      <Lightbulb className="w-3 h-3" />
                      {prompt.length > 30 ? prompt.slice(0, 30) + "..." : prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-medium text-slate-600">Tags</span>
                {selectedTags.length > 0 && (
                  <span className="text-xs text-indigo-500">({selectedTags.length})</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tagOptions.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                        isSelected 
                          ? "bg-indigo-500 text-white" 
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      )}
                      data-testid={`tag-${tag}`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Collapsible open={showContext} onOpenChange={setShowContext}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors" data-testid="trigger-context">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-600 flex-1 text-left">Context</span>
                  <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", showContext && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 p-4 bg-white rounded-xl border border-slate-200 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1.5 block">Who is writing?</label>
                        <Select value={authorId || "__none__"} onValueChange={(v) => setAuthorId(v === "__none__" ? null : v)}>
                          <SelectTrigger data-testid="select-author" className="bg-white">
                            <SelectValue placeholder="Unknown" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Unknown / Blended</SelectItem>
                            {members?.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                <span className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                                  {m.name}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1.5 block">Time of Day</label>
                        <Select value={timeOfDay} onValueChange={setTimeOfDay}>
                          <SelectTrigger data-testid="select-time-of-day" className="bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {timeOfDayOptions.map((opt) => {
                              const Icon = opt.icon;
                              return (
                                <SelectItem key={opt.value} value={opt.value}>
                                  <span className="flex items-center gap-2">
                                    <Icon className={cn("w-4 h-4", opt.color)} />
                                    {opt.label}
                                  </span>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-1.5 block">Entry Date</label>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <input
                          type="date"
                          value={format(entryDate, "yyyy-MM-dd")}
                          onChange={(e) => {
                            const date = new Date(e.target.value + "T12:00:00");
                            if (!isNaN(date.getTime())) {
                              setEntryDate(date);
                            }
                          }}
                          className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          data-testid="input-entry-date"
                        />
                        <button
                          type="button"
                          onClick={() => setEntryDate(new Date())}
                          className="px-2 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          data-testid="button-today"
                        >
                          Today
                        </button>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Collapsible open={showVitals} onOpenChange={setShowVitals}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors" data-testid="trigger-vitals">
                  <Smile className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-600 flex-1 text-left">Mood & Energy</span>
                  {(mood || energy) && (
                    <span className="text-xs text-indigo-500 mr-2">
                      {mood && `Mood: ${mood}`}{mood && energy && " · "}{energy && `Energy: ${energy}`}
                    </span>
                  )}
                  <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", showVitals && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 p-4 bg-white rounded-xl border border-slate-200 space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium text-slate-500">Mood</label>
                        <span className="text-xs text-slate-600">{mood ? moodLabels[mood - 1] : "Not set"}</span>
                      </div>
                      <Slider
                        value={mood !== null ? [mood] : [5]}
                        onValueChange={([v]) => setMood(v)}
                        min={1}
                        max={10}
                        step={1}
                        className="py-2"
                        data-testid="slider-mood"
                      />
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium text-slate-500">Energy</label>
                        <span className="text-xs text-slate-600">{energy ? energyLabels[energy - 1] : "Not set"}</span>
                      </div>
                      <Slider
                        value={energy !== null ? [energy] : [5]}
                        onValueChange={([v]) => setEnergy(v)}
                        min={1}
                        max={10}
                        step={1}
                        className="py-2"
                        data-testid="slider-energy"
                      />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
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
                className="flex-1 gap-2 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600"
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
