import { useState } from "react";
import { Plus, Pencil, Trash2, Clock, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRoutineBlocks, useRoutineActivities, useHabits, useCreateRoutineBlock, useUpdateRoutineBlock, useDeleteRoutineBlock, useCreateRoutineActivity, useUpdateRoutineActivity, useDeleteRoutineActivity } from "@/lib/api-hooks";
import { toast } from "sonner";

export function RoutineEditor() {
  const { data: blocks } = useRoutineBlocks();
  const { data: activities } = useRoutineActivities();
  const { data: habits } = useHabits();
  
  const createBlock = useCreateRoutineBlock();
  const updateBlock = useUpdateRoutineBlock();
  const deleteBlock = useDeleteRoutineBlock();
  const createActivity = useCreateRoutineActivity();
  const updateActivity = useUpdateRoutineActivity();
  const deleteActivity = useDeleteRoutineActivity();

  const [editingBlock, setEditingBlock] = useState<any>(null);
  const [editingActivity, setEditingActivity] = useState<any>(null);
  const [newBlockOpen, setNewBlockOpen] = useState(false);
  const [newActivityOpen, setNewActivityOpen] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const [blockForm, setBlockForm] = useState({
    name: "",
    emoji: "📋",
    startTime: "09:00",
    endTime: "10:00",
    purpose: "",
    color: "#6366f1",
  });

  const [activityForm, setActivityForm] = useState({
    name: "",
    time: "",
    description: "",
    habitId: "",
  });

  const resetBlockForm = () => {
    setBlockForm({ name: "", emoji: "📋", startTime: "09:00", endTime: "10:00", purpose: "", color: "#6366f1" });
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
      if (editingBlock) {
        await updateBlock.mutateAsync({ id: editingBlock.id, ...blockForm, order: editingBlock.order });
        toast.success("Block updated");
      } else {
        const maxOrder = blocks && blocks.length > 0 ? Math.max(...blocks.map(b => b.order)) : -1;
        await createBlock.mutateAsync({ ...blockForm, order: maxOrder + 1 });
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
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" data-testid="button-edit-routine">
          <Pencil className="w-4 h-4" />
          Edit Routine
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>Edit Routine</SheetTitle>
          <SheetDescription>Manage your daily routine blocks and activities</SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
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
                  <div className="grid grid-cols-4 gap-2">
                    <Input
                      placeholder="Emoji"
                      value={blockForm.emoji}
                      onChange={(e) => setBlockForm({ ...blockForm, emoji: e.target.value })}
                      className="col-span-1"
                      data-testid="input-block-emoji"
                    />
                    <Input
                      placeholder="Block name"
                      value={blockForm.name}
                      onChange={(e) => setBlockForm({ ...blockForm, name: e.target.value })}
                      className="col-span-3"
                      data-testid="input-block-name"
                    />
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
              
              return (
                <div key={block.id} className="border rounded-lg p-3 space-y-2" data-testid={`block-${block.id}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{block.emoji}</span>
                      <span className="font-medium">{block.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {block.startTime} - {block.endTime}
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
                          {activity.time && <span className="text-xs text-muted-foreground">{activity.time}</span>}
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
      </SheetContent>
    </Sheet>
  );
}
