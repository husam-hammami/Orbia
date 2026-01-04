import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import CareerPage from "@/pages/career";
import Analytics from "@/pages/analytics";
import SystemInsight from "@/pages/system-insight";
import GeniusAI from "@/pages/deep-mind";
import FinancePage from "@/pages/finance";
import OrbitPage from "@/pages/orbit";
import JournalPage from "@/pages/journal";
import { OrbitFab } from "@/components/orbit-fab";

import Settings from "@/pages/settings";
import TrackerPage from "@/pages/tracker";
import AdminSeed from "@/pages/admin-seed";

function Router() {
  return (
    <Switch>
      <Route path="/" component={TrackerPage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/orbit" component={OrbitPage} />
      <Route path="/journal" component={JournalPage} />
      <Route path="/career" component={CareerPage} />
      <Route path="/finance" component={FinancePage} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/headspace" component={SystemInsight} />
      <Route path="/deep-mind" component={GeniusAI} />
      <Route path="/settings" component={Settings} />
      <Route path="/admin/seed" component={AdminSeed} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        <OrbitFab />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
