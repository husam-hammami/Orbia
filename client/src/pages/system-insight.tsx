import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
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
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SYSTEM_MEMBERS } from "@/lib/mock-data";
import { HeadspaceMap } from "@/components/headspace-map";

export default function SystemInsight() {
  const [members, setMembers] = useState(SYSTEM_MEMBERS);
  const [activeMember, setActiveMember] = useState(members[0]);

  // Keep activeMember up to date with member changes
  const updateActiveMember = (member: any) => {
      setActiveMember(member);
  }

  // Effect to ensure activeMember reflects current state if it was edited
  if (activeMember) {
      const current = members.find(m => m.id === activeMember.id);
      if (current && JSON.stringify(current) !== JSON.stringify(activeMember)) {
          setActiveMember(current);
      }
  }

  const getIcon = (avatar: string) => {
    switch(avatar) {
      case 'shield': return Shield;
      case 'ghost': return Ghost;
      case 'cpu': return Cpu;
      case 'eye': return Eye;
      default: return Users;
    }
  };

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

        <Tabs defaultValue="visualizer" className="space-y-6">
            <TabsList className="bg-muted/30 p-1 border border-border/40">
                 <TabsTrigger value="visualizer" className="gap-2"><LayoutTemplate className="w-4 h-4" /> Visual Headspace</TabsTrigger>
                <TabsTrigger value="directory" className="gap-2"><Users className="w-4 h-4" /> Directory</TabsTrigger>
            </TabsList>

            <TabsContent value="visualizer" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <HeadspaceMap members={members} setMembers={setMembers} />
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
                                            onClick={() => updateActiveMember(member)}
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
                                            )} style={{ backgroundColor: member.color + '20', borderColor: member.color + '40' }}>
                                                <Icon className="w-5 h-5" style={{ color: member.color }} />
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
                        {activeMember ? (
                        <Card className="border-t-4 shadow-md" style={{ borderTopColor: activeMember.color }}>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-3xl font-bold flex items-center gap-3">
                                            {activeMember.name}
                                            <Badge className="text-white border-0" style={{ backgroundColor: activeMember.color }}>
                                                {activeMember.role}
                                            </Badge>
                                        </CardTitle>
                                        <CardDescription className="mt-2 text-base">
                                            {activeMember.description}
                                        </CardDescription>
                                    </div>
                                    <div className="h-16 w-16 rounded-full flex items-center justify-center bg-muted border-2 border-border" style={{ borderColor: activeMember.color }}>
                                        {(() => {
                                            const Icon = getIcon(activeMember.avatar || 'user');
                                            return <Icon className="w-8 h-8 opacity-80" style={{ color: activeMember.color }} />
                                        })()}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-8">
                                {/* Traits */}
                                <div>
                                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Personality Traits</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {activeMember.traits.map(trait => (
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
                                        <div className="text-2xl font-bold">{activeMember.stats?.activity ? `${activeMember.stats.activity}%` : "--"}</div>
                                        <Progress value={activeMember.stats?.activity || 0} className="h-1 mt-2" style={{ color: activeMember.color }} />
                                    </div>
                                    <div className="p-4 rounded-xl bg-muted/20 border border-border/50">
                                        <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                                            <BrainCircuit className="w-3.5 h-3.5" /> Avg Stress
                                        </div>
                                        <div className="text-2xl font-bold">{activeMember.stats?.stress ? `${activeMember.stats.stress}/10` : "--"}</div>
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
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center p-12 text-center text-muted-foreground bg-muted/10 rounded-xl border border-dashed">
                                <Users className="w-12 h-12 mb-4 opacity-20" />
                                <p>Select a member to view their profile</p>
                            </div>
                        )}
                    </div>
                </div>
            </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}