import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pill, FileText,
  Trash2, Edit, ChevronDown,
  Send, User, Save,
  Clock, PlusCircle, Upload, CheckCircle2, Loader2,
  Database, Users, ShieldAlert, ArrowLeft, CalendarCheck, RotateCcw
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Layout } from "@/components/layout";
import { cn } from "@/lib/utils";
import logoUrl from '@assets/ChatGPT_Image_Jan_10,_2026,_05_13_01_PM_1768050787078.png';

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

const mono = { fontFamily: "'JetBrains Mono', monospace" } as const;
const hudPanel = "bg-card/40 backdrop-blur-xl border border-primary/15 shadow-sm rounded-2xl";
const hudPanelGlow = "bg-card/40 backdrop-blur-xl border border-primary/20 shadow-md rounded-2xl";

const severityStyles: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  critical: { bg: "bg-red-500/8", border: "border-red-500/25", text: "text-red-400", dot: "bg-red-400 shadow-[0_0_6px_rgba(255,100,100,0.5)]" },
  high: { bg: "bg-orange-500/8", border: "border-orange-500/25", text: "text-orange-400", dot: "bg-orange-400 shadow-[0_0_6px_rgba(255,165,0,0.5)]" },
  medium: { bg: "bg-primary/8", border: "border-primary/20", text: "text-primary", dot: "bg-primary glow-sm" },
  low: { bg: "bg-emerald-500/8", border: "border-emerald-500/20", text: "text-emerald-400", dot: "bg-emerald-400 shadow-[0_0_6px_rgba(0,200,100,0.5)]" },
};

function HudLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("text-[10px] uppercase tracking-[0.15em] text-primary/60", className)} style={mono}>
      {children}
    </span>
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
      <DialogContent className="max-w-md bg-card border-primary/20">
        <DialogHeader>
          <DialogTitle className="font-display">{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          {fields.map((field) => (
            <div key={field.key}>
              <HudLabel className="mb-1.5 block">{field.label}</HudLabel>
              {field.type === "textarea" ? (
                <textarea
                  className="w-full rounded-lg border border-primary/15 bg-muted/30 px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/30 text-foreground placeholder:text-muted-foreground/40"
                  placeholder={field.placeholder}
                  value={formData[field.key] || ""}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                />
              ) : field.type === "select-severity" ? (
                <select
                  className="w-full rounded-lg border border-primary/15 bg-muted/30 px-3 py-2 text-sm text-foreground"
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
                  className="rounded-lg border-primary/15 bg-muted/30 focus:ring-primary/30 focus:border-primary/30"
                  placeholder={field.placeholder}
                  value={formData[field.key] || ""}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                />
              )}
            </div>
          ))}
          <Button onClick={handleSave} className="w-full rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground" data-testid="button-save-medical-item">
            <Save className="w-4 h-4 mr-2" /> Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AccordionSection({ label, count, icon: Icon, isOpen, onToggle, onAdd, addFields, addTitle, children }: {
  label: string;
  count?: number;
  icon: any;
  isOpen: boolean;
  onToggle: () => void;
  onAdd?: { mutate: (data: any) => void };
  addFields?: { key: string; label: string; placeholder?: string; type?: string }[];
  addTitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(hudPanel, "overflow-hidden")}>
      <div className="flex items-center justify-between p-3.5 hover:bg-primary/5 transition-colors cursor-pointer" onClick={onToggle}>
        <div className="flex items-center gap-2.5">
          <Icon className="w-3.5 h-3.5 text-primary/70" />
          <span className="text-xs font-medium tracking-wide" style={mono}>{count !== undefined ? `${count} ` : ""}{label.toUpperCase()}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {onAdd && addFields && addTitle && (
            <AddItemDialog
              title={addTitle}
              fields={addFields}
              onSave={(data) => onAdd.mutate(data)}
              trigger={
                <button
                  className="p-1.5 hover:bg-primary/10 rounded-lg text-primary/40 hover:text-primary transition-colors"
                  onClick={(e) => e.stopPropagation()}
                  data-testid={`button-add-${addTitle.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                </button>
              }
            />
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-primary/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3.5 pb-3.5 flex flex-col gap-2">
              {children}
              {Array.isArray(children) && (children as any[]).length === 0 && (
                <div className="text-center py-6 text-muted-foreground/30 text-xs" style={mono}>NO DATA</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MyHealthPanel() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"health" | "history" | "care-team">("health");
  const [openSection, setOpenSection] = useState<string | null>("conditions");
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<Record<string, string>>({});

  const { data: profile = {} } = useQuery({ queryKey: ["/api/medical/profile"], queryFn: () => medApi("/api/medical/profile") });
  const { data: diagnoses = [] } = useQuery({ queryKey: ["/api/medical/diagnoses"], queryFn: () => medApi("/api/medical/diagnoses") });
  const { data: medications = [] } = useQuery({ queryKey: ["/api/medical/medications"], queryFn: () => medApi("/api/medical/medications") });
  const { data: timelineEvents = [] } = useQuery({ queryKey: ["/api/medical/timeline-events"], queryFn: () => medApi("/api/medical/timeline-events") });
  const { data: medicalNetwork = [] } = useQuery({ queryKey: ["/api/medical/medical-network"], queryFn: () => medApi("/api/medical/medical-network") });

  useEffect(() => {
    if (profile && Object.keys(profile).length > 0) setProfileForm(profile);
  }, [profile]);

  const profileMutation = useMutation({
    mutationFn: (data: Record<string, string>) => medApi("/api/medical/profile", { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/medical/profile"] }); setEditingProfile(false); },
  });

  const makeDel = (resource: string) => ({
    mutationFn: (id: number) => medApi(`/api/medical/${resource}/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/medical/${resource}`] }),
  });
  const makeAdd = (resource: string) => ({
    mutationFn: (data: Record<string, string>) => medApi(`/api/medical/${resource}`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/medical/${resource}`] }),
  });

  const delDiagnosis = useMutation(makeDel("diagnoses"));
  const delMedication = useMutation(makeDel("medications"));
  const delTimeline = useMutation(makeDel("timeline-events"));
  const delNetwork = useMutation(makeDel("medical-network"));

  const addDiagnosis = useMutation(makeAdd("diagnoses"));
  const addMedication = useMutation(makeAdd("medications"));
  const addTimeline = useMutation(makeAdd("timeline-events"));
  const addNetwork = useMutation(makeAdd("medical-network"));

  const toggleSection = (section: string) => setOpenSection(openSection === section ? null : section);

  const hasProfile = profile?.patientName;
  const profileAge = profile?.dateOfBirth ? (() => {
    const parts = profile.dateOfBirth.split(/[\/\-]/);
    const year = parts.length === 3 ? parseInt(parts[parts.length - 1].length === 4 ? parts[parts.length - 1] : parts[0]) : NaN;
    return !isNaN(year) ? `${new Date().getFullYear() - year}Y` : "";
  })() : "";

  return (
    <div className="flex flex-col gap-3 h-full min-h-0 pb-2">
      <div className={cn(hudPanelGlow, "p-5 shrink-0")}>
        {editingProfile ? (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between mb-2">
              <HudLabel>Edit Profile</HudLabel>
              <Button variant="ghost" size="sm" className="text-primary/60 hover:text-primary" onClick={() => setEditingProfile(false)}>
                <ArrowLeft className="w-3.5 h-3.5" />
              </Button>
            </div>
            {[
              { key: "patientName", label: "Full Name" },
              { key: "dateOfBirth", label: "Date of Birth" },
              { key: "sex", label: "Sex" },
              { key: "bloodType", label: "Blood Type" },
              { key: "allergies", label: "Allergies" },
              { key: "notes", label: "Notes" },
            ].map((f) => (
              <div key={f.key} className="flex items-center gap-2">
                <HudLabel className="w-24 shrink-0">{f.label}</HudLabel>
                <Input
                  className="h-8 text-sm rounded-lg border-primary/15 bg-muted/30"
                  value={profileForm[f.key] || ""}
                  onChange={(e) => setProfileForm({ ...profileForm, [f.key]: e.target.value })}
                />
              </div>
            ))}
            <Button size="sm" className="w-full rounded-lg mt-2 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => profileMutation.mutate(profileForm)} data-testid="button-save-profile">
              <Save className="w-3.5 h-3.5 mr-1" /> Save Profile
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-4">
              <div className="flex gap-4 items-center">
                <div className="w-14 h-14 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-center shrink-0 glow-sm">
                  <User className="w-7 h-7 text-primary/50" />
                </div>
                <div>
                  <h2 className="text-lg font-display font-bold tracking-tight leading-tight">
                    {hasProfile ? profile.patientName : "Set Up Profile"}
                  </h2>
                  <p className="text-xs text-primary/40 mt-0.5" style={mono}>
                    {hasProfile ? [profile.sex?.toUpperCase(), profileAge, profile.dateOfBirth ? `DOB: ${profile.dateOfBirth}` : null].filter(Boolean).join(" | ") : "Tap edit to add your information"}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-primary/40 hover:text-primary" onClick={() => setEditingProfile(true)} data-testid="button-edit-profile">
                <Edit className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: "Blood Type", value: profile?.bloodType || "—" },
                { label: "Medications", value: medications.length },
                { label: "Conditions", value: diagnoses.length },
              ].map((stat) => (
                <div key={stat.label} className="p-3 rounded-xl bg-muted/30 border border-primary/10">
                  <HudLabel className="mb-1 block">{stat.label}</HudLabel>
                  <div className="text-lg font-bold text-foreground">{stat.value}</div>
                </div>
              ))}
            </div>

            {profile?.allergies && (
              <div className="mt-3 p-2.5 bg-orange-500/5 border border-orange-500/20 rounded-xl">
                <HudLabel className="text-orange-400/60 mb-0.5 block">Allergies</HudLabel>
                <div className="text-xs text-foreground/70">{profile.allergies}</div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex gap-1.5 shrink-0">
        {(["health", "history", "care-team"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setOpenSection(tab === "health" ? "conditions" : tab === "history" ? "timeline" : "network"); }}
            className={cn(
              "flex-1 py-2 text-[10px] font-medium rounded-lg transition-all uppercase tracking-wider",
              activeTab === tab
                ? "bg-primary/15 text-primary border border-primary/30 glow-sm"
                : "bg-muted/20 text-muted-foreground/50 hover:text-primary/60 hover:bg-primary/5 border border-transparent"
            )}
            style={mono}
            data-testid={`tab-hud-${tab}`}
          >
            {tab === "care-team" ? "Care Team" : tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pr-1 pb-6 space-y-3">
        {activeTab === "health" && (
          <>
            <AccordionSection label="Conditions" count={diagnoses.length} icon={ShieldAlert} isOpen={openSection === "conditions"} onToggle={() => toggleSection("conditions")} onAdd={addDiagnosis} addTitle="Add Condition" addFields={[
              { key: "label", label: "Condition", placeholder: "e.g. Type 2 Diabetes" },
              { key: "description", label: "Details", placeholder: "How it affects you", type: "textarea" },
              { key: "severity", label: "Severity", type: "select-severity" },
            ]}>
              {diagnoses.map((d: any, idx: number) => {
                const s = severityStyles[d.severity] || severityStyles.medium;
                return (
                  <div key={d.id} className={`p-3 ${s.bg} border-l-2 ${s.border} border border-white/5 rounded-xl group/item relative`}>
                    <div className="absolute top-2 right-2 opacity-0 group-hover/item:opacity-100 transition-opacity">
                      <button className="p-1 hover:bg-red-500/10 rounded" onClick={() => delDiagnosis.mutate(d.id)}><Trash2 className="w-3 h-3 text-red-400/50" /></button>
                    </div>
                    <div className={`text-sm font-semibold mb-0.5 pr-6 ${s.text}`}>{idx + 1}. {d.label}</div>
                    <div className="text-xs text-muted-foreground/60">{d.description}</div>
                  </div>
                );
              })}
            </AccordionSection>

            <AccordionSection label="Medications" count={medications.length} icon={Pill} isOpen={openSection === "medications"} onToggle={() => toggleSection("medications")} onAdd={addMedication} addTitle="Add Medication" addFields={[
              { key: "name", label: "Medication", placeholder: "e.g. Metformin" },
              { key: "dosage", label: "Dosage", placeholder: "e.g. 500mg twice daily" },
              { key: "purpose", label: "Purpose", placeholder: "e.g. Blood sugar control" },
            ]}>
              {medications.map((m: any) => (
                <div key={m.id} className="p-3 bg-muted/20 border border-border/20 rounded-xl group/item relative">
                  <div className="absolute top-2 right-2 opacity-0 group-hover/item:opacity-100 transition-opacity">
                    <button className="p-1 hover:bg-red-500/10 rounded" onClick={() => delMedication.mutate(m.id)}><Trash2 className="w-3 h-3 text-red-400/50" /></button>
                  </div>
                  <div className="text-sm font-semibold mb-0.5">{m.name}</div>
                  <div className="text-xs text-primary/60 font-medium mb-0.5" style={mono}>{m.dosage}</div>
                  <div className="text-xs text-muted-foreground/60">{m.purpose}</div>
                </div>
              ))}
            </AccordionSection>
          </>
        )}

        {activeTab === "history" && (
          <AccordionSection label="Timeline" count={timelineEvents.length} icon={Clock} isOpen={openSection === "timeline"} onToggle={() => toggleSection("timeline")} onAdd={addTimeline} addTitle="Add Event" addFields={[
            { key: "date", label: "Date", placeholder: "e.g. Mar 8, 2026" },
            { key: "title", label: "Title", placeholder: "What happened" },
            { key: "description", label: "Details", placeholder: "More context", type: "textarea" },
            { key: "eventType", label: "Type", placeholder: "surgery / appointment / scan / diagnosis" },
          ]}>
            <div className="relative pl-5 border-l border-primary/20 space-y-4">
              {timelineEvents.map((event: any, idx: number) => (
                <div key={event.id} className="relative group/item" style={{ opacity: Math.max(0.4, 1 - idx * 0.1) }}>
                  <div className={cn(
                    "absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-card",
                    idx === 0 ? "bg-primary glow-sm" : "bg-muted-foreground/30"
                  )} />
                  <div className="flex items-start justify-between">
                    <div>
                      <HudLabel>{event.date}</HudLabel>
                      <div className="text-sm font-medium mt-0.5">{event.title}</div>
                      <div className="text-xs text-muted-foreground/60 mt-0.5">{event.description}</div>
                    </div>
                    <button className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-red-500/10 rounded transition-all" onClick={() => delTimeline.mutate(event.id)}>
                      <Trash2 className="w-3 h-3 text-red-400/50" />
                    </button>
                  </div>
                </div>
              ))}
              {timelineEvents.length === 0 && (
                <div className="text-center py-6 text-muted-foreground/30 text-xs" style={mono}>NO EVENTS RECORDED</div>
              )}
            </div>
          </AccordionSection>
        )}

        {activeTab === "care-team" && (
          <AccordionSection label="Care Team" count={medicalNetwork.length} icon={Users} isOpen={openSection === "network"} onToggle={() => toggleSection("network")} onAdd={addNetwork} addTitle="Add Provider" addFields={[
            { key: "name", label: "Name", placeholder: "e.g. Dr. Sarah Smith" },
            { key: "role", label: "Specialty", placeholder: "e.g. Cardiologist" },
            { key: "facility", label: "Facility", placeholder: "e.g. City Hospital" },
            { key: "status", label: "Status", placeholder: "current / past / referred" },
            { key: "category", label: "Category", placeholder: "treating / specialist / primary" },
          ]}>
            {medicalNetwork.map((doc: any) => (
              <div key={doc.id} className={cn(
                "p-3 rounded-xl flex justify-between items-center group/item relative border",
                doc.status === "current" ? "bg-primary/5 border-primary/15" : "bg-muted/20 border-border/20"
              )}>
                <div className="absolute top-2 right-2 opacity-0 group-hover/item:opacity-100 transition-opacity">
                  <button className="p-1 hover:bg-red-500/10 rounded" onClick={() => delNetwork.mutate(doc.id)}><Trash2 className="w-3 h-3 text-red-400/50" /></button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/15 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary/50" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{doc.name}</div>
                    <div className="text-xs text-muted-foreground/50">{doc.role}{doc.facility ? ` · ${doc.facility}` : ""}</div>
                  </div>
                </div>
                <span className={cn(
                  "text-[9px] font-medium px-2 py-0.5 rounded border uppercase tracking-wider",
                  doc.status === "current" ? "text-primary border-primary/30 bg-primary/10" : "text-muted-foreground/50 bg-muted/30 border-border/20"
                )} style={mono}>{doc.status}</span>
              </div>
            ))}
          </AccordionSection>
        )}
      </div>
    </div>
  );
}

function UploadZone() {
  const queryClient = useQueryClient();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "analyzing" | "done">("idle");
  const [result, setResult] = useState<any>(null);
  const [uploadFileName, setUploadFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    const maxSize = 15 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("File too large. Maximum 15MB.");
      return;
    }

    setUploadState("uploading");
    setUploadFileName(file.name);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      setUploadState("analyzing");

      try {
        const fullUrl = API_BASE_URL ? `${API_BASE_URL}/api/medical/upload` : "/api/medical/upload";
        const res = await fetch(fullUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            fileName: file.name,
            fileData: base64,
            mimeType: file.type || "application/octet-stream",
          }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error || "Upload failed");
        }
        const data = await res.json();
        setResult(data);
        setUploadState("done");

        queryClient.invalidateQueries({ queryKey: ["/api/medical/vault-documents"] });
        queryClient.invalidateQueries({ queryKey: ["/api/medical/diagnoses"] });
        queryClient.invalidateQueries({ queryKey: ["/api/medical/medications"] });
        queryClient.invalidateQueries({ queryKey: ["/api/medical/timeline-events"] });
        queryClient.invalidateQueries({ queryKey: ["/api/medical/priorities"] });

        setTimeout(() => {
          setUploadState("idle");
          setResult(null);
        }, 12000);
      } catch (err: any) {
        console.error("Upload error:", err);
        setUploadState("idle");
        alert(err.message || "Upload failed. Please try again.");
      }
    };
    reader.readAsDataURL(file);
  }, [queryClient]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [processFile]);

  if (uploadState === "done" && result) {
    const ac = result.autoCreated || {};
    const total = (ac.diagnoses || 0) + (ac.medications || 0) + (ac.timeline || 0) + (ac.priorities || 0);
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className={cn(hudPanel, "p-4")}>
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-medium text-emerald-400" style={mono}>ANALYSIS COMPLETE</span>
        </div>
        <p className="text-xs text-foreground/70 mb-3 leading-relaxed">{result.analysis}</p>
        {total > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {ac.diagnoses > 0 && <span className="text-[9px] px-2 py-0.5 rounded border border-primary/20 bg-primary/5 text-primary" style={mono}>{ac.diagnoses} condition{ac.diagnoses > 1 ? "s" : ""}</span>}
            {ac.medications > 0 && <span className="text-[9px] px-2 py-0.5 rounded border border-blue-500/20 bg-blue-500/5 text-blue-400" style={mono}>{ac.medications} medication{ac.medications > 1 ? "s" : ""}</span>}
            {ac.timeline > 0 && <span className="text-[9px] px-2 py-0.5 rounded border border-primary/20 bg-primary/5 text-primary" style={mono}>{ac.timeline} event{ac.timeline > 1 ? "s" : ""}</span>}
            {ac.priorities > 0 && <span className="text-[9px] px-2 py-0.5 rounded border border-orange-500/20 bg-orange-500/5 text-orange-400" style={mono}>{ac.priorities} action{ac.priorities > 1 ? "s" : ""}</span>}
          </div>
        )}
      </motion.div>
    );
  }

  if (uploadState === "uploading" || uploadState === "analyzing") {
    return (
      <div className={cn(hudPanel, "p-6 flex flex-col items-center justify-center gap-3")}>
        <div className="relative">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <div className="absolute inset-0 w-8 h-8 rounded-full bg-primary/5 animate-ping" />
        </div>
        <span className="text-xs text-primary/70" style={mono}>
          {uploadState === "uploading" ? "UPLOADING..." : "AI ANALYZING..."}
        </span>
        {uploadFileName && (
          <p className="text-[10px] text-foreground/50 text-center truncate max-w-full px-2">{uploadFileName}</p>
        )}
        <p className="text-[10px] text-muted-foreground/40 text-center leading-relaxed">
          {uploadState === "analyzing"
            ? "Reading document, extracting clinical data, and categorizing findings"
            : "Preparing document for analysis"}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        hudPanel, "p-4 transition-all cursor-pointer group",
        isDragging && "border-primary/40 bg-primary/5 glow-sm"
      )}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      data-testid="upload-zone"
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,.pdf,.txt,.csv,.doc,.docx"
        onChange={handleFileSelect}
      />
      <div className="flex flex-col items-center gap-2 py-2">
        <div className="w-10 h-10 rounded-xl bg-primary/5 border border-primary/15 flex items-center justify-center group-hover:border-primary/30 group-hover:bg-primary/10 transition-all">
          <Upload className="w-4 h-4 text-primary/50 group-hover:text-primary transition-colors" />
        </div>
        <div className="text-center">
          <p className="text-xs font-medium text-foreground/70">Upload medical document</p>
          <p className="text-[10px] text-muted-foreground/40 mt-0.5" style={mono}>
            Drop file or click — AI auto-categorizes
          </p>
        </div>
      </div>
    </div>
  );
}

