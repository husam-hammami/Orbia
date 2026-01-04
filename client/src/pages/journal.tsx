import { useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
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
  Send,
  Lock,
  Unlock
} from "lucide-react";
import { toast } from "sonner";
import { useJournalEntries, useCreateJournalEntry, useUpdateJournalEntry, useDeleteJournalEntry, useMembers } from "@/lib/api-hooks";
import { cn } from "@/lib/utils";

const entryTypes = [
  { value: "reflection", label: "Daily Reflection", icon: BookOpen, color: "bg-blue-500", description: "End of day thoughts" },
  { value: "vent", label: "Vent / Release", icon: Flame, color: "bg-red-500", description: "Let it out safely" },
  { value: "gratitude", label: "Gratitude", icon: Heart, color: "bg-pink-500", description: "What you're thankful for" },
  { value: "grounding", label: "Grounding Note", icon: Leaf, color: "bg-green-500", description: "Anchor yourself" },
  { value: "memory", label: "Memory / Flashback", icon: Brain, color: "bg-purple-500", description: "Processing the past" },
  { value: "system_note", label: "System Note", icon: Users, color: "bg-indigo-500", description: "For the system" },
];

const timeOfDayOptions = [
  { value: "morning", label: "Morning", icon: Sun, color: "text-amber-500" },
  { value: "afternoon", label: "Afternoon", icon: Cloud, color: "text-blue-400" },
  { value: "evening", label: "Evening", icon: Sunset, color: "text-orange-500" },
  { value: "night", label: "Night", icon: Moon, color: "text-indigo-400" },
];

const tagOptions = [
  "anxiety", "calm", "dissociation", "grounded", "triggered", "safe", 
  "switching", "co-conscious", "pain", "tired", "hopeful", "overwhelmed",
  "productive", "creative", "lonely", "connected"
];

const moodEmojis = ["😢", "😕", "😐", "🙂", "😊"];
const energyEmojis = ["🪫", "🔋", "⚡"];

