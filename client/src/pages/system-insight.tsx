import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Users, 
  Shield, 
  Ghost, 
  Cpu, 
  Eye, 
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Brain,
  Heart,
  Zap,
  Sparkles,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Clock,
  LayoutTemplate,
  ArrowUpRight,
  ArrowDownRight,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMembers, useCreateMember, useUpdateMember, useDeleteMember, useDeepMindOverview } from "@/lib/api-hooks";
import { HeadspaceMap } from "@/components/headspace-map";
import type { SystemMember, InsertSystemMember } from "@shared/schema";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const AVATAR_OPTIONS = [
  { value: "shield", label: "Shield", icon: Shield },
  { value: "ghost", label: "Ghost", icon: Ghost },
  { value: "cpu", label: "CPU", icon: Cpu },
  { value: "eye", label: "Eye", icon: Eye },
  { value: "users", label: "Person", icon: Users },
];

const COLOR_OPTIONS = [
  "#0f766e", "#0d9488", "#14b8a6", "#2dd4bf",
  "#6366f1", "#8b5cf6", "#3b82f6",
  "#ef4444", "#f59e0b", "#6b7280"
];

const getIcon = (avatar: string) => {
  switch(avatar) {
    case 'shield': return Shield;
    case 'ghost': return Ghost;
    case 'cpu': return Cpu;
    case 'eye': return Eye;
    default: return Users;
  }
};

const getMoodTrendIcon = (trend: "improving" | "stable" | "declining") => {
  switch(trend) {
    case "improving": return <ArrowUpRight className="w-4 h-4 text-emerald-500" />;
    case "declining": return <ArrowDownRight className="w-4 h-4 text-rose-500" />;
    default: return <Minus className="w-4 h-4 text-muted-foreground" />;
  }
};

