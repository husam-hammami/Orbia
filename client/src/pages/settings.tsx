import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Info,
  Palette,
  Moon,
  Sun
} from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/queryClient";
import type { SystemSettings } from "@shared/schema";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

export default function Settings() {
  const queryClient = useQueryClient();
  const [systemName, setSystemName] = useState("");
  const [privacyMode, setPrivacyMode] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [hasProfileChanges, setHasProfileChanges] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { themeId, themes, isDark, setTheme, toggleDarkMode } = useTheme();

  const { data: settings, isLoading } = useQuery<SystemSettings>({
    queryKey: ["/api/settings"],
  });

  const { data: profile, isLoading: profileLoading } = useQuery<{ displayName: string | null; bio: string | null }>({
    queryKey: ["/api/user/profile"],
    queryFn: async () => {
      const res = await fetch("/api/user/profile");
      return res.json();
    }
  });

  useEffect(() => {
    if (settings) {
      setSystemName(settings.systemName || "My System");
      setPrivacyMode(settings.privacyMode === 1);
    }
  }, [settings]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || "");
      setBio(profile.bio || "");
    }
  }, [profile]);

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

  const updateProfile = useMutation({
    mutationFn: async (data: { displayName?: string; bio?: string }) => {
      const res = await apiRequest("PATCH", "/api/user/profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      setHasProfileChanges(false);
      toast.success("Profile saved");
    },
    onError: () => {
      toast.error("Failed to save profile");
    }
  });

  const handleSave = () => {
    updateSettings.mutate({
      systemName,
      privacyMode: privacyMode ? 1 : 0,
    });
  };

  const handleProfileSave = () => {
    updateProfile.mutate({ displayName, bio });
  };

  const handleProfileFieldChange = (setter: (val: string) => void, value: string) => {
    setter(value);
    setHasProfileChanges(true);
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
              <Badge variant="outline" className="border-border text-muted-foreground bg-muted/50 gap-1">
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="w-5 h-5 text-[hsl(var(--chart-4))]" />
                    Your Profile
                  </CardTitle>
                  <CardDescription>
                    Tell Orbia about yourself so it can personalize your experience.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={handleProfileSave}
                  disabled={!hasProfileChanges || updateProfile.isPending}
                  data-testid="button-save-profile"
                >
                  {updateProfile.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : !hasProfileChanges ? (
                    <Check className="w-4 h-4 mr-2" />
                  ) : null}
                  {hasProfileChanges ? "Save" : "Saved"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="display-name">Your Name</Label>
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(e) => handleProfileFieldChange(setDisplayName, e.target.value)}
                  placeholder="What should Orbia call you?"
                  maxLength={100}
                  data-testid="input-display-name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="user-bio">About You</Label>
                <Textarea
                  id="user-bio"
                  value={bio}
                  onChange={(e) => handleProfileFieldChange(setBio, e.target.value)}
                  placeholder="Tell Orbia a bit about yourself — your background, interests, how you like to be supported..."
                  maxLength={500}
                  rows={3}
                  className="resize-none"
                  data-testid="input-user-bio"
                />
                <p className="text-[0.8rem] text-muted-foreground">
                  {bio.length}/500 — This helps Orbia understand you better and tailor its responses.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <SettingsIcon className="w-5 h-5 text-muted-foreground" />
                System
              </CardTitle>
              <CardDescription>
                Basic information about your setup.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="system-name">System Display Name</Label>
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
                <Palette className="w-5 h-5 text-primary" />
                Theme & Mood
              </CardTitle>
              <CardDescription>
                Choose a color theme that feels right for you.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Toggle between light and dark appearance.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleDarkMode}
                  className="h-9 w-9"
                  data-testid="button-toggle-dark-mode"
                >
                  {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <Label className="text-base">Color Theme</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {themes.map((theme) => {
                    const isSelected = themeId === theme.id;
                    const primaryHsl = theme.light["--primary"];
                    const secondaryHsl = theme.light["--secondary"];
                    const accentHsl = theme.light["--accent"];
                    
                    return (
                      <button
                        key={theme.id}
                        onClick={() => {
                          setTheme(theme.id);
                          toast.success(`Theme changed to ${theme.name}`);
                        }}
                        className={cn(
                          "relative p-4 rounded-xl border-2 text-left transition-all duration-200",
                          "hover:scale-[1.02] hover:shadow-md",
                          isSelected 
                            ? "border-primary bg-primary/5 shadow-sm" 
                            : "border-border hover:border-primary/50"
                        )}
                        data-testid={`button-theme-${theme.id}`}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2">
                            <Check className="w-4 h-4 text-primary" />
                          </div>
                        )}
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xl">{theme.emoji}</span>
                          <span className="font-medium text-foreground">{theme.name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">{theme.description}</p>
                        <div className="flex gap-1.5">
                          <div 
                            className="w-6 h-6 rounded-full border border-border/50 shadow-sm"
                            style={{ backgroundColor: `hsl(${primaryHsl})` }}
                          />
                          <div 
                            className="w-6 h-6 rounded-full border border-border/50 shadow-sm"
                            style={{ backgroundColor: `hsl(${secondaryHsl})` }}
                          />
                          <div 
                            className="w-6 h-6 rounded-full border border-border/50 shadow-sm"
                            style={{ backgroundColor: `hsl(${accentHsl})` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
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
