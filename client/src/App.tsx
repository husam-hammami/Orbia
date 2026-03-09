import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { Switch, Route } from "wouter";
import { queryClient, API_BASE_URL } from "./lib/queryClient";
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
import MedicalPage from "@/pages/medical";
import WorkPage from "@/pages/work";

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

interface AuthContextType {
  logout: () => Promise<void>;
  user: { id: string; displayName?: string } | null;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
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
      <Route path="/medical" component={MedicalPage} />
      <Route path="/work" component={WorkPage} />
      <Route path="/settings" component={Settings} />
      <Route path="/admin/seed" component={AdminSeed} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [user, setUser] = useState<{ id: string; displayName?: string } | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const url = API_BASE_URL ? `${API_BASE_URL}/api/auth/me` : "/api/auth/me";
        const res = await fetch(url, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
          setIsAuthenticated(true);
        }
      } catch {
      } finally {
        setIsCheckingSession(false);
      }
    };
    checkSession();
  }, []);

  const logout = useCallback(async () => {
    try {
      const url = API_BASE_URL ? `${API_BASE_URL}/api/auth/logout` : "/api/auth/logout";
      await fetch(url, { method: "POST", credentials: "include" });
    } catch {
    }
    queryClient.clear();
    const keysToKeep = ["orbia-theme", "orbia-dark-mode"];
    const preserved: Record<string, string> = {};
    keysToKeep.forEach(k => {
      const v = localStorage.getItem(k);
      if (v !== null) preserved[k] = v;
    });
    localStorage.clear();
    Object.entries(preserved).forEach(([k, v]) => localStorage.setItem(k, v));
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const lockState = useLockScreen();

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WelcomePage onAuthenticated={() => {
            setIsAuthenticated(true);
            const fetchUser = async () => {
              try {
                const url = API_BASE_URL ? `${API_BASE_URL}/api/auth/me` : "/api/auth/me";
                const res = await fetch(url, { credentials: "include" });
                if (res.ok) {
                  const data = await res.json();
                  setUser(data);
                }
              } catch {}
            };
            fetchUser();
          }} />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthContext.Provider value={{ logout, user }}>
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
        </AuthContext.Provider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
