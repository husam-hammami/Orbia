import { useState, useRef, useEffect, useCallback } from "react";
import {
  Stethoscope, HeartPulse, Pill, Calendar, Users, FileText,
  Plus, Trash2, Edit, ChevronDown, Activity,
  AlertTriangle, ShieldAlert, Send, User, Save,
  Clock, Brain, PlusCircle, BrainCircuit, Globe, Database,
  Target, ChevronRight, CheckCircle2, ArrowLeft
} from "lucide-react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || "";

function BackButton() {
  const [, setLocation] = useLocation();
  return (
    <button
      onClick={() => setLocation("/")}
      className="w-10 h-10 rounded-lg border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors"
      data-testid="button-back-medical"
    >
      <ArrowLeft className="w-4 h-4 text-white/60" />
    </button>
  );
}

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

const severityStyles: Record<string, { bg: string; border: string; text: string }> = {
  critical: { bg: "bg-red-500/5", border: "border-red-500/20", text: "text-red-400" },
  high: { bg: "bg-orange-500/5", border: "border-orange-500/20", text: "text-orange-400" },
  medium: { bg: "bg-blue-500/5", border: "border-blue-500/20", text: "text-blue-400" },
  low: { bg: "bg-green-500/5", border: "border-green-500/20", text: "text-green-400" },
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
      <DialogContent className="max-w-md bg-black/95 border border-white/10 backdrop-blur-xl text-white">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wider text-white/90">{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          {fields.map((field) => (
            <div key={field.key}>
              <label className="text-[10px] font-medium text-white/40 mb-1 block tracking-wider uppercase">{field.label}</label>
              {field.type === "textarea" ? (
                <textarea
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm resize-none h-20 text-white/90 focus:outline-none focus:border-primary/40"
                  placeholder={field.placeholder}
                  value={formData[field.key] || ""}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                />
              ) : field.type === "select-severity" ? (
                <select
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/90"
                  value={formData[field.key] || "medium"}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              ) : (
                <input
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/90 focus:outline-none focus:border-primary/40"
                  placeholder={field.placeholder}
                  value={formData[field.key] || ""}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                />
              )}
            </div>
          ))}
          <button
            onClick={handleSave}
            className="w-full py-2.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-lg text-sm font-medium transition-all"
            data-testid="button-save-medical-item"
          >
            <Save className="w-4 h-4 inline mr-2" /> Save
          </button>
        </div>
      </DialogContent>
    </Dialog>
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

  const deleteMutation = (resource: string) => ({
    mutationFn: (id: number) => medApi(`/api/medical/${resource}/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/medical/${resource}`] }),
  });

  const delDiagnosis = useMutation(deleteMutation("diagnoses"));
  const delPriority = useMutation(deleteMutation("priorities"));
  const delPainMechanism = useMutation(deleteMutation("pain-mechanisms"));
  const delMedication = useMutation(deleteMutation("medications"));
  const delTimeline = useMutation(deleteMutation("timeline-events"));
  const delNetwork = useMutation(deleteMutation("medical-network"));
  const delVault = useMutation(deleteMutation("vault-documents"));

  const createMutation = (resource: string) => ({
    mutationFn: (data: Record<string, string>) => medApi(`/api/medical/${resource}`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/medical/${resource}`] }),
  });

  const addDiagnosis = useMutation(createMutation("diagnoses"));
  const addPriority = useMutation(createMutation("priorities"));
  const addPainMechanism = useMutation(createMutation("pain-mechanisms"));
  const addMedication = useMutation(createMutation("medications"));
  const addTimeline = useMutation(createMutation("timeline-events"));
  const addNetwork = useMutation(createMutation("medical-network"));
  const addVault = useMutation(createMutation("vault-documents"));

  const toggleSection = (section: string) => setOpenSection(openSection === section ? null : section);

  const hasProfile = profile?.patientName;
  const statusSeverity = diagnoses.length > 0
    ? diagnoses.some((d: any) => d.severity === "critical") ? "critical" : diagnoses.some((d: any) => d.severity === "high") ? "high" : "monitoring"
    : "nominal";
  const statusColors: Record<string, string> = {
    critical: "text-red-400/80 bg-red-500/5 border-red-500/10",
    high: "text-orange-400/80 bg-orange-500/5 border-orange-500/10",
    monitoring: "text-blue-400/80 bg-blue-500/5 border-blue-500/10",
    nominal: "text-green-400/80 bg-green-500/5 border-green-500/10",
  };

  const profileAge = profile?.dateOfBirth ? (() => {
    const parts = profile.dateOfBirth.split(/[\/\-]/);
    const year = parts.length === 3 ? parseInt(parts[parts.length - 1].length === 4 ? parts[parts.length - 1] : parts[0]) : NaN;
    return !isNaN(year) ? `${new Date().getFullYear() - year}Y` : "";
  })() : "";

  return (
    <div className="flex flex-col gap-3 h-full min-h-0 pb-2">
      <div className="relative p-5 bg-black/60 border border-white/10 rounded-2xl shrink-0 backdrop-blur-xl">
        <div className="absolute top-0 right-0 p-3 flex gap-2 z-20">
          <button
            className="text-white/40 hover:text-white/70 transition-colors p-1.5 rounded"
            onClick={() => setEditingProfile(!editingProfile)}
            data-testid="button-edit-profile"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <div className={`text-[10px] font-medium px-2.5 py-1 border rounded tracking-widest uppercase ${statusColors[statusSeverity]}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            STATUS: {statusSeverity.toUpperCase()}
          </div>
        </div>

        {editingProfile ? (
          <div className="space-y-2 mt-2">
            {[
              { key: "patientName", label: "Full Name" },
              { key: "dateOfBirth", label: "Date of Birth" },
              { key: "sex", label: "Sex" },
              { key: "bloodType", label: "Blood Type" },
              { key: "allergies", label: "Allergies" },
              { key: "notes", label: "Notes" },
            ].map((f) => (
              <div key={f.key} className="flex items-center gap-2">
                <label className="text-[10px] text-white/40 w-20 shrink-0 tracking-wider uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{f.label}</label>
                <input
                  className="flex-1 h-8 text-sm bg-black/40 border border-white/10 rounded px-2 text-white/90 focus:outline-none focus:border-primary/40"
                  value={profileForm[f.key] || ""}
                  onChange={(e) => setProfileForm({ ...profileForm, [f.key]: e.target.value })}
                />
              </div>
            ))}
            <button
              className="w-full py-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-lg text-xs font-medium mt-2 transition-all"
              onClick={() => profileMutation.mutate(profileForm)}
              data-testid="button-save-profile"
            >
              <Save className="w-3.5 h-3.5 inline mr-1" /> Save Profile
            </button>
          </div>
        ) : (
          <>
            <div className="flex gap-5 items-center mb-5 mt-2 relative z-10">
              <div className="w-20 h-20 rounded-xl border border-white/15 overflow-hidden relative shrink-0 shadow-lg bg-primary/5 flex items-center justify-center">
                <User className="w-10 h-10 text-primary/40" />
              </div>
              <div>
                <div className="text-[10px] text-primary/60 font-medium mb-1 tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  MEDICAL PROFILE
                </div>
                <h2 className="text-2xl font-display font-bold text-white tracking-wider leading-none mb-2">
                  {hasProfile ? profile.patientName.toUpperCase() : "SET UP PROFILE"}
                </h2>
                <div className="text-sm text-white/50 font-medium">
                  {hasProfile ? [profile.sex?.toUpperCase(), profileAge, profile.dateOfBirth ? `DOB: ${profile.dateOfBirth}` : null].filter(Boolean).join(" | ") : "Tap edit to add your information"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center relative z-10">
              <div className="bg-black/40 border border-white/8 py-3 rounded-xl">
                <div className="text-[10px] text-white/40 mb-1 tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>BLOOD TYPE</div>
                <div className="text-xl font-bold text-white flex items-center justify-center gap-1.5">
                  <HeartPulse className="w-4 h-4 text-red-400/70" /> {profile?.bloodType || "—"}
                </div>
              </div>
              <div className="bg-black/40 border border-white/8 py-3 rounded-xl">
                <div className="text-[10px] text-white/40 mb-1 tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>MEDICATIONS</div>
                <div className="text-xl font-bold text-white"><Pill className="w-4 h-4 text-blue-400/70 inline mr-1" />{medications.length}</div>
              </div>
              <div className="bg-black/40 border border-white/8 py-3 rounded-xl">
                <div className="text-[10px] text-white/40 mb-1 tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>DIAGNOSES</div>
                <div className="text-xl font-bold text-white"><ShieldAlert className="w-4 h-4 text-primary/70 inline mr-1" />{diagnoses.length}</div>
              </div>
            </div>

            {profile?.allergies && (
              <div className="mt-3 p-2 bg-red-500/5 border border-red-500/10 rounded-lg">
                <div className="text-[10px] text-red-400/60 tracking-wider mb-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>ALLERGIES</div>
                <div className="text-xs text-white/60">{profile.allergies}</div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex gap-2 shrink-0 relative z-20">
        {(["overview", "history", "resources"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setOpenSection(tab === "overview" ? "diagnosis" : tab === "history" ? "timeline" : "network"); }}
            className={`flex-1 py-2.5 text-xs font-medium rounded-xl transition-all tracking-wider uppercase ${activeTab === tab ? "bg-primary/15 text-primary border border-primary/30" : "bg-white/3 text-white/50 hover:bg-white/5 border border-white/5 hover:text-white/70"}`}
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
            data-testid={`tab-hud-${tab}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pr-1 rounded-xl pb-6 relative z-10">
        <div className="flex flex-col gap-3">

          {activeTab === "overview" && (
            <>
              <AccordionSection
                label={`${priorities.length} PROACTIVE PRIORITIES`}
                icon={AlertTriangle}
                color="text-red-400/80"
                isOpen={openSection === "priorities"}
                onToggle={() => toggleSection("priorities")}
                onAdd={addPriority}
                addFields={[
                  { key: "label", label: "Priority", placeholder: "e.g. Follow-up MRI" },
                  { key: "description", label: "Description", placeholder: "Details", type: "textarea" },
                  { key: "severity", label: "Severity", type: "select-severity" },
                ]}
                addTitle="Add Priority"
              >
                {priorities.map((p: any) => {
                  const s = severityStyles[p.severity] || severityStyles.high;
                  return (
                    <div key={p.id} className={`p-3.5 ${s.bg} border ${s.border} rounded-lg text-white group/item relative transition-colors hover:bg-white/3`}>
                      <div className="absolute top-2 right-2 opacity-0 group-hover/item:opacity-100 transition-opacity flex gap-1">
                        <button className="p-1 hover:bg-red-500/10 rounded" onClick={() => delPriority.mutate(p.id)}><Trash2 className="w-3 h-3 text-red-400/60 hover:text-red-400" /></button>
                      </div>
                      <div className="flex items-center mb-1.5"><span className={`font-semibold ${s.text} text-sm`}>{p.label}</span></div>
                      <div className="text-sm text-white/60 leading-relaxed pr-8">{p.description}</div>
                    </div>
                  );
                })}
              </AccordionSection>

              <AccordionSection
                label={`${diagnoses.length} ACTIVE DIAGNOSES`}
                icon={ShieldAlert}
                color="text-primary/80"
                isOpen={openSection === "diagnosis"}
                onToggle={() => toggleSection("diagnosis")}
                onAdd={addDiagnosis}
                addFields={[
                  { key: "label", label: "Diagnosis", placeholder: "e.g. Hypertension" },
                  { key: "description", label: "Description", placeholder: "Details", type: "textarea" },
                  { key: "severity", label: "Severity", type: "select-severity" },
                ]}
                addTitle="Add Diagnosis"
              >
                {diagnoses.map((d: any, idx: number) => {
                  const s = severityStyles[d.severity] || severityStyles.high;
                  return (
                    <div key={d.id} className={`p-3.5 ${s.bg} border ${s.border} rounded-lg group/item relative transition-colors hover:bg-white/3`}>
                      <div className="absolute top-2 right-2 opacity-0 group-hover/item:opacity-100 transition-opacity flex gap-1">
                        <button className="p-1 hover:bg-red-500/10 rounded" onClick={() => delDiagnosis.mutate(d.id)}><Trash2 className="w-3 h-3 text-red-400/60 hover:text-red-400" /></button>
                      </div>
                      <div className={`font-semibold text-sm mb-1 pr-8 ${s.text}`}>{idx + 1}. {d.label}</div>
                      <div className="text-sm text-white/60 pr-8">{d.description}</div>
                    </div>
                  );
                })}
              </AccordionSection>

              <AccordionSection
                label={`${painMechanisms.length} PAIN MECHANISMS`}
                icon={Brain}
                color="text-orange-400/80"
                isOpen={openSection === "pain"}
                onToggle={() => toggleSection("pain")}
                onAdd={addPainMechanism}
                addFields={[
                  { key: "label", label: "Mechanism", placeholder: "e.g. Nerve compression" },
                  { key: "description", label: "Description", placeholder: "Details", type: "textarea" },
                ]}
                addTitle="Add Pain Mechanism"
              >
                {painMechanisms.map((pm: any, idx: number) => (
                  <div key={pm.id} className="p-3.5 bg-white/2 border border-white/8 rounded-lg group/item relative hover:bg-white/3 transition-colors">
                    <div className="absolute top-2 right-2 opacity-0 group-hover/item:opacity-100 transition-opacity flex gap-1">
                      <button className="p-1 hover:bg-red-500/10 rounded" onClick={() => delPainMechanism.mutate(pm.id)}><Trash2 className="w-3 h-3 text-red-400/60 hover:text-red-400" /></button>
                    </div>
                    <div className="font-semibold text-primary/80 text-sm mb-1">{idx + 1}: {pm.label}</div>
                    <div className="text-sm text-white/55">{pm.description}</div>
                  </div>
                ))}
              </AccordionSection>

              <AccordionSection
                label={`${medications.length} MEDICATIONS`}
                icon={Pill}
                color="text-blue-400/80"
                isOpen={openSection === "medications"}
                onToggle={() => toggleSection("medications")}
                onAdd={addMedication}
                addFields={[
                  { key: "name", label: "Medication", placeholder: "e.g. Metformin" },
                  { key: "dosage", label: "Dosage", placeholder: "e.g. 500mg twice daily" },
                  { key: "purpose", label: "Purpose", placeholder: "e.g. Blood sugar control" },
                ]}
                addTitle="Add Medication"
              >
                {medications.map((m: any) => (
                  <div key={m.id} className="p-3.5 bg-blue-500/5 border border-blue-500/15 rounded-lg group/item relative hover:bg-white/3 transition-colors">
                    <div className="absolute top-2 right-2 opacity-0 group-hover/item:opacity-100 transition-opacity flex gap-1">
                      <button className="p-1 hover:bg-red-500/10 rounded" onClick={() => delMedication.mutate(m.id)}><Trash2 className="w-3 h-3 text-red-400/60 hover:text-red-400" /></button>
                    </div>
                    <div className="font-semibold text-blue-400/80 text-sm mb-0.5">{m.name}</div>
                    <div className="text-xs text-primary/60 font-medium mb-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{m.dosage}</div>
                    <div className="text-sm text-white/50">{m.purpose}</div>
                  </div>
                ))}
              </AccordionSection>
            </>
          )}

          {activeTab === "history" && (
            <>
              <AccordionSection
                label="CLINICAL TIMELINE"
                icon={Clock}
                color="text-primary/80"
                isOpen={openSection === "timeline"}
                onToggle={() => toggleSection("timeline")}
                onAdd={addTimeline}
                addFields={[
                  { key: "date", label: "Date", placeholder: "e.g. Mar 8, 2026" },
                  { key: "title", label: "Title", placeholder: "Event title" },
                  { key: "description", label: "Description", placeholder: "Details", type: "textarea" },
                  { key: "eventType", label: "Type", placeholder: "surgery / appointment / scan / diagnosis" },
                ]}
                addTitle="Add Timeline Event"
              >
                <div className="flex flex-col gap-1 relative">
                  <div className="absolute left-[38px] top-4 bottom-4 w-px bg-white/10"></div>
                  {timelineEvents.map((event: any, idx: number) => (
                    <div key={event.id} className="flex items-start gap-4 mb-3 relative z-10 group/item py-1" style={{ opacity: Math.max(0.3, 1 - idx * 0.15) }}>
                      <div className="w-12 shrink-0 text-right text-xs font-medium text-primary/60 pt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{event.date}</div>
                      <div className={`w-3 h-3 rounded-full bg-black border-2 shrink-0 mt-1 ${idx === 0 ? "border-primary/60" : idx === 1 ? "border-red-400/50" : "border-white/15"}`}></div>
                      <div className="flex-1 pr-8">
                        <div className="text-sm font-medium text-white/90 mb-0.5">{event.title}</div>
                        <div className="text-xs text-white/45 leading-relaxed">{event.description}</div>
                      </div>
                      <div className="absolute right-0 top-0 opacity-0 group-hover/item:opacity-100 transition-opacity flex gap-1">
                        <button className="p-1 hover:bg-red-500/10 rounded" onClick={() => delTimeline.mutate(event.id)}><Trash2 className="w-3 h-3 text-red-400/60" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionSection>
            </>
          )}

          {activeTab === "resources" && (
            <>
              <AccordionSection
                label="MEDICAL NETWORK"
                icon={Stethoscope}
                color="text-blue-400/80"
                isOpen={openSection === "network"}
                onToggle={() => toggleSection("network")}
                onAdd={addNetwork}
                addFields={[
                  { key: "name", label: "Name", placeholder: "e.g. Dr. Sarah Smith" },
                  { key: "role", label: "Role / Specialty", placeholder: "e.g. Orthopedic Surgeon" },
                  { key: "facility", label: "Facility", placeholder: "e.g. City Hospital" },
                  { key: "status", label: "Status", placeholder: "current / past / referred" },
                  { key: "category", label: "Category", placeholder: "treating / specialist / primary" },
                ]}
                addTitle="Add Doctor"
              >
                {medicalNetwork.filter((doc: any) => doc.category === "treating" || doc.category === "specialist" || doc.category === "primary").map((doc: any) => (
                  <div key={doc.id} className={`${doc.status === "current" ? "bg-blue-500/5 border-blue-500/15" : "bg-white/2 border-white/8"} border p-4 rounded-lg flex justify-between items-center group/item relative`}>
                    <div className="absolute top-2 right-2 opacity-0 group-hover/item:opacity-100 transition-opacity flex gap-1">
                      <button className="p-1 hover:bg-red-500/10 rounded" onClick={() => delNetwork.mutate(doc.id)}><Trash2 className="w-3 h-3 text-red-400/60" /></button>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white/90 mb-0.5">{doc.name}</div>
                      <div className={`text-xs ${doc.status === "current" ? "text-blue-300/60" : "text-white/40"}`}>{doc.role}{doc.facility ? ` (${doc.facility})` : ""}</div>
                    </div>
                    <div className={`text-[10px] px-3 py-1.5 rounded font-medium ${doc.status === "current" ? "bg-blue-500/10 text-blue-400/80 border border-blue-500/20" : "bg-white/3 text-white/40 border border-white/8"}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>{doc.status?.toUpperCase()}</div>
                  </div>
                ))}
              </AccordionSection>

              <AccordionSection
                label="DOCUMENT VAULT"
                icon={Database}
                color="text-purple-400/80"
                isOpen={openSection === "vault"}
                onToggle={() => toggleSection("vault")}
                onAdd={addVault}
                addFields={[
                  { key: "name", label: "Document Name", placeholder: "e.g. MRI Report Feb 2026" },
                  { key: "docType", label: "Type", placeholder: "e.g. MRI Study / Lab Report / Prescription" },
                  { key: "date", label: "Date", placeholder: "e.g. Feb 21, 2026" },
                  { key: "description", label: "Description", placeholder: "Brief description" },
                ]}
                addTitle="Add Document"
              >
                {vaultDocuments.map((doc: any) => (
                  <div key={doc.id} className="bg-black/20 border border-white/5 rounded-xl p-3.5 flex items-start gap-3 hover:bg-white/3 transition-colors group/item relative">
                    <div className="absolute top-2 right-2 opacity-0 group-hover/item:opacity-100 transition-opacity flex gap-1">
                      <button className="p-1 hover:bg-red-500/10 rounded" onClick={() => delVault.mutate(doc.id)}><Trash2 className="w-3 h-3 text-red-400/60" /></button>
                    </div>
                    <div className="p-1.5 rounded-lg bg-purple-500/5 text-purple-400/60">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-white/70">{doc.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-primary/60 font-medium uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{doc.docType}</span>
                        <span className="text-[10px] text-white/35">{doc.date}</span>
                      </div>
                      {doc.description && <div className="text-[10px] text-white/35 mt-0.5">{doc.description}</div>}
                    </div>
                  </div>
                ))}
              </AccordionSection>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AccordionSection({ label, icon: Icon, color, isOpen, onToggle, onAdd, addFields, addTitle, children }: {
  label: string;
  icon: any;
  color: string;
  isOpen: boolean;
  onToggle: () => void;
  onAdd: { mutate: (data: any) => void };
  addFields: { key: string; label: string; placeholder?: string; type?: string }[];
  addTitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-white/8 rounded-xl overflow-hidden bg-black/40 shrink-0">
      <div className="w-full flex items-center justify-between p-4 hover:bg-white/3 transition-colors">
        <button onClick={onToggle} className={`flex items-center gap-2.5 text-sm font-medium ${color} tracking-wider flex-1 text-left focus:outline-none`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          <Icon className="w-4 h-4" /> {label}
        </button>
        <div className="flex items-center gap-1.5">
          <AddItemDialog
            title={addTitle}
            fields={addFields}
            onSave={(data) => onAdd.mutate(data)}
            trigger={
              <button className="p-1.5 hover:bg-white/5 rounded text-white/30 hover:text-white/60 transition-colors" data-testid={`button-add-${addTitle.toLowerCase().replace(/\s+/g, '-')}`}>
                <PlusCircle className="w-4 h-4" />
              </button>
            }
          />
          <ChevronDown className={`w-5 h-5 text-white/30 transition-transform cursor-pointer hover:text-white/60 ${isOpen ? 'rotate-180' : ''}`} onClick={onToggle} />
        </div>
      </div>

      {isOpen && (
        <div className="px-4 pb-4 flex flex-col gap-2">
          {children}
          {Array.isArray(children) && (children as any[]).length === 0 && (
            <div className="text-center py-6 text-white/20 text-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              No items yet. Click + to add.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MedicalChatPanel() {
  const [messages, setMessages] = useState<{ role: string; text: string; isStreaming?: boolean }[]>([
    { role: "system", text: "MEDICAL AI CORE ONLINE. SYNCHRONIZED WITH YOUR HEALTH PROFILE." },
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: profile } = useQuery({ queryKey: ["/api/medical/profile"], queryFn: () => medApi("/api/medical/profile") });

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isProcessing]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: "user", text: userMessage }]);
    setInput("");
    setIsProcessing(true);

    const chatHistory = messages
      .filter(m => m.role !== "system")
      .map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text }));
    chatHistory.push({ role: "user", content: userMessage });

    setMessages(prev => [...prev, { role: "ai", text: "", isStreaming: true }]);

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
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  accumulated += data.content;
                  setMessages(prev => {
                    const updated = [...prev];
                    const lastMsg = updated[updated.length - 1];
                    if (lastMsg.role === "ai" && lastMsg.isStreaming) {
                      updated[updated.length - 1] = { ...lastMsg, text: accumulated };
                    }
                    return updated;
                  });
                }
                if (data.done) {
                  setMessages(prev => {
                    const updated = [...prev];
                    const lastMsg = updated[updated.length - 1];
                    if (lastMsg.role === "ai") updated[updated.length - 1] = { ...lastMsg, isStreaming: false };
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
        const lastMsg = updated[updated.length - 1];
        if (lastMsg.role === "ai" && lastMsg.isStreaming) {
          updated[updated.length - 1] = { role: "ai", text: "I encountered an issue processing your request. Please try again.", isStreaming: false };
        }
        return updated;
      });
    } finally {
      setIsProcessing(false);
    }
  }, [input, messages, isProcessing]);

  const patientName = profile?.patientName?.split(" ")[0]?.toUpperCase() || "YOU";

  return (
    <div className="flex flex-col h-full bg-black/40 backdrop-blur-3xl border border-white/10 relative overflow-hidden rounded-2xl shadow-xl">
      <div className="absolute inset-0 rounded-2xl border border-white/3 pointer-events-none z-20"></div>

      <div className="pt-8 pb-5 px-6 border-b border-white/5 bg-gradient-to-b from-primary/3 to-transparent flex flex-col items-center justify-center relative overflow-hidden shrink-0">
        <div className="w-20 h-20 rounded-full bg-black border border-white/15 flex items-center justify-center relative z-10 mb-4 shadow-lg">
          <Stethoscope className="w-8 h-8 text-primary/60" />
          <div className="absolute inset-[-10px] border border-primary/15 rounded-full animate-[spin_8s_linear_infinite]" style={{ transform: "rotateX(60deg) rotateY(20deg)" }}></div>
          <div className="absolute inset-[-22px] border border-white/8 border-dashed rounded-full animate-[spin_12s_linear_infinite_reverse]" style={{ transform: "rotateX(70deg) rotateY(-20deg)" }}></div>
          <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
            <div className="w-full h-full bg-[conic-gradient(from_0deg,transparent_0%,transparent_80%,rgba(0,240,255,0.15)_100%)] animate-[spin_4s_linear_infinite]" style={{ mixBlendMode: "screen" }}></div>
          </div>
        </div>

        <h2 className="text-xl font-display font-bold text-white/90 tracking-[0.3em] z-10 text-center">MED CORE</h2>
        <div className="text-[9px] text-primary/60 font-medium z-10 flex items-center gap-1.5 mt-2 bg-primary/5 px-3 py-1 rounded border border-primary/15 uppercase tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          <Activity className="w-3 h-3" /> AI MEDICAL ASSISTANT
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 relative z-10 bg-gradient-to-b from-transparent to-black/60 min-h-0">
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
            {msg.role === "system" && (
              <div className="w-full text-center text-[9px] font-medium text-primary/40 my-3 tracking-[0.2em] border-y border-white/5 py-2.5 bg-white/2 rounded-lg" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                — {msg.text} —
              </div>
            )}

            {msg.role === "ai" && (
              <div className="text-[9px] font-medium text-primary/50 mb-1.5 ml-2 flex items-center gap-1.5 tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                <BrainCircuit className="w-3 h-3" /> MED CORE
              </div>
            )}

            {msg.role === "user" && (
              <div className="text-[9px] font-medium text-white/35 mb-1.5 mr-2 tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{patientName}</div>
            )}

            {msg.role !== "system" && (
              <div className={`max-w-[85%] p-4 text-sm leading-relaxed shadow-lg backdrop-blur-xl ${
                msg.role === "user"
                  ? "bg-primary/8 border border-primary/20 text-white/90 rounded-2xl rounded-tr-sm"
                  : "bg-black/50 border border-white/8 text-white/80 rounded-2xl rounded-tl-sm relative overflow-hidden"
              }`}>
                {msg.role === "ai" && <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-primary/40 to-transparent"></div>}
                <div className="relative z-10 whitespace-pre-wrap">
                  {msg.text}
                  {msg.isStreaming && <span className="inline-block w-2 h-4 bg-primary/80 ml-1 animate-pulse"></span>}
                </div>
              </div>
            )}
          </div>
        ))}

        {isProcessing && messages[messages.length - 1]?.role !== "ai" && (
          <div className="flex flex-col items-start">
            <div className="text-[9px] font-medium text-primary/40 mb-1.5 ml-2 flex items-center gap-1.5 tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              <BrainCircuit className="w-3 h-3" /> THINKING
            </div>
            <div className="p-4 bg-black/50 border border-white/8 rounded-2xl rounded-tl-sm flex items-center gap-3 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-primary/30 to-transparent"></div>
              <div className="flex space-x-1.5 ml-2">
                <div className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                <div className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                <div className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/8 bg-black/60 shrink-0 z-20 backdrop-blur-xl relative">
        <div className="relative flex items-center gap-2.5">
          <div className="relative flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask about your health..."
              disabled={isProcessing}
              className="w-full bg-black/40 border border-white/8 hover:border-white/15 rounded-xl pl-4 pr-12 py-3.5 text-sm text-white/90 focus:outline-none focus:border-primary/40 placeholder:text-white/25 transition-all disabled:opacity-50"
              data-testid="input-medical-chat"
            />
            <button
              onClick={handleSend}
              disabled={isProcessing}
              data-testid="button-send-medical-chat"
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all duration-300 ${
                input.trim() && !isProcessing
                  ? "bg-primary/80 text-black hover:bg-primary"
                  : "bg-white/3 text-white/20"
              }`}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RightPanel() {
  const { data: vaultDocuments = [] } = useQuery({ queryKey: ["/api/medical/vault-documents"], queryFn: () => medApi("/api/medical/vault-documents") });
  const { data: diagnoses = [] } = useQuery({ queryKey: ["/api/medical/diagnoses"], queryFn: () => medApi("/api/medical/diagnoses") });
  const { data: medications = [] } = useQuery({ queryKey: ["/api/medical/medications"], queryFn: () => medApi("/api/medical/medications") });

  const summaryItems = [
    ...(diagnoses.length > 0 ? [{ label: `${diagnoses.length} Active Diagnoses`, color: "text-primary/60", icon: ShieldAlert }] : []),
    ...(medications.length > 0 ? [{ label: `${medications.length} Active Medications`, color: "text-blue-400/60", icon: Pill }] : []),
    ...(vaultDocuments.length > 0 ? [{ label: `${vaultDocuments.length} Documents Stored`, color: "text-purple-400/60", icon: FileText }] : []),
  ];

  return (
    <div className="flex flex-col gap-6 h-full min-h-0">
      <div className="shrink-0 bg-black/80 backdrop-blur-xl border border-primary/30 rounded-2xl overflow-hidden relative shadow-[0_0_30px_rgba(0,0,0,0.5)] p-5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,240,255,0.03)_0%,transparent_70%)] pointer-events-none"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary/60" />
              <span className="text-sm font-display font-medium text-white/80 tracking-wider uppercase">HEALTH SUMMARY</span>
            </div>
            <div className="text-[9px] text-primary/40 border border-primary/15 px-2 py-1 rounded bg-primary/5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>LIVE</div>
          </div>

          {summaryItems.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="w-8 h-8 text-white/10 mx-auto mb-3" />
              <div className="text-xs text-white/25" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Add medical data to see your summary</div>
            </div>
          ) : (
            <div className="space-y-3">
              {summaryItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-black/30 rounded-xl border border-white/5">
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                  <span className="text-sm text-white/70">{item.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-black/40 rounded-xl border border-white/10 overflow-hidden relative backdrop-blur-xl flex flex-col">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none opacity-40"></div>

        <div className="p-4 border-b border-white/8 bg-black/40 shrink-0 relative z-10 backdrop-blur-md">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary/70" />
              <h2 className="text-sm font-display font-semibold text-white/90 tracking-wider uppercase">QUICK ACTIONS</h2>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 relative z-10 space-y-2.5">
          {[
            { label: "Review my medications", prompt: "Review my current medications and check for any interactions or concerns." },
            { label: "Summarize my conditions", prompt: "Give me a clear summary of my current diagnoses and what I should know about each." },
            { label: "Prepare for appointment", prompt: "Help me prepare questions and key points for my next doctor appointment." },
            { label: "Explain my diagnoses", prompt: "Explain my current diagnoses in simple terms. What do they mean day-to-day?" },
          ].map((action, idx) => (
            <button
              key={idx}
              className="w-full backdrop-blur-md border border-white/8 hover:border-white/15 bg-black/40 hover:bg-white/3 transition-all duration-300 rounded-xl overflow-hidden cursor-pointer p-3.5 text-left group/action"
              data-testid={`action-${action.label.slice(0, 20)}`}
            >
              <div className="flex gap-3 items-center">
                <div className="p-2 rounded-lg bg-white/3 text-white/40 group-hover/action:text-primary/60 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-semibold text-sm text-white/75 group-hover/action:text-white/90 leading-tight">{action.label}</h3>
                  <div className="text-[10px] text-white/30 mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>AI-POWERED</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MedicalPage() {
  return (
    <div className="fixed inset-0 bg-[#050914] text-white flex flex-col overflow-hidden z-50">
      <div className="fixed inset-0 bg-[#03060D] z-[-3]"></div>
      <div className="fixed inset-0 bg-[linear-gradient(rgba(0,240,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.015)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none z-[-2] opacity-60" style={{ mixBlendMode: "screen" }}></div>
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[70vh] bg-[radial-gradient(ellipse_at_center,rgba(0,240,255,0.03)_0%,transparent_60%)] pointer-events-none z-[-1] animate-[pulse_8s_ease-in-out_infinite]"></div>
      <div className="fixed top-[-5%] left-[10%] w-[40vw] h-[40vh] bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none z-[-1] animate-[pulse_10s_ease-in-out_infinite]"></div>
      <div className="fixed bottom-[-10%] right-[10%] w-[50vw] h-[50vh] bg-blue-600/5 blur-[150px] rounded-full pointer-events-none z-[-1] animate-[pulse_15s_ease-in-out_infinite]"></div>

      <div className="absolute top-0 left-0 w-full h-16 flex items-center justify-between px-6 z-50 pointer-events-none bg-gradient-to-b from-[#010205] to-transparent">
        <div className="flex items-center gap-4 pointer-events-auto">
          <BackButton />
          <div className="w-10 h-10 rounded-lg border border-primary/40 flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.3)] bg-black animate-[pulse_4s_ease-in-out_infinite]">
            <Stethoscope className="w-5 h-5 text-primary" />
          </div>
          <h1 className="font-display font-bold tracking-[0.3em] text-primary text-xl" style={{ textShadow: "0 0 15px rgba(0,240,255,0.6)" }}>
            MEDICAL<span className="text-white/90">.AI</span>
          </h1>
        </div>
        <div className="text-[10px] text-primary border border-primary/30 bg-primary/5 px-4 py-1.5 rounded flex items-center gap-2 backdrop-blur-md uppercase tracking-widest pointer-events-auto" style={{ fontFamily: "'JetBrains Mono', monospace", boxShadow: "0 0 15px rgba(0,240,255,0.2)" }}>
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></div>
          SYSTEM NOMINAL // HEALTH MONITOR ACTIVE
        </div>
      </div>

      <div className="hidden md:flex absolute inset-0 pt-20 pb-6 px-6 gap-6 z-10 h-full w-full box-border">
        <div className="w-[420px] h-full min-h-0 shrink-0 flex flex-col z-20 overflow-hidden">
          <PatientHud />
        </div>

        <div className="flex-1 h-full min-h-0 min-w-[400px] flex flex-col z-10 relative">
          <MedicalChatPanel />
        </div>

        <div className="w-[340px] h-full min-h-0 shrink-0 flex flex-col z-20">
          <RightPanel />
        </div>
      </div>

      <div className="flex md:hidden flex-col h-full pt-16 pb-20 overflow-hidden">
        <MobileView />
      </div>
    </div>
  );
}

function MobileView() {
  const [mobileTab, setMobileTab] = useState<"hud" | "chat" | "actions">("chat");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex gap-1 px-3 py-2 shrink-0">
        {(["hud", "chat", "actions"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all tracking-wider uppercase ${mobileTab === tab ? "bg-primary/15 text-primary border border-primary/30" : "bg-white/3 text-white/50 border border-white/5"}`}
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {tab === "hud" ? "PROFILE" : tab === "chat" ? "AI CHAT" : "SUMMARY"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden px-3 pb-3">
        {mobileTab === "hud" && (
          <div className="h-full overflow-y-auto">
            <PatientHud />
          </div>
        )}
        {mobileTab === "chat" && <MedicalChatPanel />}
        {mobileTab === "actions" && (
          <div className="h-full overflow-y-auto">
            <RightPanel />
          </div>
        )}
      </div>
    </div>
  );
}
