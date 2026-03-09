import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Stethoscope, Pill, FileText,
  Trash2, Edit, ChevronDown, Activity,
  AlertTriangle, Send, User, Save,
  Clock, Brain, PlusCircle,
  Database, ChevronRight, Users, ShieldAlert, ArrowLeft
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

const card = "bg-card/80 backdrop-blur-xl border border-border/60 shadow-lg rounded-2xl";

const severityStyles: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  critical: { bg: "bg-red-500/5", border: "border-red-500/20", text: "text-red-400", dot: "bg-red-400" },
  high: { bg: "bg-orange-500/5", border: "border-orange-500/20", text: "text-orange-400", dot: "bg-orange-400" },
  medium: { bg: "bg-blue-500/5", border: "border-blue-500/20", text: "text-blue-400", dot: "bg-blue-400" },
  low: { bg: "bg-emerald-500/5", border: "border-emerald-500/20", text: "text-emerald-400", dot: "bg-emerald-400" },
};

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
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder={field.placeholder}
                  value={formData[field.key] || ""}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                />
              ) : field.type === "select-severity" ? (
                <select
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
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
                  className="rounded-xl"
                  placeholder={field.placeholder}
                  value={formData[field.key] || ""}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                />
              )}
            </div>
          ))}
          <Button onClick={handleSave} className="w-full rounded-xl" data-testid="button-save-medical-item">
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
  onAdd: { mutate: (data: any) => void };
  addFields: { key: string; label: string; placeholder?: string; type?: string }[];
  addTitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(card, "overflow-hidden")}>
      <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors cursor-pointer" onClick={onToggle}>
        <div className="flex items-center gap-2.5 text-sm font-medium">
          <Icon className="w-4 h-4 text-primary" />
          <span>{label}</span>
          {count !== undefined && (
            <span className="text-xs text-muted-foreground font-normal">({count})</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <AddItemDialog
            title={addTitle}
            fields={addFields}
            onSave={(data) => onAdd.mutate(data)}
            trigger={
              <button
                className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                onClick={(e) => e.stopPropagation()}
                data-testid={`button-add-${addTitle.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <PlusCircle className="w-4 h-4" />
              </button>
            }
          />
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
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
            <div className="px-4 pb-4 flex flex-col gap-2">
              {children}
              {Array.isArray(children) && (children as any[]).length === 0 && (
                <div className="text-center py-8 text-muted-foreground/50 text-sm">
                  No items yet
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PatientHud() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"overview" | "history" | "resources">("overview");
  const [openSection, setOpenSection] = useState<string | null>("diagnosis");
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<Record<string, string>>({});

  const { data: profile = {} } = useQuery({ queryKey: ["/api/medical/profile"], queryFn: () => medApi("/api/medical/profile") });
  const { data: diagnoses = [] } = useQuery({ queryKey: ["/api/medical/diagnoses"], queryFn: () => medApi("/api/medical/diagnoses") });
  const { data: priorities = [] } = useQuery({ queryKey: ["/api/medical/priorities"], queryFn: () => medApi("/api/medical/priorities") });
  const { data: painMechanisms = [] } = useQuery({ queryKey: ["/api/medical/pain-mechanisms"], queryFn: () => medApi("/api/medical/pain-mechanisms") });
  const { data: medications = [] } = useQuery({ queryKey: ["/api/medical/medications"], queryFn: () => medApi("/api/medical/medications") });
  const { data: timelineEvents = [] } = useQuery({ queryKey: ["/api/medical/timeline-events"], queryFn: () => medApi("/api/medical/timeline-events") });
  const { data: medicalNetwork = [] } = useQuery({ queryKey: ["/api/medical/medical-network"], queryFn: () => medApi("/api/medical/medical-network") });
  const { data: vaultDocuments = [] } = useQuery({ queryKey: ["/api/medical/vault-documents"], queryFn: () => medApi("/api/medical/vault-documents") });

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
  const delPriority = useMutation(makeDel("priorities"));
  const delPainMechanism = useMutation(makeDel("pain-mechanisms"));
  const delMedication = useMutation(makeDel("medications"));
  const delTimeline = useMutation(makeDel("timeline-events"));
  const delNetwork = useMutation(makeDel("medical-network"));
  const delVault = useMutation(makeDel("vault-documents"));

  const addDiagnosis = useMutation(makeAdd("diagnoses"));
  const addPriority = useMutation(makeAdd("priorities"));
  const addPainMechanism = useMutation(makeAdd("pain-mechanisms"));
  const addMedication = useMutation(makeAdd("medications"));
  const addTimeline = useMutation(makeAdd("timeline-events"));
  const addNetwork = useMutation(makeAdd("medical-network"));
  const addVault = useMutation(makeAdd("vault-documents"));

  const toggleSection = (section: string) => setOpenSection(openSection === section ? null : section);

  const hasProfile = profile?.patientName;
  const profileAge = profile?.dateOfBirth ? (() => {
    const parts = profile.dateOfBirth.split(/[\/\-]/);
    const year = parts.length === 3 ? parseInt(parts[parts.length - 1].length === 4 ? parts[parts.length - 1] : parts[0]) : NaN;
    return !isNaN(year) ? `${new Date().getFullYear() - year}Y` : "";
  })() : "";

  return (
    <div className="flex flex-col gap-3 h-full min-h-0 pb-2">
      <div className={cn(card, "p-5 shrink-0")}>
        {editingProfile ? (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Edit Profile</h3>
              <Button variant="ghost" size="sm" onClick={() => setEditingProfile(false)}>
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
                <label className="text-xs text-muted-foreground w-24 shrink-0">{f.label}</label>
                <Input
                  className="h-8 text-sm rounded-lg"
                  value={profileForm[f.key] || ""}
                  onChange={(e) => setProfileForm({ ...profileForm, [f.key]: e.target.value })}
                />
              </div>
            ))}
            <Button size="sm" className="w-full rounded-xl mt-2" onClick={() => profileMutation.mutate(profileForm)} data-testid="button-save-profile">
              <Save className="w-3.5 h-3.5 mr-1" /> Save Profile
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-4">
              <div className="flex gap-4 items-center">
                <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <User className="w-7 h-7 text-primary/60" />
                </div>
                <div>
                  <h2 className="text-lg font-display font-bold tracking-tight leading-tight">
                    {hasProfile ? profile.patientName : "Set Up Profile"}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {hasProfile ? [profile.sex, profileAge, profile.dateOfBirth ? `DOB: ${profile.dateOfBirth}` : null].filter(Boolean).join(" · ") : "Tap edit to add your information"}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setEditingProfile(true)} data-testid="button-edit-profile">
                <Edit className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
                <div className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wide">Blood Type</div>
                <div className="text-lg font-bold">{profile?.bloodType || "—"}</div>
              </div>
              <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
                <div className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wide">Medications</div>
                <div className="text-lg font-bold">{medications.length}</div>
              </div>
              <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
                <div className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wide">Diagnoses</div>
                <div className="text-lg font-bold">{diagnoses.length}</div>
              </div>
            </div>

            {profile?.allergies && (
              <div className="mt-3 p-2.5 bg-orange-500/5 border border-orange-500/15 rounded-xl">
                <div className="text-[10px] text-orange-400/70 uppercase tracking-wide mb-0.5">Allergies</div>
                <div className="text-xs text-foreground/70">{profile.allergies}</div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex gap-1.5 shrink-0">
        {(["overview", "history", "resources"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setOpenSection(tab === "overview" ? "diagnosis" : tab === "history" ? "timeline" : "network"); }}
            className={cn(
              "flex-1 py-2 text-xs font-medium rounded-xl transition-all capitalize",
              activeTab === tab
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/50 text-muted-foreground hover:bg-muted/80 border border-border/30"
            )}
            data-testid={`tab-hud-${tab}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pr-1 pb-6 space-y-3">
        {activeTab === "overview" && (
          <>
            <AccordionSection label="Priorities" count={priorities.length} icon={AlertTriangle} isOpen={openSection === "priorities"} onToggle={() => toggleSection("priorities")} onAdd={addPriority} addTitle="Add Priority" addFields={[
              { key: "label", label: "Priority", placeholder: "e.g. Follow-up MRI" },
              { key: "description", label: "Description", placeholder: "Details", type: "textarea" },
              { key: "severity", label: "Severity", type: "select-severity" },
            ]}>
              {priorities.map((p: any) => {
                const s = severityStyles[p.severity] || severityStyles.medium;
                return (
                  <div key={p.id} className={`p-3 ${s.bg} border ${s.border} rounded-xl group/item relative`}>
                    <div className="absolute top-2 right-2 opacity-0 group-hover/item:opacity-100 transition-opacity">
                      <button className="p-1 hover:bg-destructive/10 rounded" onClick={() => delPriority.mutate(p.id)}><Trash2 className="w-3 h-3 text-destructive/60" /></button>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`}></div>
                      <span className="text-sm font-medium">{p.label}</span>
                    </div>
                    <div className="text-xs text-muted-foreground pl-3.5">{p.description}</div>
                  </div>
                );
              })}
            </AccordionSection>

            <AccordionSection label="Diagnoses" count={diagnoses.length} icon={ShieldAlert} isOpen={openSection === "diagnosis"} onToggle={() => toggleSection("diagnosis")} onAdd={addDiagnosis} addTitle="Add Diagnosis" addFields={[
              { key: "label", label: "Diagnosis", placeholder: "e.g. Hypertension" },
              { key: "description", label: "Description", placeholder: "Details", type: "textarea" },
              { key: "severity", label: "Severity", type: "select-severity" },
            ]}>
              {diagnoses.map((d: any, idx: number) => {
                const s = severityStyles[d.severity] || severityStyles.medium;
                return (
                  <div key={d.id} className={`p-3 ${s.bg} border ${s.border} rounded-xl group/item relative`}>
                    <div className="absolute top-2 right-2 opacity-0 group-hover/item:opacity-100 transition-opacity">
                      <button className="p-1 hover:bg-destructive/10 rounded" onClick={() => delDiagnosis.mutate(d.id)}><Trash2 className="w-3 h-3 text-destructive/60" /></button>
                    </div>
                    <div className={`text-sm font-medium mb-0.5 pr-6 ${s.text}`}>{idx + 1}. {d.label}</div>
                    <div className="text-xs text-muted-foreground">{d.description}</div>
                  </div>
                );
              })}
            </AccordionSection>

            <AccordionSection label="Pain Mechanisms" count={painMechanisms.length} icon={Brain} isOpen={openSection === "pain"} onToggle={() => toggleSection("pain")} onAdd={addPainMechanism} addTitle="Add Pain Mechanism" addFields={[
              { key: "label", label: "Mechanism", placeholder: "e.g. Nerve compression" },
              { key: "description", label: "Description", placeholder: "Details", type: "textarea" },
            ]}>
              {painMechanisms.map((pm: any, idx: number) => (
                <div key={pm.id} className="p-3 bg-muted/20 border border-border/30 rounded-xl group/item relative">
                  <div className="absolute top-2 right-2 opacity-0 group-hover/item:opacity-100 transition-opacity">
                    <button className="p-1 hover:bg-destructive/10 rounded" onClick={() => delPainMechanism.mutate(pm.id)}><Trash2 className="w-3 h-3 text-destructive/60" /></button>
                  </div>
                  <div className="text-sm font-medium text-primary mb-0.5">{idx + 1}. {pm.label}</div>
                  <div className="text-xs text-muted-foreground">{pm.description}</div>
                </div>
              ))}
            </AccordionSection>

            <AccordionSection label="Medications" count={medications.length} icon={Pill} isOpen={openSection === "medications"} onToggle={() => toggleSection("medications")} onAdd={addMedication} addTitle="Add Medication" addFields={[
              { key: "name", label: "Medication", placeholder: "e.g. Metformin" },
              { key: "dosage", label: "Dosage", placeholder: "e.g. 500mg twice daily" },
              { key: "purpose", label: "Purpose", placeholder: "e.g. Blood sugar control" },
            ]}>
              {medications.map((m: any) => (
                <div key={m.id} className="p-3 bg-muted/20 border border-border/30 rounded-xl group/item relative">
                  <div className="absolute top-2 right-2 opacity-0 group-hover/item:opacity-100 transition-opacity">
                    <button className="p-1 hover:bg-destructive/10 rounded" onClick={() => delMedication.mutate(m.id)}><Trash2 className="w-3 h-3 text-destructive/60" /></button>
                  </div>
                  <div className="text-sm font-medium mb-0.5">{m.name}</div>
                  <div className="text-xs text-primary/70 font-medium mb-0.5">{m.dosage}</div>
                  <div className="text-xs text-muted-foreground">{m.purpose}</div>
                </div>
              ))}
            </AccordionSection>
          </>
        )}

        {activeTab === "history" && (
          <AccordionSection label="Clinical Timeline" count={timelineEvents.length} icon={Clock} isOpen={openSection === "timeline"} onToggle={() => toggleSection("timeline")} onAdd={addTimeline} addTitle="Add Timeline Event" addFields={[
            { key: "date", label: "Date", placeholder: "e.g. Mar 8, 2026" },
            { key: "title", label: "Title", placeholder: "Event title" },
            { key: "description", label: "Description", placeholder: "Details", type: "textarea" },
            { key: "eventType", label: "Type", placeholder: "surgery / appointment / scan / diagnosis" },
          ]}>
            <div className="relative pl-5 border-l-2 border-border/40 space-y-4">
              {timelineEvents.map((event: any, idx: number) => (
                <div key={event.id} className="relative group/item" style={{ opacity: Math.max(0.4, 1 - idx * 0.1) }}>
                  <div className={cn(
                    "absolute -left-[23px] top-1.5 w-3 h-3 rounded-full border-2 border-background",
                    idx === 0 ? "bg-primary" : "bg-muted-foreground/30"
                  )} />
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{event.date}</div>
                      <div className="text-sm font-medium mt-0.5">{event.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{event.description}</div>
                    </div>
                    <button className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all" onClick={() => delTimeline.mutate(event.id)}>
                      <Trash2 className="w-3 h-3 text-destructive/60" />
                    </button>
                  </div>
                </div>
              ))}
              {timelineEvents.length === 0 && (
                <div className="text-center py-6 text-muted-foreground/50 text-sm">No timeline events yet</div>
              )}
            </div>
          </AccordionSection>
        )}

        {activeTab === "resources" && (
          <>
            <AccordionSection label="Medical Network" count={medicalNetwork.length} icon={Users} isOpen={openSection === "network"} onToggle={() => toggleSection("network")} onAdd={addNetwork} addTitle="Add Doctor" addFields={[
              { key: "name", label: "Name", placeholder: "e.g. Dr. Sarah Smith" },
              { key: "role", label: "Role / Specialty", placeholder: "e.g. Orthopedic Surgeon" },
              { key: "facility", label: "Facility", placeholder: "e.g. City Hospital" },
              { key: "status", label: "Status", placeholder: "current / past / referred" },
              { key: "category", label: "Category", placeholder: "treating / specialist / primary" },
            ]}>
              {medicalNetwork.map((doc: any) => (
                <div key={doc.id} className={cn(
                  "p-3 rounded-xl flex justify-between items-center group/item relative border",
                  doc.status === "current" ? "bg-primary/5 border-primary/15" : "bg-muted/20 border-border/30"
                )}>
                  <div className="absolute top-2 right-2 opacity-0 group-hover/item:opacity-100 transition-opacity">
                    <button className="p-1 hover:bg-destructive/10 rounded" onClick={() => delNetwork.mutate(doc.id)}><Trash2 className="w-3 h-3 text-destructive/60" /></button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary/60" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{doc.name}</div>
                      <div className="text-xs text-muted-foreground">{doc.role}{doc.facility ? ` · ${doc.facility}` : ""}</div>
                    </div>
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium px-2 py-1 rounded-full capitalize",
                    doc.status === "current" ? "text-primary bg-primary/10" : "text-muted-foreground bg-muted/50"
                  )}>{doc.status}</span>
                </div>
              ))}
            </AccordionSection>

            <AccordionSection label="Document Vault" count={vaultDocuments.length} icon={Database} isOpen={openSection === "vault"} onToggle={() => toggleSection("vault")} onAdd={addVault} addTitle="Add Document" addFields={[
              { key: "name", label: "Document Name", placeholder: "e.g. MRI Report Feb 2026" },
              { key: "docType", label: "Type", placeholder: "e.g. MRI Study / Lab Report / Prescription" },
              { key: "date", label: "Date", placeholder: "e.g. Feb 21, 2026" },
              { key: "description", label: "Description", placeholder: "Brief description" },
            ]}>
              {vaultDocuments.map((doc: any) => (
                <div key={doc.id} className="p-3 bg-muted/20 border border-border/30 rounded-xl flex items-start gap-3 group/item relative">
                  <div className="absolute top-2 right-2 opacity-0 group-hover/item:opacity-100 transition-opacity">
                    <button className="p-1 hover:bg-destructive/10 rounded" onClick={() => delVault.mutate(doc.id)}><Trash2 className="w-3 h-3 text-destructive/60" /></button>
                  </div>
                  <div className="p-1.5 rounded-lg bg-primary/5 text-primary/60 mt-0.5">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{doc.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-primary/60 font-medium uppercase">{doc.docType}</span>
                      <span className="text-[10px] text-muted-foreground">{doc.date}</span>
                    </div>
                    {doc.description && <div className="text-xs text-muted-foreground mt-0.5">{doc.description}</div>}
                  </div>
                </div>
              ))}
            </AccordionSection>
          </>
        )}
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
    <div className={cn(card, "flex flex-col h-full overflow-hidden")}>
      <div className="pt-6 pb-4 px-6 border-b border-border/30 flex flex-col items-center justify-center shrink-0">
        <img src={logoUrl} alt="Orbia" className="w-14 h-14 rounded-2xl object-cover mb-3 shadow-lg shadow-primary/10" />
        <h2 className="text-lg font-display font-bold tracking-tight">Orbia Medical</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Your AI health assistant</p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <img src={logoUrl} alt="Orbia" className="w-12 h-12 rounded-2xl object-cover opacity-30 mb-3" />
            <p className="text-sm text-muted-foreground mb-4">Ask me about your health, medications, or conditions</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {["Review my medications", "Summarize my conditions", "Prepare for my appointment"].map((q) => (
                <button
                  key={q}
                  className="text-xs px-3 py-1.5 rounded-full bg-primary/5 border border-primary/20 text-primary hover:bg-primary/10 transition-colors"
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
              "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
              msg.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/80 text-foreground border border-border/50"
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
            <div className="bg-muted/80 border border-border/50 rounded-2xl px-4 py-3 flex items-center gap-2">
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                <div className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                <div className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border/30 shrink-0">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your health..."
            disabled={isProcessing}
            className="flex-1 rounded-xl"
            data-testid="input-medical-chat"
          />
          <Button type="submit" size="icon" disabled={!input.trim() || isProcessing} className="rounded-xl shrink-0" data-testid="button-send-medical-chat">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

function SummaryPanel() {
  const { data: diagnoses = [] } = useQuery({ queryKey: ["/api/medical/diagnoses"], queryFn: () => medApi("/api/medical/diagnoses") });
  const { data: medications = [] } = useQuery({ queryKey: ["/api/medical/medications"], queryFn: () => medApi("/api/medical/medications") });
  const { data: vaultDocuments = [] } = useQuery({ queryKey: ["/api/medical/vault-documents"], queryFn: () => medApi("/api/medical/vault-documents") });
  const { data: priorities = [] } = useQuery({ queryKey: ["/api/medical/priorities"], queryFn: () => medApi("/api/medical/priorities") });
  const { data: medicalNetwork = [] } = useQuery({ queryKey: ["/api/medical/medical-network"], queryFn: () => medApi("/api/medical/medical-network") });

  const stats = [
    { label: "Diagnoses", value: diagnoses.length, icon: ShieldAlert, color: "text-primary" },
    { label: "Medications", value: medications.length, icon: Pill, color: "text-blue-400" },
    { label: "Priorities", value: priorities.length, icon: AlertTriangle, color: "text-orange-400" },
    { label: "Documents", value: vaultDocuments.length, icon: FileText, color: "text-purple-400" },
    { label: "Providers", value: medicalNetwork.length, icon: Users, color: "text-emerald-400" },
  ];

  return (
    <div className="flex flex-col gap-4 h-full min-h-0">
      <div className={cn(card, "p-5 shrink-0")}>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Health Overview</span>
        </div>

        <div className="space-y-2">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/20 border border-border/20">
              <div className="flex items-center gap-2.5">
                <stat.icon className={cn("w-4 h-4", stat.color)} />
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
              <span className="text-sm font-bold">{stat.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={cn(card, "p-5 flex-1 min-h-0 flex flex-col")}>
        <div className="flex items-center gap-2 mb-4">
          <Stethoscope className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Quick Prompts</span>
        </div>

        <div className="space-y-2 flex-1 overflow-y-auto">
          {[
            { label: "Review my medications", desc: "Check interactions and schedule" },
            { label: "Summarize conditions", desc: "Get a clear health overview" },
            { label: "Appointment prep", desc: "Prepare questions for your doctor" },
            { label: "Explain my diagnoses", desc: "Simple terms, day-to-day impact" },
          ].map((action, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-muted/20 border border-border/20 hover:bg-muted/40 transition-colors cursor-pointer group"
              data-testid={`action-${action.label.slice(0, 15)}`}
            >
              <div className="flex items-center gap-3">
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                <div>
                  <div className="text-sm font-medium">{action.label}</div>
                  <div className="text-[10px] text-muted-foreground">{action.desc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MedicalPage() {
  const [mobileTab, setMobileTab] = useState<"profile" | "chat" | "summary">("chat");

  return (
    <Layout>
      <div className="h-[calc(100vh-120px)] flex flex-col animate-in fade-in duration-500">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-4"
        >
          <img src={logoUrl} alt="Orbia" className="w-10 h-10 rounded-xl object-cover shadow-lg shadow-primary/30" />
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight">Medical</h1>
            <p className="text-xs text-muted-foreground">Your health records and AI assistant</p>
          </div>
        </motion.div>

        <div className="hidden md:flex flex-1 gap-4 min-h-0">
          <div className="w-[380px] shrink-0 min-h-0 overflow-hidden">
            <PatientHud />
          </div>
          <div className="flex-1 min-h-0 min-w-[350px]">
            <MedicalChatPanel />
          </div>
          <div className="w-[280px] shrink-0 min-h-0 overflow-hidden">
            <SummaryPanel />
          </div>
        </div>

        <div className="flex md:hidden flex-col flex-1 min-h-0">
          <div className="flex gap-1.5 mb-3 shrink-0">
            {(["profile", "chat", "summary"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setMobileTab(tab)}
                className={cn(
                  "flex-1 py-2 text-xs font-medium rounded-xl transition-all capitalize",
                  mobileTab === tab
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted/80 border border-border/30"
                )}
              >
                {tab === "profile" ? "Profile" : tab === "chat" ? "AI Chat" : "Summary"}
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            {mobileTab === "profile" && (
              <div className="h-full overflow-y-auto pb-4">
                <PatientHud />
              </div>
            )}
            {mobileTab === "chat" && <MedicalChatPanel />}
            {mobileTab === "summary" && (
              <div className="h-full overflow-y-auto pb-4">
                <SummaryPanel />
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
