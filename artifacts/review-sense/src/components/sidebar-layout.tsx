import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLogout, customFetch } from "@workspace/api-client-react";
import { LayoutDashboard, Search, History, Settings, Users, LogOut, Activity, GitCompareArrows } from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated, logout: clearAuth } = useAuth();
  const logoutMutation = useLogout();

  // If not authenticated, redirect to login
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated || !user) return null;

  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);
  useEffect(() => {
    customFetch<{ used: number; limit: number }>("/api/dashboard/usage")
      .then(setUsage)
      .catch(() => {});
  }, []);

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Analyze", href: "/analyze", icon: Search },
    { label: "Compare", href: "/compare", icon: GitCompareArrows },
    { label: "History", href: "/history", icon: History },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  if (user.role === "admin") {
    navItems.push({ label: "Admin", href: "/admin", icon: Users });
  }

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        clearAuth();
        setLocation("/login");
      },
      onError: () => {
        // Even if the server request fails, clear local state
        clearAuth();
        setLocation("/login");
      }
    });
  };

  return (
    <div className="flex min-h-[100dvh] w-full bg-background no-print">
      <div className="w-64 flex flex-col glass-panel border-r shrink-0">
        <div className="h-16 flex items-center px-6 border-b">
          <Link href="/dashboard" className="flex items-center gap-2 text-primary font-bold text-lg">
            <Activity className="w-6 h-6" />
            ReviewSense
          </Link>
        </div>
        
        <div className="flex-1 py-6 px-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location === item.href || location.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${isActive ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Free tier usage */}
        {usage && (
          <div className="px-4 pb-3">
            <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Free tier</span>
                <span className="font-mono font-medium">{usage.used} / {usage.limit}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${usage.used / usage.limit > 0.8 ? "bg-destructive" : "bg-primary"}`}
                  style={{ width: `${Math.min(100, (usage.used / usage.limit) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{usage.limit - usage.used} analyses left this month</p>
            </div>
          </div>
        )}

        <div className="p-4 border-t border-border/50">
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="w-10 h-10 border border-border">
              <AvatarFallback className="bg-primary/20 text-primary font-mono">{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
          <Button variant="outline" className="w-full justify-start text-muted-foreground" onClick={handleLogout} data-testid="button-logout">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col min-h-[100dvh] overflow-hidden">
        <main className="flex-1 overflow-y-auto p-8 relative">
          <div className="noise-overlay" />
          {children}
        </main>
      </div>
    </div>
  );
}
