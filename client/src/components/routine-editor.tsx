import { useState, useCallback } from "react";
import { useAndroidBack } from "@/hooks/use-android-back";
import { 
  Plus, Pencil, Trash2, Clock, Save, X, ArrowLeft,
  Sunrise, Sun, Moon, Briefcase, Coffee, Utensils, 
  Dumbbell, BookOpen, Heart, Bed, Sparkles, Music, 
  Users, Home, Zap, Activity, Star, Calendar, Copy,
  type LucideIcon
} from "lucide-react";

const ICON_OPTIONS: { name: string; icon: LucideIcon; label: string }[] = [
  { name: "Sunrise", icon: Sunrise, label: "Morning" },
  { name: "Sun", icon: Sun, label: "Afternoon" },
  { name: "Moon", icon: Moon, label: "Evening/Night" },
  { name: "Briefcase", icon: Briefcase, label: "Work" },
  { name: "Coffee", icon: Coffee, label: "Break" },
  { name: "Utensils", icon: Utensils, label: "Meals" },
  { name: "Dumbbell", icon: Dumbbell, label: "Exercise" },
  { name: "BookOpen", icon: BookOpen, label: "Study" },
  { name: "Heart", icon: Heart, label: "Wellness" },
  { name: "Bed", icon: Bed, label: "Sleep" },
  { name: "Sparkles", icon: Sparkles, label: "Self-care" },
  { name: "Music", icon: Music, label: "Entertainment" },
  { name: "Users", icon: Users, label: "Social" },
  { name: "Home", icon: Home, label: "Home" },
  { name: "Zap", icon: Zap, label: "Energy" },
];

const iconMap: Record<string, LucideIcon> = Object.fromEntries(
  ICON_OPTIONS.map(opt => [opt.name, opt.icon])
);

