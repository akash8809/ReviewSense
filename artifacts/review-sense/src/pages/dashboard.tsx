import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { SidebarLayout } from "@/components/sidebar-layout";
import { 
  useGetDashboardStats, 
  getGetDashboardStatsQueryKey,
  useGetRecentAnalyses,
  getGetRecentAnalysesQueryKey,
  customFetch
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, BarChart, FileText, Search, Star, ArrowRight, Plus, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart
} from "recharts";

// Easing count-up utility for statistical metrics
function CountUp({ value, duration = 1.0 }: { value: number | string; duration?: number }) {
  const numericValue = typeof value === "number" ? value : parseFloat(String(value).replace(/[^0-9.]/g, ""));
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (isNaN(numericValue)) return;
    let start = 0;
    const end = numericValue;
    if (start === end) {
      setCount(end);
      return;
    }

    const totalMiliseconds = duration * 1000;
    const startTime = Date.now();
    
    const timer = setInterval(() => {
      const timePassed = Date.now() - startTime;
      const progress = Math.min(timePassed / totalMiliseconds, 1);
      const easeProgress = progress * (2 - progress); // Ease out quad
      const current = start + easeProgress * (end - start);
      
      setCount(current);

      if (progress === 1) {
        clearInterval(timer);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [numericValue, duration]);

  if (isNaN(numericValue)) return <>{value}</>;
  return <>{numericValue % 1 === 0 ? Math.round(count).toLocaleString() : count.toFixed(1)}</>;
}

function StatCard({ title, value, icon: Icon, prefix = "", suffix = "", isLoaded }: any) {
  return (
    <Card className="glass-panel border-border/50 relative overflow-hidden group hover:border-primary/40 shadow-sm hover:shadow-primary/5">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoaded ? (
          <div className="text-3xl font-bold font-mono text-foreground tracking-tight">
            {prefix}<CountUp value={value} />{suffix}
          </div>
        ) : (
          <Skeleton className="h-9 w-24" />
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [location, setLocation] = useLocation();
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats({
    query: { queryKey: getGetDashboardStatsQueryKey() }
  });
  
  const { data: recent, isLoading: recentLoading } = useGetRecentAnalyses({
    query: { queryKey: getGetRecentAnalysesQueryKey() }
  });

  const [trend, setTrend] = useState<{ date: string; count: number; avgSentiment: number }[]>([]);
  useEffect(() => {
    customFetch<{ date: string; count: number; avgSentiment: number }[]>("/api/dashboard/trend")
      .then(setTrend)
      .catch(() => {});
  }, []);

  const [url, setUrl] = React.useState("");

  const handleQuickAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      // Pass via state to analyze page
      setLocation(`/analyze?url=${encodeURIComponent(url)}`);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        type: "spring", 
        stiffness: 260, 
        damping: 22 
      } 
    }
  };

  return (
    <SidebarLayout>
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Overview of your analysis activity</p>
          </div>
          <Button onClick={() => setLocation("/analyze")} className="data-glow">
            <Plus className="w-4 h-4 mr-2" />
            New Analysis
          </Button>
        </div>

        {/* Quick Analyze Form */}
        <motion.div variants={itemVariants}>
          <Card className="glass-panel border-primary/20 bg-primary/5 shadow-md">
            <CardContent className="p-6">
              <form onSubmit={handleQuickAnalyze} className="flex gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium">Quick Analyze Product URL</label>
                  <div className="relative input-focus-glow rounded-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://amazon.com/dp/B08... or any product URL"
                      className="pl-10 bg-background/50 border-border/50 font-mono"
                      data-testid="input-quick-url"
                    />
                  </div>
                </div>
                <Button type="submit" disabled={!url.trim()} data-testid="button-quick-analyze">
                  Analyze
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Grid */}
        <motion.div 
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <motion.div variants={itemVariants}>
            <StatCard 
              title="Total Analyses" 
              value={stats?.totalAnalyses || 0} 
              icon={Activity} 
              isLoaded={!statsLoading}
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard 
              title="Total Reviews Processed" 
              value={stats?.totalReviews || 0} 
              icon={FileText} 
              isLoaded={!statsLoading}
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard 
              title="Avg Sentiment" 
              value={stats?.avgPositivePct ? Math.round(stats.avgPositivePct) : 0} 
              suffix="%" 
              icon={BarChart} 
              isLoaded={!statsLoading}
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard 
              title="Avg Rating" 
              value={stats?.avgRating ? stats.avgRating.toFixed(1) : "0.0"} 
              icon={Star} 
              isLoaded={!statsLoading}
            />
          </motion.div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Recent Activity</h2>
            <Link href="/history" className="text-sm text-primary hover:underline flex items-center">
              View all <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          
          <Card className="glass-panel border-border/50 shadow-md">
            <CardContent className="p-0">
              {recentLoading ? (
                <div className="p-6 space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : recent && recent.length > 0 ? (
                <div className="divide-y divide-border/50">
                  {recent.map((item, i) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      key={item.id} 
                      className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors cursor-pointer group"
                      onClick={() => setLocation(`/result/${item.id}`)}
                      data-testid={`card-recent-${item.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-10 rounded-full transition-all duration-300 group-hover:scale-y-110 ${
                          item.status === 'completed' ? 'bg-primary' : 
                          item.status === 'failed' ? 'bg-destructive' : 'bg-yellow-500 animate-pulse'
                        }`} />
                        <div>
                          <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{item.productName || 'Unknown Product'}</p>
                          <div className="flex items-center text-xs text-muted-foreground gap-3 mt-1">
                            <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{item.reviewCount} reviews</span>
                            {item.status === 'completed' && (
                              <>
                                <span>•</span>
                                <span className="text-primary font-medium">{item.positivePct}% Positive</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                        <ArrowRight className="w-5 h-5 text-primary" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                  <Activity className="w-12 h-12 mb-4 opacity-20" />
                  <p>No analyses yet. Start by analyzing a product!</p>
                  <Button variant="outline" className="mt-4" onClick={() => setLocation("/analyze")}>
                    Create First Analysis
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Trend Chart */}
        <motion.div variants={itemVariants}>
          <Card className="glass-panel border-border/50 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <TrendingUp className="w-4 h-4 text-primary" /> Sentiment Trend — Last 30 Days
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[200px]">
              {trend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend} margin={{ left: -20, right: 10, top: 5, bottom: 0 }}>
                    <defs>
                      <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }} 
                      animationDuration={300}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="avgSentiment" 
                      name="Avg Sentiment" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2.5} 
                      fill="url(#sentGrad)" 
                      dot={false}
                      isAnimationActive={true}
                      animationDuration={1200}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                  <BarChart className="w-10 h-10 mb-2 opacity-20" />
                  <p className="text-sm">Run a few analyses to see your trend here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </SidebarLayout>
  );
}
