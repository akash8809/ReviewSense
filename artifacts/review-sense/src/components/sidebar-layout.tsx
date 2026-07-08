import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLogout, customFetch } from "@workspace/api-client-react";
import { 
  LayoutDashboard, Search, History, Settings, Users, LogOut, 
  Activity, GitCompareArrows, ChevronLeft, ChevronRight 
} from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated, logout: clearAuth } = useAuth();
  const logoutMutation = useLogout();
  const [collapsed, setCollapsed] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Mouse Parallax coordinates tracker
  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const x = (clientX / window.innerWidth) - 0.5;
    const y = (clientY / window.innerHeight) - 0.5;
    setMousePos({ x, y });
  };

  // If not authenticated, redirect to login
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, setLocation]);

  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);
  useEffect(() => {
    if (isAuthenticated) {
      customFetch<{ used: number; limit: number }>("/api/dashboard/usage")
        .then(setUsage)
        .catch(() => {});
    }
  }, [isAuthenticated]);

  if (!isAuthenticated || !user) return null;

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
        clearAuth();
        setLocation("/login");
      }
    });
  };

  return (
    <div 
      className="flex min-h-[100dvh] w-full bg-background no-print relative overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* Premium background gradient elements with mouse parallax */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div 
          className="absolute top-[10%] left-[20%] w-[380px] h-[380px] bg-primary/10 rounded-full blur-[110px] animate-orb-1"
          style={{
            transform: `translate(${mousePos.x * 30}px, ${mousePos.y * 30}px)`,
            transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)"
          }}
        />
        <div 
          className="absolute bottom-[20%] right-[15%] w-[420px] h-[420px] bg-secondary/8 rounded-full blur-[130px] animate-orb-2"
          style={{
            transform: `translate(${mousePos.x * -35}px, ${mousePos.y * -35}px)`,
            transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)"
          }}
        />
      </div>

      <motion.div
        animate={{ width: collapsed ? 76 : 256 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="flex flex-col glass-panel border-r shrink-0 relative z-20"
      >
        <div className="h-16 flex items-center justify-between px-4 border-b">
          <Link href="/dashboard" className="flex items-center gap-2 text-primary font-bold text-lg overflow-hidden shrink-0">
            <Activity className="w-6 h-6 text-primary shrink-0" />
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="font-bold text-primary whitespace-nowrap"
                >
                  ReviewSense
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 rounded-full"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>
        
        <div className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href || location.startsWith(item.href + "/");
            const content = (
              <Link 
                key={item.href} 
                href={item.href} 
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${
                  isActive ? 'text-primary-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav"
                    className="absolute inset-0 bg-primary rounded-lg -z-10 shadow-md shadow-primary/20"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <item.icon className="w-5 h-5 shrink-0 relative z-10 transition-transform duration-300 group-hover:scale-110" />
                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      className="relative z-10 whitespace-nowrap text-sm"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href} delayDuration={100}>
                  <TooltipTrigger asChild>
                    {content}
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-card border border-border">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return content;
          })}
        </div>

        {/* Free tier usage */}
        <AnimatePresence initial={false}>
          {usage && !collapsed && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="px-4 pb-4"
            >
              <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Free tier</span>
                  <span className="font-mono font-medium">{usage.used} / {usage.limit}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full transition-all ${usage.used / usage.limit > 0.8 ? "bg-destructive" : "bg-primary"}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (usage.used / usage.limit) * 100)}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground leading-none">{usage.limit - usage.used} analyses left this month</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-3 border-t border-border/50 bg-background/20">
          <div className="flex items-center gap-3 mb-4 overflow-hidden">
            <Avatar className="w-10 h-10 border border-border shrink-0 hover:scale-105 transition-transform duration-300">
              <AvatarFallback className="bg-primary/20 text-primary font-mono font-semibold">{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            {!collapsed && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-semibold truncate leading-none">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate mt-1">{user.email}</p>
              </motion.div>
            )}
          </div>
          <Button 
            variant="outline" 
            className={`w-full justify-start text-muted-foreground hover:text-foreground hover:bg-muted/50 ${collapsed ? "px-0 justify-center" : ""}`}
            onClick={handleLogout} 
            data-testid="button-logout"
          >
            <LogOut className={`w-4 h-4 ${collapsed ? "" : "mr-2"}`} />
            {!collapsed && <span>Sign Out</span>}
          </Button>
        </div>
      </motion.div>
      
      <div className="flex-1 flex flex-col min-h-[100dvh] overflow-hidden relative z-10">
        <main className="flex-1 overflow-y-auto p-8 relative">
          <div className="noise-overlay" />
          {children}
        </main>
      </div>
    </div>
  );
}
