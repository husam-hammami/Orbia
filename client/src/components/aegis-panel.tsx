import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Power, MapPin, Clock, Calendar, ChevronDown,
  ChevronUp, Plus, Trash2, Save, AlertTriangle, CheckCircle2,
  XCircle, Loader2, Activity, Eye, EyeOff
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || "";

async function aegisApi(url: string, opts?: RequestInit) {
  const fullUrl = API_BASE_URL ? `${API_BASE_URL}${url}` : url;
  const res = await fetch(fullUrl, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...opts,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

const mono = { fontFamily: "'JetBrains Mono', monospace" } as const;
const cmdPanel = "bg-black/40 backdrop-blur-xl border border-indigo-500/15 shadow-[0_0_15px_rgba(100,80,255,0.04)] rounded-2xl";
const cmdPanelGlow = "bg-black/40 backdrop-blur-xl border border-indigo-500/20 shadow-[0_0_25px_rgba(100,80,255,0.08)] rounded-2xl";

function CmdLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("text-xs uppercase tracking-[0.15em] text-indigo-400/70", className)} style={mono}>
      {children}
    </span>
  );
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface AegisConfig {
  zoho_url: string;
  master_on: boolean;
  locations: Record<string, { lat: number; lng: number }>;
  check_in: ScheduleBlock;
  check_out: ScheduleBlock;
}

interface ScheduleBlock {
  start: string;
  end: string;
  schedule: Record<string, { enabled: boolean; loc: string }>;
}

