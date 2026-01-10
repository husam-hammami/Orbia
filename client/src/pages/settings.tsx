import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Settings as SettingsIcon, 
  User, 
  Shield, 
  Database, 
  Download,
  Loader2,
  Check,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/queryClient";
import type { SystemSettings } from "@shared/schema";

export default function Settings() {
  const queryClient = useQueryClient();
  const [systemName, setSystemName] = useState("");
  const [privacyMode, setPrivacyMode] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { data: settings, isLoading } = useQuery<SystemSettings>({
    queryKey: ["/api/settings"],
  });

  useEffect(() => {
    if (settings) {
      setSystemName(settings.systemName || "My System");
      setPrivacyMode(settings.privacyMode === 1);
    }
  }, [settings]);

  const updateSettings = useMutation({
    mutationFn: async (data: Partial<SystemSettings>) => {
      const res = await apiRequest("PATCH", "/api/settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      setHasChanges(false);
      toast.success("Settings saved");
    },
    onError: () => {
      toast.error("Failed to save settings");
    }
  });

  const handleSave = () => {
    updateSettings.mutate({
      systemName,
      privacyMode: privacyMode ? 1 : 0,
    });
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/export");
      if (!response.ok) throw new Error("Export failed");
      
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orbia-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("Data exported successfully");
    } catch (error) {
      toast.error("Failed to export data");
    } finally {
      setIsExporting(false);
    }
  };

  const handleFieldChange = (setter: (val: any) => void, value: any) => {
    setter(value);
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500 pb-12 max-w-3xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/40 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="border-slate-500/30 text-slate-600 bg-slate-500/5 gap-1">
                <SettingsIcon className="w-3 h-3" /> Configuration
              </Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight">Settings</h1>
            <p className="text-muted-foreground text-lg">Customize your Orbia experience.</p>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || updateSettings.isPending}
            data-testid="button-save-settings"
          >
            {updateSettings.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : hasChanges ? null : (
              <Check className="w-4 h-4 mr-2" />
            )}
            {hasChanges ? "Save Changes" : "Saved"}
          </Button>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-500" />
                Profile
              </CardTitle>
              <CardDescription>
                Basic information about your setup.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="system-name">Display Name</Label>
                <Input 
                  id="system-name" 
                  value={systemName} 
                  onChange={(e) => handleFieldChange(setSystemName, e.target.value)} 
                  placeholder="e.g. My Wellness Tracker"
                  data-testid="input-system-name"
                />
                <p className="text-[0.8rem] text-muted-foreground">
                  This name appears on your dashboard.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-500" />
                Privacy
              </CardTitle>
              <CardDescription>
                Control how sensitive information is displayed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Discreet Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Use neutral labels and hide sensitive terminology when others might see your screen.
                  </p>
                </div>
                <Switch 
                  checked={privacyMode} 
                  onCheckedChange={(val) => handleFieldChange(setPrivacyMode, val)}
                  data-testid="switch-privacy-mode"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-500" />
                Data
              </CardTitle>
              <CardDescription>
                Export your data for backup or analysis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Exports all your habits, journal entries, tracker data, routines, and settings as a JSON file.
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={handleExport}
                disabled={isExporting}
                className="w-full sm:w-auto"
                data-testid="button-export-data"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                {isExporting ? "Exporting..." : "Export All Data"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-amber-200/50 bg-amber-50/30">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-amber-700">
                <Info className="w-5 h-5" />
                About Orbia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-amber-700/80">
                Orbia is your personal wellness and productivity companion. Track habits, monitor your wellbeing, 
                and gain insights into your daily patterns.
              </p>
              <p className="text-xs text-amber-600/60">
                Version 1.0 • Built with care
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
