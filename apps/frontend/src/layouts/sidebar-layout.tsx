import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLogout, customFetch } from "@workspace/api-client";
import { 
  LayoutDashboard, Search, History, Settings, Users, LogOut, 
  Activity, GitCompareArrows, ChevronLeft, ChevronRight, Menu, X, Star, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated, logout: clearAuth } = useAuth();
  const logoutMutation = useLogout();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Responsive Screen Listener
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close drawer on path change
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  // Mouse Parallax coordinates tracker
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isMobile) return;
    const { clientX, clientY } = e;
    const x = (clientX / window.innerWidth) - 0.5;
    const y = (clientY / window.innerHeight) - 0.5;
    setMousePos({ x, y });
  };

  const isSharedRoute = location.startsWith("/shared/");

  // Redirect to login only if not authenticated and NOT viewing a public share route
  useEffect(() => {
    if (!isAuthenticated && !isSharedRoute) {
      setLocation("/login");
    }
  }, [isAuthenticated, isSharedRoute, setLocation]);

  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);
  useEffect(() => {
    if (isAuthenticated) {
      customFetch<{ used: number; limit: number }>("/api/dashboard/usage")
        .then(setUsage)
        .catch(() => {});
    }
  }, [isAuthenticated]);

  // Determine view parameters
  const isGuestMode = !isAuthenticated && isSharedRoute;

  // If not authenticated and not a shared route, block rendering while redirecting
  if (!isAuthenticated && !isSharedRoute) return null;

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Analyze", href: "/analyze", icon: Search },
    { label: "Compare", href: "/compare", icon: GitCompareArrows },
    { label: "History", href: "/history", icon: History },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  if (user && user.role === "admin") {
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
      className="flex h-screen w-screen overflow-hidden bg-background no-print relative"
      onMouseMove={handleMouseMove}
    >
      {/* Mobile Drawer Overlay */}
      {isMobile && mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Persistent Glass Sidebar */}
      <motion.div
        initial={false}
        animate={{ 
          width: isMobile ? 260 : (collapsed ? 76 : 260),
          x: isMobile ? (mobileOpen ? 0 : -260) : 0
        }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className={`fixed left-0 top-0 bottom-0 z-50 flex flex-col bg-background/60 backdrop-blur-xl border-r border-border/40 shrink-0 shadow-2xl ${
          isMobile ? "w-[260px]" : ""
        }`}
      >
        {/* Sidebar Header Branding */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-border/40">
          <Link href="/dashboard" className="flex items-center gap-2 text-primary font-bold text-lg overflow-hidden shrink-0">
            <Activity className="w-6 h-6 text-primary shrink-0 transition-transform hover:rotate-12 duration-300" />
            <AnimatePresence initial={false}>
              {(!collapsed || isMobile) && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="font-bold text-primary whitespace-nowrap tracking-wide bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
                >
                  ReviewSense
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 rounded-full hover:bg-muted/40"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
          )}
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 rounded-full"
              onClick={() => setMobileOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        {/* Navigation list */}
        <div className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto custom-scrollbar">
          {isGuestMode ? (
            // Simplified Guest Sidebar View
            <div className="space-y-4 px-2 py-4">
              <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-primary tracking-wide uppercase"><Sparkles className="w-3.5 h-3.5" /> Shared Report</span>
                <p className="text-xs text-muted-foreground leading-relaxed">You are viewing a shared review analysis report.</p>
              </div>
            </div>
          ) : (
            // Full Authenticated Sidebar View
            navItems.map((item) => {
              const isActive = location === item.href || location.startsWith(item.href + "/");
              const content = (
                <Link 
                  key={item.href} 
                  href={item.href} 
                  className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group sidebar-link-hover ${
                    isActive ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {isActive && (
                    <>
                      {/* Purple left neon line indicator */}
                      <motion.div
                        layoutId="active-nav-indicator"
                        className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-primary shadow-[0_0_10px_2px_rgba(147,51,234,0.5)]"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                      {/* Active pill background glass glow */}
                      <motion.div
                        layoutId="active-nav-bg"
                        className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-lg -z-10 shadow-[0_0_15px_-3px_rgba(147,51,234,0.2)]"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    </>
                  )}
                  <item.icon className={`w-5 h-5 shrink-0 relative z-10 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                  <AnimatePresence initial={false}>
                    {(!collapsed || isMobile) && (
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

              if (collapsed && !isMobile) {
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
            })
          )}
        </div>

        {/* Free tier usage info */}
        <AnimatePresence initial={false}>
          {usage && (!collapsed || isMobile) && !isGuestMode && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="px-4 pb-4"
            >
              <div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Free tier usage</span>
                  <span className="font-mono font-semibold">{usage.used} / {usage.limit}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full transition-all ${usage.used / usage.limit > 0.8 ? "bg-destructive animate-pulse" : "bg-primary"}`}
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

        {/* Profile Footer Panel */}
        <div className="p-3 border-t border-border/40 bg-background/20">
          {isGuestMode ? (
            // Guest mode footer button
            <Button 
              variant="default" 
              className="w-full justify-center shadow-lg hover:shadow-primary/20 text-sm font-semibold"
              onClick={() => setLocation("/signup")}
            >
              Try Free
            </Button>
          ) : (
            // Logged-in profile view
            <>
              <div className="flex items-center gap-3 mb-4 overflow-hidden">
                <Avatar className="w-10 h-10 border border-border shrink-0 hover:scale-105 transition-transform duration-300">
                  <AvatarFallback className="bg-primary/20 text-primary font-mono font-semibold">
                    {user?.name ? user.name.substring(0, 2).toUpperCase() : "US"}
                  </AvatarFallback>
                </Avatar>
                {(!collapsed || isMobile) && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 min-w-0"
                  >
                    <p className="text-sm font-semibold truncate leading-none text-foreground">{user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate mt-1">{user?.email}</p>
                  </motion.div>
                )}
              </div>
              <Button 
                variant="outline" 
                className={`w-full justify-start text-muted-foreground hover:text-foreground hover:bg-muted/50 ${collapsed && !isMobile ? "px-0 justify-center" : ""}`}
                onClick={handleLogout} 
                data-testid="button-logout"
              >
                <LogOut className={`w-4 h-4 ${collapsed && !isMobile ? "" : "mr-2"}`} />
                {(!collapsed || isMobile) && <span>Sign Out</span>}
              </Button>
            </>
          )}
        </div>
      </motion.div>
      
      {/* Scrollable Content Area */}
      <div 
        className="flex-1 flex flex-col h-screen overflow-hidden relative z-10 transition-all duration-300 gradient-mesh"
        style={{ marginLeft: isMobile ? 0 : (collapsed ? 76 : 260) }}
      >
        {/* Floating background mesh orbs */}
        {!isMobile && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            <div 
              className="absolute top-[10%] left-[20%] w-[380px] h-[380px] bg-primary/10 rounded-full blur-[110px] animate-orb-1"
              style={{
                transform: `translate(${mousePos.x * 25}px, ${mousePos.y * 25}px)`,
                transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)"
              }}
            />
            <div 
              className="absolute bottom-[20%] right-[15%] w-[420px] h-[420px] bg-secondary/6 rounded-full blur-[130px] animate-orb-2"
              style={{
                transform: `translate(${mousePos.x * -30}px, ${mousePos.y * -30}px)`,
                transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)"
              }}
            />
          </div>
        )}

        {/* Mobile Navbar Header */}
        {isMobile && (
          <header className="h-14 flex items-center justify-between px-4 border-b border-border/40 bg-background/40 backdrop-blur-md sticky top-0 z-40">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/40"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <span className="font-bold text-sm text-primary uppercase tracking-wider bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">ReviewSense</span>
            <div className="w-9 h-9" /> {/* visual layout balance spacer */}
          </header>
        )}

        {/* Content Container (only this panel scrolls) */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 relative custom-scrollbar z-10">
          <div className="noise-overlay" />
          {children}
        </main>
      </div>
    </div>
  );
}