export default function SystemInsight() {
  const { data: members = [], isLoading: membersLoading } = useMembers();
  const [timeRange, setTimeRange] = useState(30);
  const { data: overview, isLoading: overviewLoading, refetch: refetchOverview } = useDeepMindOverview(timeRange);
  
  const [aiInsight, setAiInsight] = useState("");
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const createMember = useCreateMember();
  const updateMember = useUpdateMember();
  const deleteMember = useDeleteMember();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<SystemMember | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<SystemMember | null>(null);
  const [traitsInput, setTraitsInput] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    description: "",
    color: "#0f766e",
    avatar: "users",
    location: "",
    traits: [] as string[],
  });
  
  const resetForm = () => {
    setFormData({
      name: "",
      role: "",
      description: "",
      color: "#0f766e",
      avatar: "users",
      location: "",
      traits: [],
    });
    setTraitsInput("");
    setEditingMember(null);
  };
  
  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };
  
  const openEditDialog = (member: SystemMember) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      role: member.role,
      description: member.description,
      color: member.color,
      avatar: member.avatar,
      location: member.location || "",
      traits: member.traits || [],
    });
    setTraitsInput((member.traits || []).join(", "));
    setIsDialogOpen(true);
  };
  
  const handleSave = async () => {
    if (!formData.name.trim() || !formData.role.trim()) {
      toast.error("Name and role are required");
      return;
    }
    
    const traits = traitsInput.split(",").map(t => t.trim()).filter(Boolean);
    const locationValue: string | null = formData.location?.trim() || null;
    const memberData = {
      name: formData.name.trim(),
      role: formData.role.trim(),
      description: formData.description.trim(),
      color: formData.color,
      avatar: formData.avatar,
      location: locationValue as string | null,
      traits,
    };
    
    try {
      if (editingMember) {
        await updateMember.mutateAsync({ id: editingMember.id, data: memberData as any });
        toast.success(`Updated ${memberData.name}`);
      } else {
        await createMember.mutateAsync(memberData as any);
        toast.success(`Added ${memberData.name}`);
      }
      setIsDialogOpen(false);
      resetForm();
      refetchOverview();
    } catch (error) {
      toast.error("Failed to save state");
    }
  };
  
  const handleDelete = async () => {
    if (!memberToDelete) return;
    try {
      await deleteMember.mutateAsync(memberToDelete.id);
      toast.success(`Deleted ${memberToDelete.name}`);
      setDeleteConfirmOpen(false);
      setMemberToDelete(null);
      refetchOverview();
    } catch (error) {
      toast.error("Failed to delete state");
    }
  };
  
  const confirmDelete = (member: SystemMember) => {
    setMemberToDelete(member);
    setDeleteConfirmOpen(true);
  };
  
  const fetchAIInsight = async (focus: string = "system") => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    setIsLoadingInsight(true);
    setAiInsight("");
    
    try {
      const response = await fetch("/api/deep-mind/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ focus }),
        signal: abortControllerRef.current.signal,
      });
      
      if (!response.ok) throw new Error("Failed to fetch insights");
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");
      
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setAiInsight(prev => prev + decoder.decode(value));
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        setAiInsight("Unable to generate insights at this time. Please try again.");
      }
    } finally {
      setIsLoadingInsight(false);
    }
  };
  
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const isLoading = membersLoading || overviewLoading;
  const metrics = overview?.systemMetrics;
  const memberStats = overview?.memberStats || [];

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/40 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="border-violet-600/30 text-violet-700 bg-violet-600/5 gap-1">
                <Users className="w-3 h-3" /> System States
              </Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight">Headspace</h1>
            <p className="text-muted-foreground text-lg">Visualize and manage your system states</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(timeRange)} onValueChange={(v) => setTimeRange(Number(v))}>
              <SelectTrigger className="w-[130px]" data-testid="select-time-range">
                <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <Tabs defaultValue="visualizer" className="space-y-6">
              <TabsList className="bg-muted/30 p-1 border border-border/40">
                <TabsTrigger value="visualizer" className="gap-2"><LayoutTemplate className="w-4 h-4" /> Headspace Map</TabsTrigger>
                <TabsTrigger value="directory" className="gap-2"><Users className="w-4 h-4" /> Directory</TabsTrigger>
              </TabsList>

              <TabsContent value="visualizer" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <HeadspaceMap />
              </TabsContent>

              <TabsContent value="directory" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Users className="w-5 h-5 text-muted-foreground" />
                          States ({members.length})
                        </CardTitle>
                        <CardDescription>Manage your state directory</CardDescription>
                      </div>
                      <Button onClick={openAddDialog} className="bg-primary hover:bg-primary/90 text-primary-foreground" data-testid="button-add-member">
                        <Plus className="w-4 h-4 mr-2" /> Add State
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {members.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>No states yet. Add your first state to get started.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {members.map(member => {
                          const Icon = getIcon(member.avatar || 'users');
                          return (
                            <div
                              key={member.id}
                              className="flex items-start gap-4 p-4 rounded-lg border border-border/50 hover:border-border transition-colors"
                            >
                              <div 
                                className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                                style={{ backgroundColor: (member.color || "#0f766e") + '20', borderColor: (member.color || "#0f766e") + '40' }}
                              >
                                <Icon className="w-6 h-6" style={{ color: member.color || "#0f766e" }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold">{member.name}</span>
                                  <Badge variant="outline" className="text-xs" style={{ borderColor: member.color + '40', color: member.color }}>
                                    {member.role}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2">{member.description}</p>
                                {member.traits && member.traits.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {member.traits.slice(0, 3).map(trait => (
                                      <Badge key={trait} variant="secondary" className="text-xs">{trait}</Badge>
                                    ))}
                                    {member.traits.length > 3 && (
                                      <Badge variant="secondary" className="text-xs">+{member.traits.length - 3}</Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <Button size="icon" variant="ghost" onClick={() => openEditDialog(member)} data-testid={`button-edit-${member.id}`}>
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => confirmDelete(member)} data-testid={`button-delete-${member.id}`}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
      
      {/* Add/Edit State Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingMember ? "Edit State" : "Add New State"}</DialogTitle>
            <DialogDescription>
              {editingMember ? "Update this state's information." : "Add a new state to your directory."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="State name"
                  data-testid="input-member-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Input
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                  placeholder="e.g., Protector, Host"
                  data-testid="input-member-role"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description..."
                rows={2}
                data-testid="input-member-description"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Avatar</Label>
                <Select value={formData.avatar} onValueChange={(v) => setFormData(prev => ({ ...prev, avatar: v }))}>
                  <SelectTrigger data-testid="select-member-avatar">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVATAR_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <opt.icon className="w-4 h-4" />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g., Front room"
                  data-testid="input-member-location"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {COLOR_OPTIONS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      formData.color === color ? "border-foreground scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: color }}
                    data-testid={`button-color-${color}`}
                  />
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="traits">Traits (comma-separated)</Label>
              <Input
                id="traits"
                value={traitsInput}
                onChange={(e) => setTraitsInput(e.target.value)}
                placeholder="e.g., Protective, Calm, Analytical"
                data-testid="input-member-traits"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} data-testid="button-cancel-member">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={createMember.isPending || updateMember.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground" data-testid="button-save-member">
              {(createMember.isPending || updateMember.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingMember ? "Save Changes" : "Add State"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {memberToDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this state from your directory. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90" data-testid="button-confirm-delete">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