function getBlockIcon(block: { name: string; icon?: string | null }): LucideIcon {
  if (block.icon && iconMap[block.icon]) {
    return iconMap[block.icon];
  }
  const nameLower = block.name.toLowerCase();
  if (nameLower.includes("morning") || nameLower.includes("wake")) return Sunrise;
  if (nameLower.includes("work") || nameLower.includes("block")) return Briefcase;
  if (nameLower.includes("break") || nameLower.includes("rest")) return Coffee;
  if (nameLower.includes("evening") || nameLower.includes("night") || nameLower.includes("afternoon")) return Moon;
  if (nameLower.includes("meal") || nameLower.includes("lunch") || nameLower.includes("dinner") || nameLower.includes("breakfast")) return Utensils;
  if (nameLower.includes("exercise") || nameLower.includes("gym") || nameLower.includes("workout")) return Dumbbell;
  if (nameLower.includes("learn") || nameLower.includes("study") || nameLower.includes("read")) return BookOpen;
  return Activity;
}

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRoutineBlocks, useRoutineActivities, useHabits, useCreateRoutineBlock, useUpdateRoutineBlock, useDeleteRoutineBlock, useCreateRoutineActivity, useUpdateRoutineActivity, useDeleteRoutineActivity, useRoutineTemplates, useCreateRoutineTemplate, useSetDefaultRoutineTemplate, useDeleteRoutineTemplate } from "@/lib/api-hooks";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function formatTimeAMPM(time24: string | null | undefined): string {
  if (!time24 || !time24.includes(':')) return time24 || '';
  const [hours, minutes] = time24.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return time24;
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export function RoutineEditor() {
  const { data: blocks } = useRoutineBlocks();
  const { data: activities } = useRoutineActivities();
  const { data: habits } = useHabits();
  const { data: templates } = useRoutineTemplates();
  
  const createBlock = useCreateRoutineBlock();
  const updateBlock = useUpdateRoutineBlock();
  const deleteBlock = useDeleteRoutineBlock();
  const createActivity = useCreateRoutineActivity();
  const updateActivity = useUpdateRoutineActivity();
  const deleteActivity = useDeleteRoutineActivity();
  const createTemplate = useCreateRoutineTemplate();
  const setDefaultTemplate = useSetDefaultRoutineTemplate();
  const deleteTemplate = useDeleteRoutineTemplate();

  const [editingBlock, setEditingBlock] = useState<any>(null);
  const [editingActivity, setEditingActivity] = useState<any>(null);
  const [newBlockOpen, setNewBlockOpen] = useState(false);
  const [newActivityOpen, setNewActivityOpen] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const closeSheet = useCallback(() => setSheetOpen(false), []);
  const closeBlockDialog = useCallback(() => { setNewBlockOpen(false); resetBlockForm(); }, []);
  const closeActivityDialog = useCallback(() => { setNewActivityOpen(false); resetActivityForm(); setSelectedBlockId(null); }, []);
  
  useAndroidBack(sheetOpen, closeSheet);
  useAndroidBack(newBlockOpen, closeBlockDialog);
  useAndroidBack(newActivityOpen, closeActivityDialog);

  const [blockForm, setBlockForm] = useState({
    name: "",
    emoji: "📋",
    startTime: "09:00",
    endTime: "10:00",
    purpose: "",
    color: "#6366f1",
    icon: "Sunrise",
  });

  const [activityForm, setActivityForm] = useState({
    name: "",
    time: "",
    description: "",
    habitId: "",
  });

  const resetBlockForm = () => {
    setBlockForm({ name: "", emoji: "📋", startTime: "09:00", endTime: "10:00", purpose: "", color: "#6366f1", icon: "Sunrise" });
    setEditingBlock(null);
  };

  const resetActivityForm = () => {
    setActivityForm({ name: "", time: "", description: "", habitId: "" });
    setEditingActivity(null);
  };

  const handleSaveBlock = async () => {
    if (!blockForm.name) {
      toast.error("Block name is required");
      return;
    }
    if (blockForm.startTime >= blockForm.endTime) {
      toast.error("End time must be after start time");
      return;
    }
    
    try {
      const blockData = {
        name: blockForm.name,
        emoji: blockForm.emoji,
        startTime: blockForm.startTime,
        endTime: blockForm.endTime,
        purpose: blockForm.purpose,
        color: blockForm.color,
        icon: blockForm.icon,
      };
      
      if (editingBlock) {
        await updateBlock.mutateAsync({ id: editingBlock.id, ...blockData, order: editingBlock.order });
        toast.success("Block updated");
      } else {
        const maxOrder = blocks && blocks.length > 0 ? Math.max(...blocks.map(b => b.order)) : -1;
        await createBlock.mutateAsync({ ...blockData, order: maxOrder + 1 });
        toast.success("Block created");
      }
      resetBlockForm();
      setNewBlockOpen(false);
    } catch {
      toast.error("Failed to save block");
    }
  };

  const handleDeleteBlock = async (id: string) => {
    try {
      await deleteBlock.mutateAsync(id);
      toast.success("Block deleted");
    } catch {
      toast.error("Failed to delete block");
    }
  };

  const handleSaveActivity = async () => {
    if (!activityForm.name || !selectedBlockId) {
      toast.error("Activity name and block are required");
      return;
    }
    
    try {
      const blockActivities = activities?.filter(a => a.blockId === selectedBlockId) || [];
      const maxOrder = blockActivities.length > 0 ? Math.max(...blockActivities.map(a => a.order)) : -1;
      const order = maxOrder + 1;
      
      if (editingActivity) {
        await updateActivity.mutateAsync({
          id: editingActivity.id,
          blockId: selectedBlockId,
          name: activityForm.name,
          time: activityForm.time || null,
          description: activityForm.description || null,
          habitId: activityForm.habitId || null,
          order: editingActivity.order,
        });
        toast.success("Activity updated");
      } else {
        await createActivity.mutateAsync({
          blockId: selectedBlockId,
          name: activityForm.name,
          time: activityForm.time || null,
          description: activityForm.description || null,
          habitId: activityForm.habitId || null,
          order,
        });
        toast.success("Activity added");
      }
      resetActivityForm();
      setNewActivityOpen(false);
    } catch {
      toast.error("Failed to save activity");
    }
  };

  const handleDeleteActivity = async (id: string) => {
    try {
      await deleteActivity.mutateAsync(id);
      toast.success("Activity deleted");
    } catch {
      toast.error("Failed to delete activity");
    }
  };

  const startEditBlock = (block: any) => {
    setBlockForm({
      name: block.name,
      emoji: block.emoji,
      startTime: block.startTime,
      endTime: block.endTime,
      purpose: block.purpose || "",
      color: block.color,
      icon: block.icon || "Sunrise",
    });
    setEditingBlock(block);
    setNewBlockOpen(true);
  };

  const startEditActivity = (activity: any, blockId: string) => {
    setActivityForm({
      name: activity.name,
      time: activity.time || "",
      description: activity.description || "",
      habitId: activity.habitId || "",
    });
    setEditingActivity(activity);
    setSelectedBlockId(blockId);
    setNewActivityOpen(true);
  };

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" data-testid="button-edit-routine">
          <Pencil className="w-4 h-4" />
          Edit Routine
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:w-[540px] overflow-y-auto p-0">
        {/* Mobile-friendly header with back button */}
        <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b border-border bg-background/95 backdrop-blur-sm">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 shrink-0" 
            onClick={() => setSheetOpen(false)}
            data-testid="button-close-routine-editor"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <SheetHeader className="space-y-0">
              <SheetTitle className="text-lg">Edit Routine</SheetTitle>
              <SheetDescription className="text-xs">Manage your routine blocks and activities</SheetDescription>
            </SheetHeader>
          </div>
        </div>
        
        <div className="p-4">

        <div className="space-y-6">
          {/* Template Selector */}
          <div className="p-4 bg-muted/50 rounded-xl border border-border/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">Routine Templates</h3>
              </div>
              {!showNewTemplate && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-7 text-xs gap-1"
                  onClick={() => setShowNewTemplate(true)}
                  data-testid="button-new-template"
                >
                  <Plus className="w-3 h-3" />
                  New Template
                </Button>
              )}
            </div>
            
            {showNewTemplate && (
              <div className="flex gap-2">
                <Input
                  placeholder="Template name (e.g., Weekend, Holiday)"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className="h-8 text-sm flex-1"
                  autoFocus
                  data-testid="input-template-name"
                />
                <Button
                  size="sm"
                  className="h-8"
                  disabled={!newTemplateName.trim()}
                  onClick={() => {
                    createTemplate.mutate({ name: newTemplateName.trim() }, {
                      onSuccess: () => {
                        toast.success("Template created!");
                        setNewTemplateName("");
                        setShowNewTemplate(false);
                      }
                    });
                  }}
                  data-testid="button-create-template"
                >
                  Create
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8"
                  onClick={() => {
                    setNewTemplateName("");
                    setShowNewTemplate(false);
                  }}
                  data-testid="button-cancel-template"
                >
                  Cancel
                </Button>
              </div>
            )}
            
            {templates && templates.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors group",
                      template.isDefault === 1 
                        ? "bg-primary/10 border-primary/30" 
                        : "bg-background border-border hover:border-primary/30"
                    )}
                    data-testid={`template-chip-${template.id}`}
                  >
                    {template.isDefault === 1 && (
                      <Star className="w-3 h-3 text-primary fill-primary" />
                    )}
                    <span className="text-sm font-medium">{template.name}</span>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {template.isDefault !== 1 && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-5 w-5"
                          title="Set as default"
                          data-testid={`button-set-default-${template.id}`}
                          onClick={() => {
                            setDefaultTemplate.mutate(template.id, {
                              onSuccess: () => toast.success("Default template set!")
                            });
                          }}
                        >
                          <Star className="w-3 h-3 text-muted-foreground hover:text-primary" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5"
                        data-testid={`button-delete-template-${template.id}`}
                        onClick={() => {
                          if (window.confirm("Delete this template?")) {
                            deleteTemplate.mutate(template.id, {
                              onSuccess: () => toast.success("Template deleted!")
                            });
                          }
                        }}
                      >
                        <Trash2 className="w-3 h-3 text-muted-foreground hover:text-rose-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Create templates for different days (Weekday, Weekend, Holiday) to quickly switch your routine.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Time Blocks</h3>
            <Dialog open={newBlockOpen} onOpenChange={(open) => { setNewBlockOpen(open); if (!open) resetBlockForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2" data-testid="button-add-block">
                  <Plus className="w-4 h-4" />
                  Add Block
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingBlock ? "Edit Block" : "Add Block"}</DialogTitle>
                  <DialogDescription>Configure a time block for your routine</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Input
                      placeholder="Block name"
                      value={blockForm.name}
                      onChange={(e) => setBlockForm({ ...blockForm, name: e.target.value })}
                      data-testid="input-block-name"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Icon</label>
                    <div className="grid grid-cols-5 gap-2" data-testid="icon-picker-grid">
                      {ICON_OPTIONS.map((opt) => {
                        const IconComponent = opt.icon;
                        const isSelected = blockForm.icon === opt.name;
                        return (
                          <button
                            key={opt.name}
                            type="button"
                            onClick={() => setBlockForm({ ...blockForm, icon: opt.name })}
                            className={cn(
                              "flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all hover:bg-accent",
                              isSelected 
                                ? "border-primary bg-primary/10" 
                                : "border-transparent bg-muted/50"
                            )}
                            title={opt.label}
                            data-testid={`icon-option-${opt.name}`}
                          >
                            <IconComponent className={cn(
                              "w-5 h-5",
                              isSelected ? "text-primary" : "text-muted-foreground"
                            )} />
                            <span className="text-[9px] mt-1 text-muted-foreground truncate w-full text-center">
                              {opt.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Start Time</label>
                      <Input
                        type="time"
                        value={blockForm.startTime}
                        onChange={(e) => setBlockForm({ ...blockForm, startTime: e.target.value })}
                        data-testid="input-block-start"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">End Time</label>
                      <Input
                        type="time"
                        value={blockForm.endTime}
                        onChange={(e) => setBlockForm({ ...blockForm, endTime: e.target.value })}
                        data-testid="input-block-end"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Purpose</label>
                    <Textarea
                      placeholder="Why is this block important?"
                      value={blockForm.purpose}
                      onChange={(e) => setBlockForm({ ...blockForm, purpose: e.target.value })}
                      data-testid="input-block-purpose"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Color</label>
                    <Input
                      type="color"
                      value={blockForm.color}
                      onChange={(e) => setBlockForm({ ...blockForm, color: e.target.value })}
                      className="h-10 w-20"
                      data-testid="input-block-color"
                    />
                  </div>
                  <Button onClick={handleSaveBlock} className="w-full" data-testid="button-save-block">
                    <Save className="w-4 h-4 mr-2" />
                    {editingBlock ? "Update Block" : "Add Block"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-2">
            {blocks?.sort((a, b) => a.order - b.order).map((block) => {
              const blockActivities = activities?.filter(a => a.blockId === block.id).sort((a, b) => a.order - b.order) || [];
              const BlockIcon = getBlockIcon(block);
              
              return (
                <div key={block.id} className="border rounded-lg p-3 space-y-2" data-testid={`block-${block.id}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BlockIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{block.name}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {formatTimeAMPM(block.startTime)} — {formatTimeAMPM(block.endTime)}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEditBlock(block)} data-testid={`button-edit-block-${block.id}`}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteBlock(block.id)} data-testid={`button-delete-block-${block.id}`}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="pl-6 space-y-1">
                    {blockActivities.map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between text-sm py-1 border-l-2 pl-2" style={{ borderColor: block.color }}>
                        <div className="flex items-center gap-2">
                          {activity.time && <span className="text-xs text-muted-foreground">{formatTimeAMPM(activity.time)}</span>}
                          <span>{activity.name}</span>
                          {activity.habitId && <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">Linked</span>}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startEditActivity(activity, block.id)}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteActivity(activity.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Dialog open={newActivityOpen && selectedBlockId === block.id} onOpenChange={(open) => { if (!open) { resetActivityForm(); setSelectedBlockId(null); } setNewActivityOpen(open); }}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => setSelectedBlockId(block.id)}>
                          <Plus className="w-4 h-4 mr-1" />
                          Add Activity
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{editingActivity ? "Edit Activity" : "Add Activity"}</DialogTitle>
                          <DialogDescription>Add a task to the {block.name} block</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                          <Input
                            placeholder="Activity name"
                            value={activityForm.name}
                            onChange={(e) => setActivityForm({ ...activityForm, name: e.target.value })}
                            data-testid="input-activity-name"
                          />
                          <Input
                            type="time"
                            placeholder="Time (optional)"
                            value={activityForm.time}
                            onChange={(e) => setActivityForm({ ...activityForm, time: e.target.value })}
                            data-testid="input-activity-time"
                          />
                          <Textarea
                            placeholder="Description (optional)"
                            value={activityForm.description}
                            onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                            data-testid="input-activity-description"
                          />
                          <div>
                            <label className="text-sm text-muted-foreground mb-1 block">Link to Habit (optional)</label>
                            <Select value={activityForm.habitId || "__none__"} onValueChange={(v) => setActivityForm({ ...activityForm, habitId: v === "__none__" ? "" : v })}>
                              <SelectTrigger data-testid="select-activity-habit">
                                <SelectValue placeholder="None" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">None</SelectItem>
                                {habits?.map((h) => (
                                  <SelectItem key={h.id} value={h.id}>{h.title}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button onClick={handleSaveActivity} className="w-full" data-testid="button-save-activity">
                            <Save className="w-4 h-4 mr-2" />
                            {editingActivity ? "Update Activity" : "Add Activity"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
