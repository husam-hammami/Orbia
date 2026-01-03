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

import Settings from "@/pages/settings";
import TrackerPage from "@/pages/tracker";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/tracker" component={TrackerPage} />
      <Route path="/career" component={CareerPage} />
      <Route path="/finance" component={FinancePage} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/headspace" component={SystemInsight} />
      <Route path="/deep-mind" component={GeniusAI} />
      <Route path="/settings" component={Settings} />
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
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
