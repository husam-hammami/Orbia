import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Stethoscope, HeartPulse, Pill, Calendar, Users, FileText,
  Plus, Trash2, Edit, ChevronDown, ChevronRight, Activity,
  AlertTriangle, ShieldCheck, Send, Bot, User, X, Save,
  Clock, Zap, Brain
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || "";

async function medApi(url: string, opts?: RequestInit) {
  const fullUrl = API_BASE_URL ? `${API_BASE_URL}${url}` : url;
  const res = await fetch(fullUrl, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...opts,
  });
  if (!res.ok && res.status !== 204) throw new Error(`API error: ${res.status}`);
  if (res.status === 204) return null;
  return res.json();
}

const glassCard = "bg-card/60 backdrop-blur-sm border border-border/50 rounded-2xl shadow-sm";

const severityColors: Record<string, string> = {
  critical: "text-red-500 bg-red-500/10 border-red-500/20",
  high: "text-orange-500 bg-orange-500/10 border-orange-500/20",
  medium: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  low: "text-green-500 bg-green-500/10 border-green-500/20",
};

function SeverityBadge({ severity }: { severity: string }) {
  const colors = severityColors[severity] || severityColors.medium;
  return (
    <span className={cn("text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border", colors)}>
      {severity}
    </span>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 text-muted-foreground/50" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="text-xs text-muted-foreground/60 mt-1">{description}</p>
    </div>
  );
}