function getTimeOfDayAuto(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

export default function JournalPage() {
  const { data: entries, isLoading } = useJournalEntries();
  const { data: members } = useMembers();
  const createMutation = useCreateJournalEntry();
  const updateMutation = useUpdateJournalEntry();
  const deleteMutation = useDeleteJournalEntry();

  const [isWriting, setIsWriting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [entryType, setEntryType] = useState("reflection");
  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [authorId, setAuthorId] = useState<string | null>(null);
  const [timeOfDay, setTimeOfDay] = useState(getTimeOfDayAuto());
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);

  const resetForm = () => {
    setContent("");
    setEntryType("reflection");
    setMood(null);
    setEnergy(null);
    setAuthorId(null);
    setTimeOfDay(getTimeOfDayAuto());
    setSelectedTags([]);
    setIsPrivate(false);
    setEditingId(null);
    setIsWriting(false);
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
      isPrivate: isPrivate ? 1 : 0,
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
    setIsPrivate(entry.isPrivate === 1);
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

  const getTypeConfig = (type: string) => entryTypes.find(t => t.value === type) || entryTypes[0];
  const getAuthor = (id: string | null) => members?.find(m => m.id === id);

  return (
    <Layout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-primary" />
              Journal
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Express yourself freely, track your inner world
            </p>
          </div>
          <Button 
            onClick={() => setIsWriting(true)} 
            className="gap-2"
            data-testid="button-new-entry"
          >
            <Plus className="w-4 h-4" />
            New Entry
          </Button>
        </div>

        {isWriting && (
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>{editingId ? "Edit Entry" : "Write New Entry"}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsPrivate(!isPrivate)}
                  className="gap-1"
                  data-testid="button-toggle-private"
                >
                  {isPrivate ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  {isPrivate ? "Private" : "Shared"}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {entryTypes.map((type) => {
                  const Icon = type.icon;
                  const isSelected = entryType === type.value;
                  return (
                    <button
                      key={type.value}
                      onClick={() => setEntryType(type.value)}
                      className={cn(
                        "flex flex-col items-center gap-1 p-3 rounded-lg border transition-all",
                        isSelected 
                          ? "border-primary bg-primary/10" 
                          : "border-border hover:border-primary/50"
                      )}
                      data-testid={`button-type-${type.value}`}
                    >
                      <div className={cn("p-2 rounded-full", type.color, "text-white")}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-medium">{type.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Who is writing?</label>
                  <Select value={authorId || "__none__"} onValueChange={(v) => setAuthorId(v === "__none__" ? null : v)}>
                    <SelectTrigger data-testid="select-author">
                      <SelectValue placeholder="Select alter" />
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
                  <label className="text-sm text-muted-foreground mb-1 block">Time of Day</label>
                  <Select value={timeOfDay} onValueChange={setTimeOfDay}>
                    <SelectTrigger data-testid="select-time-of-day">
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

                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">
                    Mood: {mood !== null ? moodEmojis[Math.round((mood - 1) / 2.25)] : "—"}
                  </label>
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
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  Energy: {energy !== null ? energyEmojis[Math.min(2, Math.floor((energy - 1) / 3.5))] : "—"}
                </label>
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

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Tags (optional)</label>
                <div className="flex flex-wrap gap-1.5">
                  {tagOptions.map((tag) => (
                    <Badge
                      key={tag}
                      variant={selectedTags.includes(tag) ? "default" : "outline"}
                      className="cursor-pointer transition-all"
                      onClick={() => toggleTag(tag)}
                      data-testid={`tag-${tag}`}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              <Textarea
                placeholder="Write freely... this is your safe space."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[150px] resize-none"
                data-testid="textarea-content"
              />

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={resetForm} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="gap-2"
                  data-testid="button-save-entry"
                >
                  <Send className="w-4 h-4" />
                  {editingId ? "Update" : "Save Entry"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Past Entries</h2>
          
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading entries...</div>
          ) : entries?.length === 0 ? (
            <Card className="py-12 text-center">
              <Sparkles className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No journal entries yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Start writing to track your journey</p>
            </Card>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-3 pr-4">
                {entries?.map((entry) => {
                  const typeConfig = getTypeConfig(entry.entryType);
                  const Icon = typeConfig.icon;
                  const author = getAuthor(entry.authorId);
                  const timeOption = timeOfDayOptions.find(t => t.value === entry.timeOfDay);
                  const TimeIcon = timeOption?.icon || Sun;

                  return (
                    <Card key={entry.id} className="relative group" data-testid={`entry-${entry.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={cn("p-2 rounded-full shrink-0", typeConfig.color, "text-white")}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <span className="text-sm font-medium">{typeConfig.label}</span>
                              {author && (
                                <Badge variant="secondary" className="text-xs gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: author.color }} />
                                  {author.name}
                                </Badge>
                              )}
                              {entry.isPrivate === 1 && (
                                <Lock className="w-3 h-3 text-muted-foreground" />
                              )}
                              <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                                <TimeIcon className={cn("w-3 h-3", timeOption?.color)} />
                                {format(new Date(entry.createdAt), "MMM d, h:mm a")}
                              </span>
                            </div>
                            
                            <p className="text-sm whitespace-pre-wrap">{entry.content}</p>
                            
                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                              {entry.mood && (
                                <span className="text-xs text-muted-foreground">
                                  Mood: {moodEmojis[Math.round((entry.mood - 1) / 2.25)]} {entry.mood}/10
                                </span>
                              )}
                              {entry.energy && (
                                <span className="text-xs text-muted-foreground">
                                  Energy: {energyEmojis[Math.min(2, Math.floor((entry.energy - 1) / 3.5))]} {entry.energy}/10
                                </span>
                              )}
                              {entry.tags && entry.tags.length > 0 && (
                                <div className="flex gap-1 flex-wrap">
                                  {entry.tags.map((tag: string) => (
                                    <Badge key={tag} variant="outline" className="text-xs py-0">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7"
                              onClick={() => handleEdit(entry)}
                              data-testid={`button-edit-${entry.id}`}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 text-destructive"
                                  data-testid={`button-delete-${entry.id}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This entry will be permanently deleted.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(entry.id)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </Layout>
  );
}
