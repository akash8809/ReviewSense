import React from "react";
import { SidebarLayout } from "@/components/sidebar-layout";
import { useParams, Link } from "wouter";
import { 
  useGetAnalysis, 
  getGetAnalysisQueryKey,
  useGetAnalysisReviews,
  getGetAnalysisReviewsQueryKey,
  Analysis,
  Review
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Activity, Star, TrendingUp, TrendingDown, Minus, Download, ArrowLeft,
  AlertTriangle, Brain, Target, MessageSquare, Briefcase,
  FileText
} from "lucide-react";
import { motion } from "framer-motion";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line 
} from "recharts";

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const analysisId = parseInt(id, 10);

  const { data: analysis, isLoading: analysisLoading } = useGetAnalysis(analysisId, {
    query: { queryKey: getGetAnalysisQueryKey(analysisId) }
  });

  const { data: reviewsData, isLoading: reviewsLoading } = useGetAnalysisReviews(analysisId, {
    query: { queryKey: getGetAnalysisReviewsQueryKey(analysisId) }
  });

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
      <SidebarLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Card className="glass-panel"><CardContent className="h-64 flex items-center justify-center"><Activity className="w-12 h-12 text-primary animate-spin" /></CardContent></Card>
        </div>
      </SidebarLayout>
    );
  }

  if (!analysis) {
    return (
      <SidebarLayout>
        <div className="p-12 text-center text-destructive">Failed to load analysis.</div>
      </SidebarLayout>
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
    <SidebarLayout>
      <div id="pdf-content" className="space-y-8 print:space-y-4">
        {/* Header Actions */}
        <div className="flex items-center justify-between no-print">
          <Button variant="ghost" className="text-muted-foreground" asChild>
            <Link href="/dashboard"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Link>
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleCsvExport} disabled={reviewsLoading} data-testid="btn-export-csv">
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
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
              <div className="w-32 h-32 md:w-48 md:h-48 rounded-xl bg-white border p-2 shrink-0 flex items-center justify-center">
                <img src={analysis.productImageUrl} alt={analysis.productName} className="max-w-full max-h-full object-contain mix-blend-multiply" />
              </div>
            ) : (
              <div className="w-32 h-32 md:w-48 md:h-48 rounded-xl bg-muted border flex items-center justify-center shrink-0">
                <Target className="w-12 h-12 text-muted-foreground/30" />
              </div>
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
                <ScoreBadge label="Confidence" value={analysis.aiConfidence} suffix="%" />
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
                <span className="text-3xl font-bold text-primary">{Math.round(analysis.positivePct)}%</span>
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="glass-panel border-primary/20 md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Brain className="w-5 h-5 text-primary" /> The Bottom Line</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg leading-relaxed text-foreground/90">{analysis.overallSummary}</p>
                </CardContent>
              </Card>

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

              <Card className="glass-panel border-border/50 md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Briefcase className="w-5 h-5 text-secondary" /> Business Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="leading-relaxed">{analysis.businessInsights}</p>
                </CardContent>
              </Card>
            </div>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="glass-panel border-secondary/30 bg-secondary/5 md:col-span-3">
                <CardHeader>
                  <CardTitle className="text-secondary text-xl">AI Recommendation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-medium">{analysis.predBuyRecommendation}</p>
                </CardContent>
              </Card>
              
              <ScoreBadge label="Next Month Expected Rating" value={analysis.predExpectedRating} suffix="/5.0" className="py-8" />
              <ScoreBadge label="Satisfaction Score" value={analysis.predSatisfactionScore} suffix="/100" className="py-8" />
              <ScoreBadge label="Risk Factor" value={analysis.predRiskScore} suffix="/100" className="py-8 border-destructive/30" valueClass={analysis.predRiskScore && analysis.predRiskScore > 50 ? "text-destructive" : "text-yellow-500"} />
            </div>
          </TabsContent>

          {/* TAB: REVIEWS */}
          <TabsContent value="reviews" className="print:block no-print">
            <h2 className="text-2xl font-bold mb-4 print-only hidden">Raw Reviews</h2>
            <Card className="glass-panel">
              <CardContent className="p-0">
                {reviewsLoading ? (
                  <div className="p-8 space-y-4">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : reviewsData && reviewsData.items.length > 0 ? (
                  <div className="divide-y divide-border/50">
                    {reviewsData.items.map((r) => (
                      <div key={r.id} className="p-6 hover:bg-muted/10 transition-colors">
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
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center text-muted-foreground">No reviews available.</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SidebarLayout>
  );
}

// Helper component
function ScoreBadge({ label, value, suffix = "", isScore = false, className = "", valueClass = "" }: any) {
  if (value === null || value === undefined) return null;
  
  // Format score based on value if it's the main sentiment score
  let displayValue = value;
  let colorClass = valueClass || "text-foreground";
  
  if (isScore) {
    if (value > 70) colorClass = "text-green-500";
    else if (value < 40) colorClass = "text-destructive";
    else colorClass = "text-yellow-500";
  }

  return (
    <div className={`flex flex-col p-4 rounded-xl border border-border/50 bg-background/50 ${className}`}>
      <span className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</span>
      <span className={`text-3xl font-bold font-mono ${colorClass}`}>
        {typeof displayValue === 'number' ? (displayValue % 1 === 0 ? displayValue : displayValue.toFixed(1)) : displayValue}
        <span className="text-lg text-muted-foreground ml-1">{suffix}</span>
      </span>
    </div>
  );
}