function AddItemDialog({ title, fields, onSave, trigger }: {
  title: string;
  fields: { key: string; label: string; placeholder?: string; type?: string }[];
  onSave: (data: Record<string, string>) => void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});

  const handleSave = () => {
    onSave(formData);
    setFormData({});
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          {fields.map((field) => (
            <div key={field.key}>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{field.label}</label>
              {field.type === "textarea" ? (
                <textarea
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none h-20"
                  placeholder={field.placeholder}
                  value={formData[field.key] || ""}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                />
              ) : field.type === "select-severity" ? (
                <select
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={formData[field.key] || "medium"}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              ) : (
                <Input
                  placeholder={field.placeholder}
                  value={formData[field.key] || ""}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                />
              )}
            </div>
          ))}
          <Button onClick={handleSave} className="w-full" data-testid="button-save-medical-item">
            <Save className="w-4 h-4 mr-2" /> Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProfileSection() {
  const queryClient = useQueryClient();
  const { data: profile = {} } = useQuery({
    queryKey: ["/api/medical/profile"],
    queryFn: () => medApi("/api/medical/profile"),
  });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (profile && Object.keys(profile).length > 0) {
      setForm(profile);
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, string>) => medApi("/api/medical/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical/profile"] });
      setEditing(false);
    },
  });

  const fields = [
    { key: "patientName", label: "Full Name" },
    { key: "dateOfBirth", label: "Date of Birth" },
    { key: "sex", label: "Sex" },
    { key: "bloodType", label: "Blood Type" },
    { key: "allergies", label: "Allergies" },
    { key: "notes", label: "Notes" },
  ];

  return (
    <div className={cn(glassCard, "p-4")}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <User className="w-4 h-4 text-primary" /> Patient Profile
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setEditing(!editing)}
          data-testid="button-edit-profile"
        >
          <Edit className="w-3.5 h-3.5" />
        </Button>
      </div>

      {editing ? (
        <div className="space-y-2">
          {fields.map((f) => (
            <div key={f.key} className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground w-24 shrink-0">{f.label}</label>
              <Input
                className="h-8 text-sm"
                value={form[f.key] || ""}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              />
            </div>
          ))}
          <Button
            size="sm"
            className="w-full mt-2"
            onClick={() => saveMutation.mutate(form)}
            data-testid="button-save-profile"
          >
            <Save className="w-3.5 h-3.5 mr-1" /> Save Profile
          </Button>
        </div>
      ) : (
        <div className="space-y-1.5">
          {fields.map((f) => (
            <div key={f.key} className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground w-24 shrink-0 text-xs">{f.label}</span>
              <span className="font-medium">{(profile as any)?.[f.key] || "—"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CrudSection({ title, icon: Icon, resource, fields, renderItem }: {
  title: string;
  icon: any;
  resource: string;
  fields: { key: string; label: string; placeholder?: string; type?: string }[];
  renderItem: (item: any, onDelete: (id: number) => void) => React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const { data: items = [] } = useQuery({
    queryKey: [`/api/medical/${resource}`],
    queryFn: () => medApi(`/api/medical/${resource}`),
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, string>) => medApi(`/api/medical/${resource}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/medical/${resource}`] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => medApi(`/api/medical/${resource}/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/medical/${resource}`] }),
  });

  return (
    <div className={cn(glassCard, "p-4")}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" /> {title}
          <span className="text-xs text-muted-foreground font-normal">({items.length})</span>
        </h3>
        <AddItemDialog
          title={`Add ${title.replace(/s$/, "")}`}
          fields={fields}
          onSave={(data) => createMutation.mutate(data)}
          trigger={
            <Button variant="ghost" size="sm" data-testid={`button-add-${resource}`}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
          }
        />
      </div>

      {items.length === 0 ? (
        <EmptyState icon={Icon} title={`No ${title.toLowerCase()} yet`} description={`Add your first ${title.toLowerCase().replace(/s$/, "")}`} />
      ) : (
        <div className="space-y-2">
          {items.map((item: any) => renderItem(item, (id) => deleteMutation.mutate(id)))}
        </div>
      )}
    </div>
  );
}

function TimelineSection() {
  const queryClient = useQueryClient();
  const { data: events = [] } = useQuery({
    queryKey: ["/api/medical/timeline-events"],
    queryFn: () => medApi("/api/medical/timeline-events"),
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, string>) => medApi("/api/medical/timeline-events", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/medical/timeline-events"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => medApi(`/api/medical/timeline-events/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/medical/timeline-events"] }),
  });

  const eventTypeColors: Record<string, string> = {
    surgery: "bg-red-500",
    appointment: "bg-blue-500",
    scan: "bg-purple-500",
    diagnosis: "bg-orange-500",
    standard: "bg-primary",
  };

  return (
    <div className={cn(glassCard, "p-4")}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" /> Medical Timeline
          <span className="text-xs text-muted-foreground font-normal">({events.length})</span>
        </h3>
        <AddItemDialog
          title="Add Timeline Event"
          fields={[
            { key: "date", label: "Date", placeholder: "e.g. Mar 8, 2026" },
            { key: "title", label: "Title", placeholder: "Event title" },
            { key: "description", label: "Description", placeholder: "Details", type: "textarea" },
            { key: "eventType", label: "Type", placeholder: "surgery / appointment / scan / diagnosis" },
          ]}
          onSave={(data) => createMutation.mutate(data)}
          trigger={
            <Button variant="ghost" size="sm" data-testid="button-add-timeline">
              <Plus className="w-3.5 h-3.5" />
            </Button>
          }
        />
      </div>

      {events.length === 0 ? (
        <EmptyState icon={Calendar} title="No timeline events" description="Add medical events to track your history" />
      ) : (
        <div className="relative pl-5 border-l-2 border-border/50 space-y-4">
          {events.map((event: any) => (
            <div key={event.id} className="relative group">
              <div className={cn(
                "absolute -left-[23px] top-1.5 w-3 h-3 rounded-full border-2 border-background",
                eventTypeColors[event.eventType] || eventTypeColors.standard
              )} />
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{event.date}</div>
                  <div className="text-sm font-medium mt-0.5">{event.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{event.description}</div>
                </div>
                <button
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all"
                  onClick={() => deleteMutation.mutate(event.id)}
                  data-testid={`button-delete-timeline-${event.id}`}
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MedicalChat() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    try {
      const fullUrl = API_BASE_URL ? `${API_BASE_URL}/api/medical/chat` : "/api/medical/chat";
      const response = await fetch(fullUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ messages: newMessages }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      setMessages([...newMessages, { role: "assistant", content: "" }]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                assistantContent += data.content;
                setMessages((prev) => [
                  ...prev.slice(0, -1),
                  { role: "assistant", content: assistantContent },
                ]);
              }
            } catch {}
          }
        }
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setIsStreaming(false);
    }
  }, [input, messages, isStreaming]);

  return (
    <div className={cn(glassCard, "flex flex-col h-full")}>
      <div className="p-3 border-b border-border/50 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Bot className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Medical AI Assistant</h3>
          <p className="text-[10px] text-muted-foreground">Powered by your medical profile</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Bot className="w-10 h-10 text-primary/30 mb-3" />
            <p className="text-sm text-muted-foreground">Ask me about your health, medications, or conditions</p>
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {["What should I know about my medications?", "Summarize my conditions", "Help me prepare for my next appointment"].map((q) => (
                <button
                  key={q}
                  className="text-xs px-3 py-1.5 rounded-full bg-primary/5 border border-primary/20 text-primary hover:bg-primary/10 transition-colors"
                  onClick={() => { setInput(q); }}
                  data-testid={`chip-${q.slice(0, 20)}`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.role === "assistant" && (
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3 h-3 text-primary" />
              </div>
            )}
            <div className={cn(
              "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
              msg.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50"
            )}>
              <p className="whitespace-pre-wrap">{msg.content || (isStreaming ? "..." : "")}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-border/50">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your health..."
            disabled={isStreaming}
            className="flex-1"
            data-testid="input-medical-chat"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isStreaming}
            data-testid="button-send-medical-chat"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function MedicalPage() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-24 md:pb-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Stethoscope className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-display font-bold tracking-tight">Medical</h1>
          <p className="text-xs text-muted-foreground">Your health records and AI medical assistant</p>
        </div>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={cn(glassCard, "w-full grid grid-cols-4 p-0.5 h-auto")}>
          {[
            { value: "overview", label: "Overview", icon: HeartPulse },
            { value: "records", label: "Records", icon: FileText },
            { value: "network", label: "Network", icon: Users },
            { value: "assistant", label: "AI Chat", icon: Bot },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm py-2 text-xs md:text-sm rounded-lg transition-all"
              data-testid={`tab-medical-${tab.value}`}
            >
              <tab.icon className="w-3.5 h-3.5 mr-1.5" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ProfileSection />
            <TimelineSection />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CrudSection
              title="Diagnoses"
              icon={AlertTriangle}
              resource="diagnoses"
              fields={[
                { key: "label", label: "Diagnosis", placeholder: "e.g. Hypertension" },
                { key: "description", label: "Description", placeholder: "Details", type: "textarea" },
                { key: "severity", label: "Severity", type: "select-severity" },
              ]}
              renderItem={(item, onDelete) => (
                <div key={item.id} className="flex items-start justify-between p-3 bg-muted/30 rounded-xl group">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{item.label}</span>
                      <SeverityBadge severity={item.severity} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  </div>
                  <button
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all"
                    onClick={() => onDelete(item.id)}
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </button>
                </div>
              )}
            />

            <CrudSection
              title="Medications"
              icon={Pill}
              resource="medications"
              fields={[
                { key: "name", label: "Medication Name", placeholder: "e.g. Metformin" },
                { key: "dosage", label: "Dosage", placeholder: "e.g. 500mg twice daily" },
                { key: "purpose", label: "Purpose", placeholder: "e.g. Blood sugar control" },
              ]}
              renderItem={(item, onDelete) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl group">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{item.name}</span>
                      <span className="text-xs text-primary/70 font-semibold">{item.dosage}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.purpose}</p>
                  </div>
                  <button
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all"
                    onClick={() => onDelete(item.id)}
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </button>
                </div>
              )}
            />
          </div>
        </TabsContent>

        <TabsContent value="records" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CrudSection
              title="Medical Priorities"
              icon={Zap}
              resource="priorities"
              fields={[
                { key: "label", label: "Priority", placeholder: "e.g. Follow-up MRI" },
                { key: "description", label: "Description", placeholder: "Details", type: "textarea" },
                { key: "severity", label: "Severity", type: "select-severity" },
              ]}
              renderItem={(item, onDelete) => (
                <div key={item.id} className="flex items-start justify-between p-3 bg-muted/30 rounded-xl group">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{item.label}</span>
                      <SeverityBadge severity={item.severity} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  </div>
                  <button
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all"
                    onClick={() => onDelete(item.id)}
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </button>
                </div>
              )}
            />

            <CrudSection
              title="Pain Mechanisms"
              icon={Brain}
              resource="pain-mechanisms"
              fields={[
                { key: "label", label: "Mechanism", placeholder: "e.g. Nerve compression" },
                { key: "description", label: "Description", placeholder: "Details", type: "textarea" },
              ]}
              renderItem={(item, onDelete) => (
                <div key={item.id} className="flex items-start justify-between p-3 bg-muted/30 rounded-xl group">
                  <div className="flex-1">
                    <span className="text-sm font-medium">{item.label}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  </div>
                  <button
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all"
                    onClick={() => onDelete(item.id)}
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </button>
                </div>
              )}
            />
          </div>

          <CrudSection
            title="Vault Documents"
            icon={FileText}
            resource="vault-documents"
            fields={[
              { key: "name", label: "Document Name", placeholder: "e.g. MRI Report Feb 2026" },
              { key: "docType", label: "Type", placeholder: "e.g. MRI Study / Lab Report / Prescription" },
              { key: "date", label: "Date", placeholder: "e.g. Feb 21, 2026" },
              { key: "description", label: "Description", placeholder: "Brief description" },
            ]}
            renderItem={(item, onDelete) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl group">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-primary/60" />
                  <div>
                    <span className="text-sm font-medium">{item.name}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-primary/60 font-medium uppercase">{item.docType}</span>
                      <span className="text-[10px] text-muted-foreground">{item.date}</span>
                    </div>
                  </div>
                </div>
                <button
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all"
                  onClick={() => onDelete(item.id)}
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </button>
              </div>
            )}
          />
        </TabsContent>

        <TabsContent value="network" className="space-y-4 mt-4">
          <CrudSection
            title="Medical Network"
            icon={Users}
            resource="medical-network"
            fields={[
              { key: "name", label: "Name", placeholder: "e.g. Dr. Sarah Smith" },
              { key: "role", label: "Role / Specialty", placeholder: "e.g. Orthopedic Surgeon" },
              { key: "facility", label: "Facility", placeholder: "e.g. City Hospital" },
              { key: "status", label: "Status", placeholder: "current / past / referred" },
              { key: "category", label: "Category", placeholder: "treating / specialist / primary" },
            ]}
            renderItem={(item, onDelete) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <span className="text-sm font-medium">{item.name}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{item.role}</span>
                      {item.facility && (
                        <>
                          <span className="text-muted-foreground/30">|</span>
                          <span className="text-xs text-muted-foreground">{item.facility}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                    item.status === "current" ? "text-green-500 bg-green-500/10 border-green-500/20" : "text-muted-foreground bg-muted/50 border-border"
                  )}>
                    {item.status}
                  </span>
                  <button
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all"
                    onClick={() => onDelete(item.id)}
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </button>
                </div>
              </div>
            )}
          />
        </TabsContent>

        <TabsContent value="assistant" className="mt-4">
          <div className="h-[calc(100vh-240px)] md:h-[calc(100vh-200px)]">
            <MedicalChat />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
