import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  BrainCircuit, 
  Shield, 
  Ghost, 
  Cpu, 
  Eye, 
  Activity,
  FileText,
  Clock,
  MapPin,
  LayoutTemplate,
  Plus,
  Pencil,
  Trash2,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMembers, useCreateMember, useUpdateMember, useDeleteMember } from "@/lib/api-hooks";
import { HeadspaceMap } from "@/components/headspace-map";
import type { SystemMember, InsertSystemMember } from "@shared/schema";
import { toast } from "sonner";

const AVATAR_OPTIONS = [
  { value: "shield", label: "Shield", icon: Shield },
  { value: "ghost", label: "Ghost", icon: Ghost },
  { value: "cpu", label: "CPU", icon: Cpu },
  { value: "eye", label: "Eye", icon: Eye },
  { value: "users", label: "Person", icon: Users },
];

const COLOR_OPTIONS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f59e0b", 
  "#10b981", "#06b6d4", "#3b82f6", "#6b7280", "#78716c"
];

export default function SystemInsight() {
  const { data: members = [], isLoading } = useMembers();
  const [activeMember, setActiveMember] = useState<SystemMember | null>(null);
  
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
    color: "#6366f1",
    avatar: "users",
    location: "",
    traits: [] as string[],
  });
  
  const resetForm = () => {
    setFormData({
      name: "",
      role: "",
      description: "",
      color: "#6366f1",
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
    const payload: InsertSystemMember = {
      name: formData.name.trim(),
      role: formData.role.trim(),
      description: formData.description.trim(),
      color: formData.color,
      avatar: formData.avatar,
      location: formData.location.trim() || null,
      traits,
    };
    
    try {
      if (editingMember) {
        await updateMember.mutateAsync({ id: editingMember.id, ...payload });
        toast.success(`Updated ${payload.name}`);
        if (activeMember?.id === editingMember.id) {
          setActiveMember({ ...editingMember, ...payload, traits });
        }
      } else {
        const newMember = await createMember.mutateAsync(payload);
        toast.success(`Added ${payload.name}`);
        setActiveMember(newMember);
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Failed to save member");
    }
  };
  
  const handleDelete = async () => {
    if (!memberToDelete) return;
    try {
      await deleteMember.mutateAsync(memberToDelete.id);
      toast.success(`Deleted ${memberToDelete.name}`);
      if (activeMember?.id === memberToDelete.id) {
        setActiveMember(null);
      }
      setDeleteConfirmOpen(false);
      setMemberToDelete(null);
    } catch (error) {
      toast.error("Failed to delete member");
    }
  };
  
  const confirmDelete = (member: SystemMember) => {
    setMemberToDelete(member);
    setDeleteConfirmOpen(true);
  };

  const getIcon = (avatar: string) => {
    switch(avatar) {
      case 'shield': return Shield;
      case 'ghost': return Ghost;
      case 'cpu': return Cpu;
      case 'eye': return Eye;
      default: return Users;
    }
  };

  // Auto-select first member if none selected
  if (!activeMember && members.length > 0 && !isLoading) {
    setActiveMember(members[0]);
  }

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/40 pb-6">
          <div className="space-y-1">
             <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="border-indigo-500/30 text-indigo-600 bg-indigo-500/5 gap-1">
                    <Users className="w-3 h-3" /> System Directory
                </Badge>
             </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight">Headspace & Alters</h1>
            <p className="text-muted-foreground text-lg">Manage system members and visualize your internal world.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading members...</div>
          </div>
        ) : (
          <Tabs defaultValue="visualizer" className="space-y-6">
            <TabsList className="bg-muted/30 p-1 border border-border/40">
                 <TabsTrigger value="visualizer" className="gap-2"><LayoutTemplate className="w-4 h-4" /> Visual Headspace</TabsTrigger>
                <TabsTrigger value="directory" className="gap-2"><Users className="w-4 h-4" /> Directory</TabsTrigger>
            </TabsList>

            <TabsContent value="visualizer" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <HeadspaceMap />
            </TabsContent>

            <TabsContent value="directory" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Sidebar: Member List */}
                    <Card className="lg:col-span-4 h-fit border-border/50">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2 justify-between">
                                <div className="flex items-center gap-2">
                                    <Users className="w-5 h-5 text-muted-foreground" />
                                    Members ({members.length})
                                </div>
                                <Button size="sm" variant="outline" className="gap-1" onClick={openAddDialog} data-testid="button-add-member">
                                    <Plus className="w-4 h-4" /> Add
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="flex flex-col">
                                {members.map(member => {
                                    const Icon = getIcon(member.avatar || 'user');
                                    const isActive = activeMember?.id === member.id;
                                    
                                    return (
                                        <button
                                            key={member.id}
                                            onClick={() => setActiveMember(member)}
                                            className={cn(
                                                "flex items-center gap-3 p-4 text-left transition-all border-l-4 hover:bg-muted/50",
                                                isActive 
                                                    ? "bg-muted/50 border-indigo-500" 
                                                    : "border-transparent"
                                            )}
                                        >
                                            <div className={cn(
                                                "h-10 w-10 rounded-full flex items-center justify-center border",
                                                isActive ? "shadow-md" : "shadow-sm"
                                            )} style={{ backgroundColor: (member.color || "#6366f1") + '20', borderColor: (member.color || "#6366f1") + '40' }}>
                                                <Icon className="w-5 h-5" style={{ color: member.color || "#6366f1" }} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-semibold text-sm flex justify-between">
                                                    {member.name}
                                                    {isActive && <Badge variant="secondary" className="text-[10px] h-5">Selected</Badge>}
                                                </div>
                                                <div className="text-xs text-muted-foreground">{member.role}</div>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Main Content: Member Profile */}
                    <div className="lg:col-span-8 space-y-6">
                        {activeMember && (
                        <Card className="border-t-4 shadow-md" style={{ borderTopColor: activeMember.color || "#6366f1" }}>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-3xl font-bold flex items-center gap-3">
                                            {activeMember.name}
                                            <Badge className="text-white border-0" style={{ backgroundColor: activeMember.color || "#6366f1" }}>
                                                {activeMember.role}
                                            </Badge>
                                        </CardTitle>
                                        <CardDescription className="mt-2 text-base">
                                            {activeMember.description}
                                        </CardDescription>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <div className="h-16 w-16 rounded-full flex items-center justify-center bg-muted border-2 border-border" style={{ borderColor: activeMember.color || "#6366f1" }}>
                                            {(() => {
                                                const Icon = getIcon(activeMember.avatar || 'user');
                                                return <Icon className="w-8 h-8 opacity-80" style={{ color: activeMember.color || "#6366f1" }} />
                                            })()}
                                        </div>
                                        <div className="flex gap-1">
                                            <Button size="sm" variant="outline" className="gap-1" onClick={() => openEditDialog(activeMember)} data-testid="button-edit-member">
                                                <Pencil className="w-3 h-3" /> Edit
                                            </Button>
                                            <Button size="sm" variant="outline" className="gap-1 text-destructive hover:bg-destructive/10" onClick={() => confirmDelete(activeMember)} data-testid="button-delete-member">
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-8">
                                {/* Traits */}
                                <div>
                                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Personality Traits</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {activeMember.traits?.map(trait => (
                                            <Badge key={trait} variant="outline" className="px-3 py-1 bg-background">
                                                {trait}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="p-4 rounded-xl bg-muted/20 border border-border/50">
                                        <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                                            <Activity className="w-3.5 h-3.5" /> Activity Level
                                        </div>
                                        <div className="text-2xl font-bold">{activeMember.stats?.activity ? `${activeMember.stats.activity}%` : "Await Data"}</div>
                                        <Progress value={activeMember.stats?.activity || 0} className="h-1 mt-2" style={{ color: activeMember.color || "#6366f1" }} />
                                    </div>
                                    <div className="p-4 rounded-xl bg-muted/20 border border-border/50">
                                        <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                                            <BrainCircuit className="w-3.5 h-3.5" /> Avg Stress
                                        </div>
                                        <div className="text-2xl font-bold">{activeMember.stats?.stress ? `${activeMember.stats.stress}/10` : "Await Data"}</div>
                                        <div className="flex gap-0.5 mt-2 h-1">
                                            {[...Array(10)].map((_, i) => (
                                                <div key={i} className={cn("flex-1 rounded-full", i < (activeMember.stats?.stress || 0) ? "bg-rose-500" : "bg-muted")} />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-xl bg-muted/20 border border-border/50">
                                        <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5" /> Last Front
                                        </div>
                                        <div className="text-lg font-bold text-muted-foreground">No Data</div>
                                    </div>
                                    <div className="p-4 rounded-xl bg-muted/20 border border-border/50">
                                        <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                                            <MapPin className="w-3.5 h-3.5" /> Usual Spot
                                        </div>
                                        <div className="text-lg font-bold capitalize">{activeMember.location || 'Unknown'}</div>
                                    </div>
                                </div>

                                {/* Journal/Notes Section Placeholder */}
                                <div className="bg-muted/10 rounded-xl p-6 border border-border/50 border-dashed">
                                    <h3 className="flex items-center gap-2 font-semibold mb-4">
                                        <FileText className="w-4 h-4 text-muted-foreground" />
                                        Recent Notes & Observations
                                    </h3>
                                    <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground/60">
                                        <p className="text-sm">No recent notes recorded for this member.</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        )}
                        {!activeMember && (
                            <div className="h-full flex flex-col items-center justify-center p-12 text-center text-muted-foreground bg-muted/10 rounded-xl border border-dashed">
                                <Users className="w-12 h-12 mb-4 opacity-20" />
                                <p>Select a member to view their profile</p>
                            </div>
                        )}
                    </div>
                </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
      
      {/* Add/Edit Member Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingMember ? "Edit Member" : "Add New Member"}</DialogTitle>
            <DialogDescription>
              {editingMember ? "Update this system member's information." : "Add a new member to your system directory."}
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
                  placeholder="Member name"
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
            <Button onClick={handleSave} disabled={createMember.isPending || updateMember.isPending} data-testid="button-save-member">
              {(createMember.isPending || updateMember.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingMember ? "Save Changes" : "Add Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{memberToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="button-confirm-delete">
              {deleteMember.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}