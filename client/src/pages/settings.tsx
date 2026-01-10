import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Database, 
  Moon, 
  Sun, 
  Smartphone,
  Type,
  LogOut,
  AlertTriangle,
  Download,
  Upload
} from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const [systemName, setSystemName] = useState("The Mosaic System");
  const [theme, setTheme] = useState("dark");
  const [notifications, setNotifications] = useState(true);
  const [biometric, setBiometric] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);

  const handleSave = () => {
    toast.success("Settings saved successfully", {
      description: "Your preferences have been updated."
    });
  };

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/40 pb-6">
          <div className="space-y-1">
             <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="border-slate-500/30 text-slate-600 bg-slate-500/5 gap-1">
                    <SettingsIcon className="w-3 h-3" /> Configuration
                </Badge>
             </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight">System Settings</h1>
            <p className="text-muted-foreground text-lg">Customize your NeuroZen experience and manage your data.</p>
          </div>
          <div className="flex gap-2">
             <Button variant="outline" onClick={() => window.location.reload()}>Cancel</Button>
             <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Sidebar Navigation */}
            <nav className="lg:col-span-3 space-y-1">
                <Button variant="ghost" className="w-full justify-start gap-2 font-medium bg-muted/50 text-foreground">
                    <User className="w-4 h-4" /> System Profile
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-2 font-medium text-muted-foreground hover:text-foreground">
                    <Palette className="w-4 h-4" /> Appearance
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-2 font-medium text-muted-foreground hover:text-foreground">
                    <Type className="w-4 h-4" /> Terminology
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-2 font-medium text-muted-foreground hover:text-foreground">
                    <Bell className="w-4 h-4" /> Notifications
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-2 font-medium text-muted-foreground hover:text-foreground">
                    <Shield className="w-4 h-4" /> Privacy & Security
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-2 font-medium text-muted-foreground hover:text-foreground">
                    <Database className="w-4 h-4" /> Data Management
                </Button>
            </nav>

            {/* Content Area */}
            <div className="lg:col-span-9 space-y-6">
                
                {/* Profile Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <User className="w-5 h-5 text-indigo-500" />
                            System Profile
                        </CardTitle>
                        <CardDescription>
                            Basic information about your system configuration.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="system-name">System Name</Label>
                            <Input 
                                id="system-name" 
                                value={systemName} 
                                onChange={(e) => setSystemName(e.target.value)} 
                                placeholder="e.g. The Polaris System"
                            />
                            <p className="text-[0.8rem] text-muted-foreground">
                                This name will be displayed on the dashboard and welcome screens.
                            </p>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="body-age">Body Age (Optional)</Label>
                            <Input id="body-age" type="number" placeholder="25" className="max-w-[120px]" />
                        </div>
                    </CardContent>
                </Card>

                {/* Terminology Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Type className="w-5 h-5 text-emerald-500" />
                            Terminology Preferences
                        </CardTitle>
                        <CardDescription>
                            Customize the language used throughout the app to match your system's preferences.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="grid gap-2">
                                <Label>State Term</Label>
                                <Select defaultValue="states">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select term" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="states">States</SelectItem>
                                        <SelectItem value="parts">Parts</SelectItem>
                                        <SelectItem value="modes">Modes</SelectItem>
                                        <SelectItem value="aspects">Aspects</SelectItem>
                                        <SelectItem value="others">Others</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Active State Term</Label>
                                <Select defaultValue="active">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select term" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="current">Current</SelectItem>
                                        <SelectItem value="present">Present</SelectItem>
                                        <SelectItem value="engaged">Engaged</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Internal World Term</Label>
                                <Select defaultValue="headspace">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select term" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="headspace">Headspace</SelectItem>
                                        <SelectItem value="innerworld">Inner World</SelectItem>
                                        <SelectItem value="mindscape">Mindscape</SelectItem>
                                        <SelectItem value="internal">Internal</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Appearance Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Palette className="w-5 h-5 text-purple-500" />
                            Appearance
                        </CardTitle>
                        <CardDescription>
                            Manage how NeuroZen looks and feels.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="grid gap-2">
                            <Label className="mb-2">Theme Preference</Label>
                            <div className="grid grid-cols-3 gap-2 max-w-md">
                                <Button 
                                    variant={theme === 'light' ? 'default' : 'outline'} 
                                    className="justify-start gap-2"
                                    onClick={() => setTheme('light')}
                                >
                                    <Sun className="w-4 h-4" /> Light
                                </Button>
                                <Button 
                                    variant={theme === 'dark' ? 'default' : 'outline'} 
                                    className="justify-start gap-2"
                                    onClick={() => setTheme('dark')}
                                >
                                    <Moon className="w-4 h-4" /> Dark
                                </Button>
                                <Button 
                                    variant={theme === 'system' ? 'default' : 'outline'} 
                                    className="justify-start gap-2"
                                    onClick={() => setTheme('system')}
                                >
                                    <Smartphone className="w-4 h-4" /> System
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Security Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Shield className="w-5 h-5 text-rose-500" />
                            Privacy & Security
                        </CardTitle>
                        <CardDescription>
                            Protect your sensitive system data.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">Discreet Mode</Label>
                                <p className="text-sm text-muted-foreground">
                                    Use neutral terminology and hide sensitive labels when in public.
                                </p>
                            </div>
                            <Switch checked={privacyMode} onCheckedChange={setPrivacyMode} />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">App Lock</Label>
                                <p className="text-sm text-muted-foreground">
                                    Require PIN or Biometrics to open the app.
                                </p>
                            </div>
                            <Switch checked={biometric} onCheckedChange={setBiometric} />
                        </div>
                    </CardContent>
                </Card>

                {/* Data Zone */}
                <Card className="border-red-200 dark:border-red-900/30">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2 text-red-600 dark:text-red-400">
                            <AlertTriangle className="w-5 h-5" />
                            Danger Zone
                        </CardTitle>
                        <CardDescription>
                            Manage your data storage and account.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <Button variant="outline" className="flex-1 gap-2">
                                <Download className="w-4 h-4" /> Export System Data (JSON)
                            </Button>
                            <Button variant="outline" className="flex-1 gap-2">
                                <Upload className="w-4 h-4" /> Import Backup
                            </Button>
                        </div>
                        <Separator />
                        <Button variant="destructive" className="w-full md:w-auto">
                            <LogOut className="w-4 h-4 mr-2" />
                            Delete All Data & Reset
                        </Button>
                    </CardContent>
                </Card>

            </div>
        </div>
      </div>
    </Layout>
  );
}