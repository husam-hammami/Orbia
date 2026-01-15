import { useState, useEffect, createContext, useContext } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import CareerPage from "@/pages/career";
import FinancePage from "@/pages/finance";
import OrbitPage from "@/pages/orbit";
import JournalPage from "@/pages/journal";
import WelcomePage from "@/pages/welcome";
import NewsPage from "@/pages/news";
import { LockScreen, useLockScreen } from "@/components/lock-screen";

import Settings from "@/pages/settings";
import TrackerPage from "@/pages/tracker";
import AdminSeed from "@/pages/admin-seed";

interface LockContextType {
  isLocked: boolean;
  hasPassword: boolean;
  lock: () => void;
  unlock: () => void;
  setPassword: (password: string) => void;
  removePassword: () => void;
}

export const LockContext = createContext<LockContextType | null>(null);

export function useLock() {
  const context = useContext(LockContext);
  if (!context) throw new Error("useLock must be used within LockProvider");
  return context;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={TrackerPage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/orbit" component={OrbitPage} />
      <Route path="/journal" component={JournalPage} />
      <Route path="/career" component={CareerPage} />
      <Route path="/finance" component={FinancePage} />
      <Route path="/news" component={NewsPage} />
      <Route path="/settings" component={Settings} />
      <Route path="/admin/seed" component={AdminSeed} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem("orbia_authenticated") === "true";
  });
  
  const lockState = useLockScreen();

  if (!isAuthenticated) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WelcomePage onAuthenticated={() => setIsAuthenticated(true)} />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LockContext.Provider value={lockState}>
          {lockState.isLocked && lockState.hasPassword ? (
            <LockScreen onUnlock={lockState.unlock} />
          ) : (
            <>
              <Toaster />
              <Router />
            </>
          )}
        </LockContext.Provider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