// ── Status Card ──
function StatusCard({ config, status, onToggleMaster }: {
  config: AegisConfig;
  status: any;
  onToggleMaster: () => void;
}) {
  const today = status?.today;

  return (
    <div className={cn(cmdPanelGlow, "p-4 mb-4")}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-400" />
          <CmdLabel>Hercules Aegis</CmdLabel>
        </div>
        <button
          onClick={onToggleMaster}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
            config.master_on
              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/25"
              : "bg-zinc-500/15 text-zinc-400 border-zinc-500/25 hover:bg-zinc-500/25"
          )}
          style={mono}
        >
          <Power className="w-3 h-3" />
          {config.master_on ? "ACTIVE" : "PAUSED"}
        </button>
      </div>

      {/* Session status */}
      <div className="flex items-center gap-2 mb-3">
        <div className={cn(
          "w-1.5 h-1.5 rounded-full",
          status?.sessionValid
            ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]"
            : "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]"
        )} />
        <span className="text-xs text-muted-foreground">
          Zoho session: {status?.sessionValid ? "authenticated" : "needs login"}
        </span>
      </div>

      {/* Today's schedule summary */}
      {today && (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2.5 rounded-lg bg-black/30 border border-indigo-500/10">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="w-3 h-3 text-indigo-400/60" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider" style={mono}>Check-In</span>
            </div>
            {today.checkIn?.enabled ? (
              <>
                <p className="text-xs text-foreground" style={mono}>{today.checkIn.window}</p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="w-2.5 h-2.5" /> {today.checkIn.location}
                </p>
              </>
            ) : (
              <p className="text-xs text-zinc-500" style={mono}>disabled</p>
            )}
          </div>
          <div className="p-2.5 rounded-lg bg-black/30 border border-indigo-500/10">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="w-3 h-3 text-indigo-400/60" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider" style={mono}>Check-Out</span>
            </div>
            {today.checkOut?.enabled ? (
              <>
                <p className="text-xs text-foreground" style={mono}>{today.checkOut.window}</p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="w-2.5 h-2.5" /> {today.checkOut.location}
                </p>
              </>
            ) : (
              <p className="text-xs text-zinc-500" style={mono}>disabled</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Schedule Editor ──
function ScheduleEditor({ config, locationNames, onSave, isSaving }: {
  config: AegisConfig;
  locationNames: string[];
  onSave: (config: AegisConfig) => void;
  isSaving: boolean;
}) {
  const [draft, setDraft] = useState<AegisConfig>(config);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    setDraft(config);
  }, [config]);

  const hasChanges = JSON.stringify(draft) !== JSON.stringify(config);

  const updateSchedule = (type: "check_in" | "check_out", field: string, value: string) => {
    setDraft(prev => ({
      ...prev,
      [type]: { ...prev[type], [field]: value },
    }));
  };

  const toggleDay = (type: "check_in" | "check_out", dayIdx: string) => {
    setDraft(prev => {
      const existing = prev[type].schedule[dayIdx];
      return {
        ...prev,
        [type]: {
          ...prev[type],
          schedule: {
            ...prev[type].schedule,
            [dayIdx]: {
              loc: existing?.loc || locationNames[0] || "",
              enabled: !existing?.enabled,
            },
          },
        },
      };
    });
  };

  const setDayLocation = (type: "check_in" | "check_out", dayIdx: string, loc: string) => {
    setDraft(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        schedule: {
          ...prev[type].schedule,
          [dayIdx]: { ...prev[type].schedule[dayIdx], loc },
        },
      },
    }));
  };

  return (
    <div className={cn(cmdPanel, "p-4 mb-4")}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full mb-2"
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-400" />
          <CmdLabel>Schedule</CmdLabel>
        </div>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {(["check_in", "check_out"] as const).map((type) => (
              <div key={type} className="mb-4 last:mb-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground" style={mono}>
                    {type === "check_in" ? "Morning Check-In" : "Evening Check-Out"}
                  </span>
                </div>

                {/* Time window */}
                <div className="flex items-center gap-2 mb-2">
                  <Input
                    type="time"
                    value={draft[type].start}
                    onChange={(e) => updateSchedule(type, "start", e.target.value)}
                    className="w-24 h-7 text-xs bg-black/30 border-indigo-500/15"
                    style={mono}
                  />
                  <span className="text-xs text-muted-foreground">to</span>
                  <Input
                    type="time"
                    value={draft[type].end}
                    onChange={(e) => updateSchedule(type, "end", e.target.value)}
                    className="w-24 h-7 text-xs bg-black/30 border-indigo-500/15"
                    style={mono}
                  />
                </div>

                {/* Day toggles */}
                <div className="grid grid-cols-7 gap-1">
                  {DAY_LABELS.map((label, idx) => {
                    const dayKey = String(idx);
                    const day = draft[type].schedule[dayKey];
                    return (
                      <div key={dayKey} className="flex flex-col items-center gap-1">
                        <button
                          onClick={() => toggleDay(type, dayKey)}
                          className={cn(
                            "w-full py-1 rounded text-[10px] font-medium transition-all border",
                            day?.enabled
                              ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                              : "bg-black/20 text-zinc-500 border-zinc-700/30"
                          )}
                          style={mono}
                        >
                          {label}
                        </button>
                        {day?.enabled && locationNames.length > 1 && (
                          <select
                            value={day.loc}
                            onChange={(e) => setDayLocation(type, dayKey, e.target.value)}
                            className="w-full text-[9px] bg-black/30 border border-indigo-500/10 rounded px-0.5 py-0.5 text-muted-foreground"
                          >
                            {locationNames.map(name => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {hasChanges && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-indigo-500/10">
                <Button
                  size="sm"
                  onClick={() => onSave(draft)}
                  disabled={isSaving}
                  className="text-xs bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/25"
                >
                  {isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                  Save Schedule
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDraft(config)}
                  className="text-xs text-muted-foreground"
                >
                  Reset
                </Button>
                <div className="flex items-center gap-1 ml-auto">
                  <AlertTriangle className="w-3 h-3 text-amber-400/70" />
                  <span className="text-[10px] text-amber-400/70">Open Aegis Manager to sync tasks</span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Locations Panel ──
function LocationsPanel({ config, onSave, isSaving }: {
  config: AegisConfig;
  onSave: (config: AegisConfig) => void;
  isSaving: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLat, setNewLat] = useState("");
  const [newLng, setNewLng] = useState("");
  const [showCoords, setShowCoords] = useState(false);

  const locations = Object.entries(config.locations);

  const addLocation = () => {
    const lat = parseFloat(newLat);
    const lng = parseFloat(newLng);
    if (!newName.trim() || isNaN(lat) || isNaN(lng)) {
      toast.error("Name, latitude, and longitude are required");
      return;
    }
    onSave({
      ...config,
      locations: { ...config.locations, [newName.trim()]: { lat, lng } },
    });
    setNewName("");
    setNewLat("");
    setNewLng("");
  };

  const removeLocation = (name: string) => {
    const { [name]: _, ...rest } = config.locations;
    onSave({ ...config, locations: rest });
  };

  return (
    <div className={cn(cmdPanel, "p-4 mb-4")}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-indigo-400" />
          <CmdLabel>Locations</CmdLabel>
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400" style={mono}>
            {locations.length}
          </span>
        </div>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-3"
          >
            <div className="space-y-2 mb-3">
              {locations.map(([name, coords]) => (
                <div key={name} className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-indigo-500/10">
                  <div>
                    <p className="text-xs text-foreground font-medium">{name}</p>
                    {showCoords && (
                      <p className="text-[10px] text-muted-foreground" style={mono}>
                        {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLocation(name)}
                    className="h-6 w-6 p-0 text-zinc-500 hover:text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowCoords(!showCoords)}
              className="flex items-center gap-1 text-[10px] text-muted-foreground mb-3 hover:text-foreground transition-colors"
            >
              {showCoords ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
              {showCoords ? "Hide coordinates" : "Show coordinates"}
            </button>

            {/* Add location form */}
            <div className="flex gap-1.5">
              <Input
                placeholder="Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1 h-7 text-xs bg-black/30 border-indigo-500/15"
              />
              <Input
                placeholder="Lat"
                value={newLat}
                onChange={(e) => setNewLat(e.target.value)}
                className="w-20 h-7 text-xs bg-black/30 border-indigo-500/15"
                style={mono}
              />
              <Input
                placeholder="Lng"
                value={newLng}
                onChange={(e) => setNewLng(e.target.value)}
                className="w-20 h-7 text-xs bg-black/30 border-indigo-500/15"
                style={mono}
              />
              <Button
                size="sm"
                onClick={addLocation}
                disabled={isSaving}
                className="h-7 px-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/25"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Activity Log ──
function ActivityLog() {
  const [expanded, setExpanded] = useState(false);

  const { data } = useQuery({
    queryKey: ["/api/aegis/logs"],
    queryFn: () => aegisApi("/api/aegis/logs?count=30"),
    refetchInterval: 30000,
  });

  const lines: string[] = data?.lines || [];

  return (
    <div className={cn(cmdPanel, "p-4")}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-400" />
          <CmdLabel>Activity Log</CmdLabel>
        </div>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-3"
          >
            <div className="max-h-60 overflow-y-auto scrollbar-themed space-y-0.5">
              {lines.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No activity logs found</p>
              ) : (
                [...lines].reverse().map((line, i) => {
                  const isError = line.includes("[ERROR]");
                  const isSuccess = line.includes("Success") || line.includes("completed successfully");
                  return (
                    <div
                      key={i}
                      className={cn(
                        "text-[10px] px-2 py-1 rounded font-mono leading-relaxed",
                        isError ? "text-red-400/80 bg-red-500/5" :
                        isSuccess ? "text-emerald-400/80 bg-emerald-500/5" :
                        "text-muted-foreground"
                      )}
                      style={mono}
                    >
                      {line}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Panel ──
export default function AegisPanel() {
  const queryClient = useQueryClient();

  const { data: status, isLoading: loadingStatus } = useQuery({
    queryKey: ["/api/aegis/status"],
    queryFn: () => aegisApi("/api/aegis/status"),
    retry: false,
    refetchInterval: 60000,
  });

  const { data: config, isLoading: loadingConfig } = useQuery<AegisConfig>({
    queryKey: ["/api/aegis/config"],
    queryFn: () => aegisApi("/api/aegis/config"),
    enabled: status?.available === true,
  });

  const saveMutation = useMutation({
    mutationFn: (newConfig: AegisConfig) =>
      aegisApi("/api/aegis/config", {
        method: "PUT",
        body: JSON.stringify(newConfig),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/aegis/config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/aegis/status"] });
      toast.success("Aegis config saved");
    },
    onError: () => {
      toast.error("Failed to save config");
    },
  });

  const handleToggleMaster = useCallback(() => {
    if (!config) return;
    saveMutation.mutate({ ...config, master_on: !config.master_on });
  }, [config, saveMutation]);

  const handleSave = useCallback((newConfig: AegisConfig) => {
    saveMutation.mutate(newConfig);
  }, [saveMutation]);

  if (loadingStatus) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!status?.available) {
    return (
      <div className={cn(cmdPanel, "p-6 text-center")}>
        <Shield className="w-8 h-8 text-zinc-500 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground mb-1">Aegis not available</p>
        <p className="text-xs text-zinc-500">
          Install Hercules Aegis on this device to manage attendance automation
        </p>
      </div>
    );
  }

  if (loadingConfig || !config) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
      </div>
    );
  }

  const locationNames = Object.keys(config.locations);

  return (
    <div className="space-y-0">
      <StatusCard config={config} status={status} onToggleMaster={handleToggleMaster} />
      <ScheduleEditor config={config} locationNames={locationNames} onSave={handleSave} isSaving={saveMutation.isPending} />
      <LocationsPanel config={config} onSave={handleSave} isSaving={saveMutation.isPending} />
      <ActivityLog />
    </div>
  );
}