function MedicalChatPanel() {
  const [messages, setMessages] = useState<{ role: string; content: string; isStreaming?: boolean }[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isProcessing]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage = input.trim();
    const newMessages = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setInput("");
    setIsProcessing(true);

    const chatHistory = newMessages.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
    setMessages(prev => [...prev, { role: "assistant", content: "", isStreaming: true }]);

    try {
      const fullUrl = API_BASE_URL ? `${API_BASE_URL}/api/medical/chat` : "/api/medical/chat";
      const response = await fetch(fullUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ messages: chatHistory }),
      });

      if (!response.ok) throw new Error("Chat request failed");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  accumulated += data.content;
                  setMessages(prev => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last.role === "assistant" && last.isStreaming) {
                      updated[updated.length - 1] = { ...last, content: accumulated };
                    }
                    return updated;
                  });
                }
                if (data.done) {
                  setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { ...updated[updated.length - 1], isStreaming: false };
                    return updated;
                  });
                }
              } catch {}
            }
          }
        }
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant" && last.isStreaming) {
          updated[updated.length - 1] = { role: "assistant", content: "I encountered an issue. Please try again." };
        }
        return updated;
      });
    } finally {
      setIsProcessing(false);
    }
  }, [input, messages, isProcessing]);

  return (
    <div className={cn(hudPanelGlow, "flex flex-col h-full overflow-hidden")}>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <img src={logoUrl} alt="Orbia" className="w-12 h-12 rounded-2xl object-cover opacity-20 mb-3" />
            <p className="text-sm text-muted-foreground/50 mb-1">Your health, understood.</p>
            <p className="text-xs text-muted-foreground/30 mb-5 max-w-[280px]">Ask anything about your conditions, medications, or care plan.</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {["What should I ask my doctor?", "Review my medications", "Summarize my health"].map((q) => (
                <button
                  key={q}
                  className="text-[11px] px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/15 text-primary/70 hover:bg-primary/10 hover:text-primary transition-colors"
                  style={mono}
                  onClick={() => setInput(q)}
                  data-testid={`chip-${q.slice(0, 15)}`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
          >
            <div className={cn(
              "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
              msg.role === "user"
                ? "bg-primary/80 text-primary-foreground glow-sm"
                : "bg-card/40 text-foreground border border-primary/10"
            )}>
              <p className="whitespace-pre-wrap">
                {msg.content}
                {msg.isStreaming && !msg.content && "..."}
                {msg.isStreaming && msg.content && <span className="inline-block w-1.5 h-4 bg-primary/60 ml-0.5 animate-pulse rounded-sm"></span>}
              </p>
            </div>
          </motion.div>
        ))}

        {isProcessing && !messages[messages.length - 1]?.isStreaming && (
          <div className="flex justify-start">
            <div className="bg-card/40 border border-primary/10 rounded-2xl px-4 py-3 flex items-center gap-2">
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                <div className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                <div className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-primary/10 shrink-0">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your health..."
            disabled={isProcessing}
            className="flex-1 rounded-lg border-primary/15 bg-muted/30 focus:ring-primary/20 focus:border-primary/30 placeholder:text-muted-foreground/30"
            data-testid="input-medical-chat"
          />
          <Button type="submit" size="icon" disabled={!input.trim() || isProcessing} className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 glow-sm" data-testid="button-send-medical-chat">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

function ActionItemsPanel() {
  const queryClient = useQueryClient();
  const { data: priorities = [] } = useQuery({ queryKey: ["/api/medical/priorities"], queryFn: () => medApi("/api/medical/priorities") });
  const { data: vaultDocuments = [] } = useQuery({ queryKey: ["/api/medical/vault-documents"], queryFn: () => medApi("/api/medical/vault-documents") });

  const delPriority = useMutation({
    mutationFn: (id: number) => medApi(`/api/medical/priorities/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/medical/priorities"] }),
  });
  const addPriority = useMutation({
    mutationFn: (data: Record<string, string>) => medApi("/api/medical/priorities", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/medical/priorities"] }),
  });
  const delVault = useMutation({
    mutationFn: (id: number) => medApi(`/api/medical/vault-documents/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/medical/vault-documents"] }),
  });

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      <UploadZone />

      <div className={cn(hudPanel, "p-4 flex-1 min-h-0 flex flex-col overflow-hidden")}>
        <div className="flex items-center justify-between mb-3 shrink-0">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-3.5 h-3.5 text-primary/70" />
            <HudLabel>Action Items</HudLabel>
            {priorities.length > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20" style={mono}>{priorities.length}</span>
            )}
          </div>
          <AddItemDialog
            title="Add Action Item"
            fields={[
              { key: "label", label: "What needs to happen?", placeholder: "e.g. Schedule follow-up MRI" },
              { key: "description", label: "Details", placeholder: "Any context", type: "textarea" },
              { key: "severity", label: "Urgency", type: "select-severity" },
            ]}
            onSave={(data) => addPriority.mutate(data)}
            trigger={
              <button className="p-1.5 hover:bg-primary/10 rounded-lg text-primary/40 hover:text-primary transition-colors" data-testid="button-add-action-item">
                <PlusCircle className="w-3.5 h-3.5" />
              </button>
            }
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {priorities.length === 0 && (
            <div className="text-center py-4 text-muted-foreground/30 text-xs" style={mono}>
              No action items — looking good
            </div>
          )}
          {priorities.map((p: any) => {
            const s = severityStyles[p.severity] || severityStyles.medium;
            return (
              <div key={p.id} className={`p-3 ${s.bg} border ${s.border} rounded-xl group/item relative`}>
                <div className="absolute top-2 right-2 opacity-0 group-hover/item:opacity-100 transition-opacity">
                  <button className="p-1 hover:bg-red-500/10 rounded" onClick={() => delPriority.mutate(p.id)}><Trash2 className="w-3 h-3 text-red-400/50" /></button>
                </div>
                <div className="flex items-center gap-2 mb-0.5">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`}></div>
                  <span className="text-xs font-medium">{p.label}</span>
                </div>
                {p.description && <div className="text-[11px] text-muted-foreground/50 pl-3.5">{p.description}</div>}
              </div>
            );
          })}
        </div>
      </div>

      <div className={cn(hudPanel, "p-4 shrink-0 max-h-[200px] overflow-hidden flex flex-col")}>
        <div className="flex items-center gap-2 mb-2 shrink-0">
          <Database className="w-3.5 h-3.5 text-primary/70" />
          <HudLabel>Documents</HudLabel>
          {vaultDocuments.length > 0 && (
            <span className="text-[9px] text-muted-foreground/40" style={mono}>{vaultDocuments.length}</span>
          )}
        </div>
        <div className="space-y-1.5 overflow-y-auto min-h-0">
          {vaultDocuments.length === 0 ? (
            <div className="text-center py-3 text-muted-foreground/30 text-xs" style={mono}>
              No documents yet — upload above
            </div>
          ) : (
            vaultDocuments.map((doc: any) => (
              <div key={doc.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/20 group/item">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-3 h-3 text-primary/40 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium truncate">{doc.name}</div>
                    <div className="text-[9px] text-muted-foreground/40" style={mono}>{doc.docType} · {doc.date}</div>
                  </div>
                </div>
                <button className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-red-500/10 rounded shrink-0 transition-opacity" onClick={() => delVault.mutate(doc.id)}>
                  <Trash2 className="w-2.5 h-2.5 text-red-400/50" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function MedicalPage() {
  const [mobileTab, setMobileTab] = useState<"health" | "chat" | "actions">("chat");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const queryClient = useQueryClient();

  const resetMutation = useMutation({
    mutationFn: () => medApi("/api/medical/reset", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/medical/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/medical/diagnoses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/medical/medications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/medical/priorities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/medical/timeline-events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/medical/medical-network"] });
      queryClient.invalidateQueries({ queryKey: ["/api/medical/vault-documents"] });
      setShowResetConfirm(false);
    },
  });

  return (
    <Layout>
      <div className="h-[calc(100vh-120px)] flex flex-col animate-in fade-in duration-500 relative">
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl -z-10">
          <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--primary)/0.015)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--primary)/0.015)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[40%] bg-primary/[0.02] blur-[100px] rounded-full"></div>
          <div className="absolute bottom-0 right-0 w-[40%] h-[30%] bg-accent/[0.02] blur-[80px] rounded-full"></div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-4"
        >
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Orbia" className="w-10 h-10 rounded-xl object-cover glow-sm" />
            <div>
              <h1 className="text-xl font-display font-bold tracking-[0.08em]">MEDICAL</h1>
              <p className="text-[10px] text-primary/40 tracking-wide" style={mono}>Health records & AI assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-1.5 text-[9px] text-red-400/50 hover:text-red-400 border border-red-500/15 hover:border-red-500/30 bg-muted/20 hover:bg-red-500/5 px-2.5 py-1.5 rounded-lg backdrop-blur-md tracking-widest transition-all"
              style={mono}
              data-testid="button-reset-medical"
            >
              <RotateCcw className="w-3 h-3" />
              RESET
            </button>
            <div className="hidden md:flex items-center gap-2 text-[9px] text-primary/50 border border-primary/15 bg-muted/20 px-3 py-1.5 rounded-lg backdrop-blur-md tracking-widest" style={mono}>
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse glow-sm"></div>
              SYSTEM NOMINAL
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          {showResetConfirm && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-3 p-4 bg-red-500/5 border border-red-500/20 rounded-xl backdrop-blur-xl"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-400">Reset all medical data?</p>
                  <p className="text-xs text-muted-foreground/50 mt-0.5">This will permanently delete your profile, conditions, medications, documents, and all records.</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowResetConfirm(false)}
                    className="text-xs text-muted-foreground/60 hover:text-foreground"
                    data-testid="button-cancel-reset"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => resetMutation.mutate()}
                    disabled={resetMutation.isPending}
                    className="text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg"
                    data-testid="button-confirm-reset"
                  >
                    {resetMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Trash2 className="w-3 h-3 mr-1" />}
                    Delete Everything
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="hidden md:flex flex-1 gap-3 min-h-0">
          <div className="w-[380px] shrink-0 min-h-0 overflow-hidden">
            <MyHealthPanel />
          </div>
          <div className="flex-1 min-h-0 min-w-[350px]">
            <MedicalChatPanel />
          </div>
          <div className="w-[280px] shrink-0 min-h-0 overflow-hidden">
            <ActionItemsPanel />
          </div>
        </div>

        <div className="flex md:hidden flex-col flex-1 min-h-0">
          <div className="flex gap-1.5 mb-3 shrink-0">
            {(["health", "chat", "actions"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setMobileTab(tab)}
                className={cn(
                  "flex-1 py-2 text-[10px] font-medium rounded-lg transition-all uppercase tracking-wider",
                  mobileTab === tab
                    ? "bg-primary/15 text-primary border border-primary/30 glow-sm"
                    : "bg-muted/20 text-muted-foreground/50 hover:text-primary/60 border border-transparent"
                )}
                style={mono}
              >
                {tab === "health" ? "My Health" : tab === "chat" ? "AI Chat" : "Actions"}
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            {mobileTab === "health" && (
              <div className="h-full overflow-y-auto pb-4">
                <MyHealthPanel />
              </div>
            )}
            {mobileTab === "chat" && <MedicalChatPanel />}
            {mobileTab === "actions" && (
              <div className="h-full overflow-y-auto pb-4">
                <ActionItemsPanel />
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
