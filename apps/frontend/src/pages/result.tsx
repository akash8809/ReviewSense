import React, { useState, useEffect, useRef } from "react";
import { SidebarLayout } from "@/layouts/sidebar-layout";
import { useParams, Link, useLocation } from "wouter";
import { 
  useGetAnalysis, 
  getGetAnalysisQueryKey,
  useGetAnalysisReviews,
  getGetAnalysisReviewsQueryKey,
  Analysis,
  Review
} from "@workspace/api-client";
import { customFetch } from "@workspace/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  Activity, Star, TrendingUp, TrendingDown, Download, ArrowLeft,
  Brain, Target, Briefcase, FileText, Share2, RefreshCw, Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line 
} from "recharts";

// Count-up helper component
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

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const analysisId = parseInt(id, 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [sharing, setSharing] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);

  const { data: analysis, isLoading: analysisLoading } = useGetAnalysis(analysisId, {
    query: { queryKey: getGetAnalysisQueryKey(analysisId) }
  });

  const { data: reviewsData, isLoading: reviewsLoading } = useGetAnalysisReviews(analysisId, {
    query: { queryKey: getGetAnalysisReviewsQueryKey(analysisId) }
  });

  // Client-side reviews lazy-loading system
  const [visibleCount, setVisibleCount] = useState(10);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!reviewsData || visibleCount >= reviewsData.items.length) return;
    
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setTimeout(() => {
          setVisibleCount((prev) => Math.min(prev + 10, reviewsData.items.length));
        }, 350);
      }
    }, { threshold: 0.1 });
    
    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }
    
    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [reviewsData, visibleCount]);

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
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 260, damping: 22 } }
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const data = await customFetch<{ token: string }>(`/api/analyses/${analysisId}/share`, { method: "POST" });
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const url = `${window.location.origin}${base}/shared/${data.token}`;
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied!", description: "Share this link — anyone with it can view this report." });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to generate share link." });
    } finally {
      setSharing(false);
    }
  };

  const handleReanalyze = async () => {
    if (!confirm("This will run a fresh analysis on the same product URL and create a new result. Continue?")) return;
    setReanalyzing(true);
    try {
      const newAnalysis = await customFetch<{ id: number }>(`/api/analyses/${analysisId}/reanalyze`, { method: "POST" });
      toast({ title: "Re-analysis started!", description: "Redirecting to your new result…" });
      setLocation(`/result/${newAnalysis.id}`);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Cannot re-analyze", description: e.message || "This analysis has no product URL." });
    } finally {
      setReanalyzing(false);
    }
  };

  const handlePrint = async () => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: html2canvas } = await import("html2canvas");

      const element = document.getElementById("pdf-content");
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#0f0f13",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let yPos = 0;
      while (yPos < imgHeight) {
        if (yPos > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, -yPos, imgWidth, imgHeight);
        yPos += pageHeight;
      }

      pdf.save(`reviewsense-${analysisId}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
      window.print(); // fallback
    }
  };

  const handleCsvExport = () => {
    if (!reviewsData || reviewsData.items.length === 0) return;
    
    const headers = ["Review Text", "Sentiment", "Confidence", "Rating", "Date"];
    const rows = reviewsData.items.map(r => [
      `"${r.text.replace(/"/g, '""')}"`,
      r.sentiment,
      r.confidence || "",
      r.rating || "",
      r.reviewDate || ""
    ]);
    
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reviews-${analysisId}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (analysisLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        {/* Header Actions skeleton */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-24 rounded-lg bg-muted/40" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-16 rounded-lg bg-muted/40" />
            <Skeleton className="h-10 w-24 rounded-lg bg-muted/40" />
            <Skeleton className="h-10 w-28 rounded-lg bg-muted/40" />
          </div>
        </div>

        {/* Hero Card skeleton */}
        <Card className="glass-panel border-primary/20 bg-muted/5">
          <CardContent className="p-8 flex flex-col md:flex-row gap-8 items-start">
            <Skeleton className="w-32 h-32 md:w-48 md:h-48 rounded-xl bg-muted/40 shrink-0" />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-4 w-24 rounded bg-muted/40" />
              <Skeleton className="h-10 w-3/4 rounded-lg bg-muted/40" />
              <Skeleton className="h-5 w-1/2 rounded bg-muted/40" />
              <div className="flex flex-wrap gap-4 mt-6">
                <Skeleton className="h-20 w-32 rounded-xl bg-muted/40" />
                <Skeleton className="h-20 w-32 rounded-xl bg-muted/40" />
                <Skeleton className="h-20 w-32 rounded-xl bg-muted/40" />
              </div>
            </div>
            <Skeleton className="w-48 h-48 rounded-full bg-muted/40 shrink-0 hidden md:block" />
          </CardContent>
        </Card>

        {/* Content sections skeleton */}
        <div className="space-y-6">
          <Skeleton className="h-10 w-full rounded-xl bg-muted/40" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="glass-panel"><CardContent className="p-6 space-y-4"><Skeleton className="h-6 w-1/3 bg-muted/40" /><Skeleton className="h-24 w-full bg-muted/40" /></CardContent></Card>
            <Card className="glass-panel"><CardContent className="p-6 space-y-4"><Skeleton className="h-6 w-1/3 bg-muted/40" /><Skeleton className="h-24 w-full bg-muted/40" /></CardContent></Card>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="p-12 text-center text-destructive flex flex-col items-center">
        <Activity className="w-12 h-12 mb-4 animate-bounce" />
        <p className="font-semibold text-lg">Failed to load analysis.</p>
        <p className="text-sm text-muted-foreground mt-1 mb-6">The analysis report could not be found or retrieved.</p>
        <Button onClick={() => setLocation("/dashboard")}>Back to Dashboard</Button>
      </div>
    );
  }

  // Parse JSON fields
  let posKeywords: string[] = [];
  let negKeywords: string[] = [];
  let timeline: any[] = [];
  let ratingDist: any = {};

  try {
    if (analysis.positiveKeywords) posKeywords = JSON.parse(analysis.positiveKeywords);
    if (analysis.negativeKeywords) negKeywords = JSON.parse(analysis.negativeKeywords);
    if (analysis.sentimentTimeline) timeline = JSON.parse(analysis.sentimentTimeline);
    if (analysis.ratingDistribution) ratingDist = JSON.parse(analysis.ratingDistribution);
  } catch (e) {}

  const pieData = [
    { name: "Positive", value: analysis.positivePct, color: "hsl(var(--chart-3))" },
    { name: "Neutral", value: analysis.neutralPct, color: "hsl(var(--chart-4))" },
    { name: "Negative", value: analysis.negativePct, color: "hsl(var(--destructive))" },
  ];

  const ratingBarData = Object.keys(ratingDist).map(k => ({
    stars: `${k} Star`,
    count: ratingDist[k]
  })).reverse(); // 5 to 1

  return (
    <div id="pdf-content" className="space-y-8 print:space-y-4">
        {/* Header Actions */}
        <div className="flex items-center justify-between no-print">
          <Button variant="ghost" className="text-muted-foreground" asChild>
            <Link href="/dashboard"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Link>
          </Button>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={handleCsvExport} disabled={reviewsLoading} data-testid="btn-export-csv">
              <Download className="w-4 h-4 mr-2" /> CSV
            </Button>
            <Button variant="outline" onClick={handleShare} disabled={sharing} data-testid="btn-share">
              <Share2 className="w-4 h-4 mr-2" /> {sharing ? "Copying…" : "Share Link"}
            </Button>
            {analysis?.productUrl && (
              <Button variant="outline" onClick={handleReanalyze} disabled={reanalyzing}>
                <RefreshCw className={`w-4 h-4 mr-2 ${reanalyzing ? "animate-spin" : ""}`} /> Re-analyze
              </Button>
            )}
            <Button onClick={handlePrint} className="data-glow" data-testid="btn-export-pdf">
              <FileText className="w-4 h-4 mr-2" /> Export PDF
            </Button>
          </div>
        </div>

        {/* Product Card Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-8 print:border-none print:p-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none no-print" />
          
          <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
            {analysis.productImageUrl ? (
              <motion.div 
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="w-32 h-32 md:w-48 md:h-48 rounded-xl bg-white border p-2 shrink-0 flex items-center justify-center shadow-lg hover:shadow-primary/10 transition-all duration-300"
              >
                <img src={analysis.productImageUrl} alt={analysis.productName} className="max-w-full max-h-full object-contain mix-blend-multiply" />
              </motion.div>
            ) : (
              <motion.div 
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="w-32 h-32 md:w-48 md:h-48 rounded-xl bg-muted border flex items-center justify-center shrink-0 animate-pulse"
              >
                <Target className="w-12 h-12 text-muted-foreground/30" />
              </motion.div>
            )}
            
            <div className="flex-1 space-y-4">
              <div>
                {analysis.productBrand && <div className="text-sm font-bold text-primary uppercase tracking-wider">{analysis.productBrand}</div>}
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">{analysis.productName}</h1>
                <div className="flex items-center gap-4 mt-2 text-muted-foreground text-sm">
                  {analysis.productCategory && <span>{analysis.productCategory}</span>}
                  {analysis.productPrice && <span>• {analysis.productPrice}</span>}
                  <span>• {analysis.reviewCount} Reviews Processed</span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4 mt-6">
                <ScoreBadge label="AI Score" value={analysis.sentimentScore} isScore />
                <ScoreBadge label="Avg Rating" value={analysis.avgRating} suffix="/5.0" />
                <ScoreBadge label="Confidence" value={analysis.aiConfidence ? analysis.aiConfidence * 100 : null} suffix="%" />
              </div>
            </div>
 
            {/* Main Sentiment Donut */}
            <div className="w-48 h-48 shrink-0 relative flex items-center justify-center bg-background/50 backdrop-blur rounded-full border border-border/50 shadow-xl print:hidden">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                    animationDuration={1500}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold text-primary"><CountUp value={analysis.positivePct} />%</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Positive</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-4 glass-panel p-1 rounded-xl mb-6 no-print">
            <TabsTrigger value="summary" className="rounded-lg data-[state=active]:bg-primary">Summary</TabsTrigger>
            <TabsTrigger value="charts" className="rounded-lg data-[state=active]:bg-primary">Data & Charts</TabsTrigger>
            <TabsTrigger value="predictions" className="rounded-lg data-[state=active]:bg-primary">Predictions</TabsTrigger>
            <TabsTrigger value="reviews" className="rounded-lg data-[state=active]:bg-primary">Raw Reviews</TabsTrigger>
          </TabsList>

          {/* TAB: SUMMARY */}
          <TabsContent value="summary" className="space-y-6 print:block">
            <h2 className="text-2xl font-bold mb-4 print-only hidden">AI Summary</h2>
            
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <motion.div variants={itemVariants} className="md:col-span-2">
                <Card className="glass-panel border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Brain className="w-5 h-5 text-primary" /> The Bottom Line</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg leading-relaxed text-foreground/90">{analysis.overallSummary}</p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card className="glass-panel border-green-500/20 bg-green-500/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-500"><TrendingUp className="w-5 h-5" /> Strengths</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="leading-relaxed">{analysis.strengths}</p>
                    {posKeywords.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {posKeywords.map((k,i) => <span key={i} className="px-2 py-1 rounded bg-green-500/20 text-green-500 text-xs font-mono">{k}</span>)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card className="glass-panel border-destructive/20 bg-destructive/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive"><TrendingDown className="w-5 h-5" /> Weaknesses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="leading-relaxed">{analysis.weaknesses}</p>
                    {negKeywords.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {negKeywords.map((k,i) => <span key={i} className="px-2 py-1 rounded bg-destructive/20 text-destructive text-xs font-mono">{k}</span>)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants} className="md:col-span-2">
                <Card className="glass-panel border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Briefcase className="w-5 h-5 text-secondary" /> Business Insights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="leading-relaxed">{analysis.businessInsights}</p>
                  </CardContent>
                </Card>
              </motion.div>

              {analysis.mlDetails && (
                <motion.div variants={itemVariants} className="md:col-span-2">
                  <Card className="glass-panel border-primary/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-primary">
                        <Activity className="w-5 h-5" /> Machine Learning Details
                      </CardTitle>
                      <CardDescription>
                        Evaluation metrics and classification performance of the sentiment analyzer model.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 rounded-lg bg-muted/30 border border-border/50 col-span-2 md:col-span-4 flex flex-col md:flex-row md:items-center justify-between gap-2">
                          <span className="text-sm font-medium text-muted-foreground">Model Architecture</span>
                          <span className="text-sm font-bold font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                            {analysis.mlDetails.modelName}
                          </span>
                        </div>
                        
                        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Training Accuracy</div>
                          <div className="text-2xl font-bold font-mono text-foreground">
                            {(analysis.mlDetails.trainingAccuracy * 100).toFixed(1)}%
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Testing Accuracy</div>
                          <div className="text-2xl font-bold font-mono text-foreground">
                            {(analysis.mlDetails.testingAccuracy * 100).toFixed(1)}%
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Precision</div>
                          <div className="text-2xl font-bold font-mono text-foreground">
                            {(analysis.mlDetails.precision * 100).toFixed(1)}%
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Recall</div>
                          <div className="text-2xl font-bold font-mono text-foreground">
                            {(analysis.mlDetails.recall * 100).toFixed(1)}%
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">F1 Score</div>
                          <div className="text-2xl font-bold font-mono text-foreground">
                            {(analysis.mlDetails.f1Score * 100).toFixed(1)}%
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-muted/30 border border-border/50 col-span-1 md:col-span-3">
                          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Prediction Time (Latency)</div>
                          <div className="text-2xl font-bold font-mono text-secondary">
                            {analysis.mlDetails.predictionTimeMs} <span className="text-sm font-sans font-normal text-muted-foreground ml-1">ms</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </motion.div>
          </TabsContent>


          {/* TAB: CHARTS */}
          <TabsContent value="charts" className="space-y-6 print:block">
            <h2 className="text-2xl font-bold mb-4 print-only hidden">Data & Charts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <Card className="glass-panel">
                <CardHeader><CardTitle>Rating Distribution</CardTitle></CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ratingBarData} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="stars" type="category" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip 
                        cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="glass-panel">
                <CardHeader><CardTitle>Sentiment Timeline</CardTitle></CardHeader>
                <CardContent className="h-[300px]">
                  {timeline.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={timeline} margin={{ left: -20, right: 20, top: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                        <Line type="monotone" dataKey="positive" stroke="hsl(var(--chart-3))" strokeWidth={3} dot={false} />
                        <Line type="monotone" dataKey="negative" stroke="hsl(var(--destructive))" strokeWidth={3} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">Not enough date data</div>
                  )}
                </CardContent>
              </Card>

              {/* Keyword Word Cloud Simulation */}
              <Card className="glass-panel md:col-span-2">
                <CardHeader><CardTitle>Theme Cloud</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center justify-center gap-4 p-8 min-h-[200px]">
                    {posKeywords.map((k,i) => (
                      <span key={`p-${i}`} className="font-bold text-green-500 opacity-90" style={{ fontSize: `${Math.max(1, 3 - i*0.2)}rem` }}>{k}</span>
                    ))}
                    {negKeywords.map((k,i) => (
                      <span key={`n-${i}`} className="font-bold text-destructive opacity-90" style={{ fontSize: `${Math.max(1, 2.5 - i*0.2)}rem` }}>{k}</span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB: PREDICTIONS */}
          <TabsContent value="predictions" className="space-y-6 print:block">
            <h2 className="text-2xl font-bold mb-4 print-only hidden">Predictions</h2>
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              <motion.div variants={itemVariants} className="md:col-span-3">
                <Card className="glass-panel border-secondary/30 bg-secondary/5 shadow-md">
                  <CardHeader>
                    <CardTitle className="text-secondary text-xl">AI Recommendation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-medium">{analysis.predBuyRecommendation}</p>
                  </CardContent>
                </Card>
              </motion.div>
              
              <motion.div variants={itemVariants}>
                <ScoreBadge label="Next Month Expected Rating" value={analysis.predExpectedRating} suffix="/5.0" className="py-8" />
              </motion.div>
              <motion.div variants={itemVariants}>
                <ScoreBadge label="Satisfaction Score" value={analysis.predSatisfactionScore} suffix="/100" className="py-8" />
              </motion.div>
              <motion.div variants={itemVariants}>
                <ScoreBadge label="Risk Factor" value={analysis.predRiskScore} suffix="/100" className="py-8 border-destructive/30" valueClass={analysis.predRiskScore && analysis.predRiskScore > 50 ? "text-destructive" : "text-yellow-500"} />
              </motion.div>
            </motion.div>
          </TabsContent>
 
          {/* TAB: REVIEWS */}
          <TabsContent value="reviews" className="print:block no-print">
            <h2 className="text-2xl font-bold mb-4 print-only hidden">Raw Reviews</h2>
            <Card className="glass-panel shadow-md">
              <CardContent className="p-0">
                {reviewsLoading ? (
                  <div className="p-8 space-y-4">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : reviewsData && reviewsData.items.length > 0 ? (
                  <div className="divide-y divide-border/50">
                    {reviewsData.items.slice(0, visibleCount).map((r, i) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: Math.min(i, 6) * 0.05 }}
                        key={r.id} 
                        className="p-6 hover:bg-muted/10 transition-colors"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                            r.sentiment === 'positive' ? 'bg-green-500/20 text-green-500' :
                            r.sentiment === 'negative' ? 'bg-destructive/20 text-destructive' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {r.sentiment}
                          </span>
                          {r.rating && (
                            <span className="flex items-center text-yellow-500 text-sm font-bold">
                              <Star className="w-4 h-4 mr-1 fill-current" /> {r.rating}
                            </span>
                          )}
                          {r.reviewDate && <span className="text-xs text-muted-foreground font-mono">{r.reviewDate}</span>}
                        </div>
                        <p className="text-foreground/90 leading-relaxed">{r.text}</p>
                      </motion.div>
                    ))}

                    {/* Loader trigger ref element */}
                    {visibleCount < reviewsData.items.length && (
                      <div ref={loadMoreRef} className="py-8 flex justify-center items-center gap-2 text-muted-foreground text-sm border-t border-border/50">
                        <Loader2 className="w-4.5 h-4.5 animate-spin text-primary" />
                        <span>Loading more reviews...</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-16 text-center text-muted-foreground flex flex-col items-center">
                    <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center mb-4 text-muted-foreground/60 shadow-sm animate-pulse">
                      <FileText className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-foreground mb-1">No reviews found</p>
                    <p className="text-xs text-muted-foreground max-w-sm">This product currently does not have any processed reviews.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}

// Helper component
function ScoreBadge({ label, value, suffix = "", isScore = false, className = "", valueClass = "" }: any) {
  if (value === null || value === undefined) return null;
  
  // Format score based on value if it's the main sentiment score
  let displayValue = value;
  let colorClass = valueClass || "text-foreground";
  
  if (isScore) {
    // Map from [-1, 1] to [0, 100]
    displayValue = Math.round(((value + 1) / 2) * 100 * 10) / 10;
    if (displayValue > 70) colorClass = "text-green-500";
    else if (displayValue < 40) colorClass = "text-destructive";
    else colorClass = "text-yellow-500";
  }

  return (
    <div className={`flex flex-col p-4 rounded-xl border border-border/50 bg-background/50 ${className}`}>
      <span className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</span>
      <span className={`text-3xl font-bold font-mono ${colorClass}`}>
        <CountUp value={displayValue} />
        <span className="text-lg text-muted-foreground ml-1">{suffix}</span>
      </span>
    </div>
  );
}
