import React, { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, TrendingUp, TrendingDown, Star, Brain, Briefcase, Target } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export default function SharedPage() {
  const { token } = useParams<{ token: string }>();
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const backendUrl = "https://reviewsense-api-pu7k.onrender.com";
    const url = `${backendUrl}/api/shared/${token}`;
    console.log("Share URL:", url);

    fetch(url)
      .then(async (response) => {
        if (!response.ok) {
          const errText = await response.text();
          console.log("Error response text:", errText);
          throw new Error("This link is invalid or has been removed.");
        }
        return response.json();
      })
      .then(setAnalysis)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-2xl p-8 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    </div>
  );

  if (error || !analysis) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center p-8">
      <Activity className="w-16 h-16 text-primary mb-4" />
      <h2 className="text-2xl font-bold mb-2">Link not found</h2>
      <p className="text-muted-foreground mb-6">{error ?? "This shared analysis doesn't exist."}</p>
      <Link href="/" className="text-primary underline">Go to ReviewSense</Link>
    </div>
  );

  let posKeywords: string[] = [];
  let negKeywords: string[] = [];
  try {
    if (analysis.positiveKeywords) posKeywords = JSON.parse(analysis.positiveKeywords);
    if (analysis.negativeKeywords) negKeywords = JSON.parse(analysis.negativeKeywords);
  } catch {}

  const pieData = [
    { name: "Positive", value: analysis.positivePct, color: "hsl(var(--chart-3))" },
    { name: "Neutral",  value: analysis.neutralPct,  color: "hsl(var(--chart-4))" },
    { name: "Negative", value: analysis.negativePct, color: "hsl(var(--destructive))" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <nav className="border-b border-border/50 px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-primary font-bold text-lg">
          <Activity className="w-5 h-5" /> ReviewSense
        </Link>
        <span className="text-xs text-muted-foreground px-3 py-1 rounded-full border border-border">Shared Report</span>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        {/* Hero */}
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-8">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {analysis.productImageUrl ? (
              <img src={analysis.productImageUrl} alt={analysis.productName} className="w-32 h-32 rounded-xl bg-white border p-2 object-contain" />
            ) : (
              <div className="w-32 h-32 rounded-xl bg-muted border flex items-center justify-center shrink-0">
                <Target className="w-10 h-10 text-muted-foreground/30" />
              </div>
            )}
            <div className="flex-1">
              {analysis.productBrand && <p className="text-xs font-bold text-primary uppercase tracking-wider">{analysis.productBrand}</p>}
              <h1 className="text-3xl font-bold mt-1">{analysis.productName}</h1>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                {analysis.productCategory && <span>{analysis.productCategory}</span>}
                {analysis.productPrice && <span>• {analysis.productPrice}</span>}
                <span>• {analysis.reviewCount} reviews</span>
              </div>
              <div className="flex flex-wrap gap-3 mt-4">
                {analysis.avgRating != null && (
                  <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border bg-background/50 text-sm font-mono font-bold">
                    <Star className="w-4 h-4 text-yellow-500" /> {analysis.avgRating.toFixed(1)} / 5.0
                  </span>
                )}
                {analysis.sentimentScore != null && (
                  <span className="px-3 py-1.5 rounded-xl border border-primary/30 bg-primary/10 text-primary text-sm font-mono font-bold">
                    AI Score {analysis.sentimentScore.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
            <div className="w-40 h-40 shrink-0 relative flex items-center justify-center rounded-full border border-border/50 bg-background/50">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={68} paddingAngle={4} dataKey="value" stroke="none">
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-primary">{Math.round(analysis.positivePct)}%</span>
                <span className="text-xs text-muted-foreground uppercase">Positive</span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        {analysis.overallSummary && (
          <Card className="glass-panel border-primary/20">
            <CardHeader><CardTitle className="flex items-center gap-2"><Brain className="w-5 h-5 text-primary" /> The Bottom Line</CardTitle></CardHeader>
            <CardContent><p className="text-lg leading-relaxed">{analysis.overallSummary}</p></CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {analysis.strengths && (
            <Card className="glass-panel border-green-500/20 bg-green-500/5">
              <CardHeader><CardTitle className="flex items-center gap-2 text-green-500"><TrendingUp className="w-5 h-5" /> Strengths</CardTitle></CardHeader>
              <CardContent>
                <p className="leading-relaxed">{analysis.strengths}</p>
                {posKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {posKeywords.map((k: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-green-500/20 text-green-500 text-xs font-mono">{k}</span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          {analysis.weaknesses && (
            <Card className="glass-panel border-destructive/20 bg-destructive/5">
              <CardHeader><CardTitle className="flex items-center gap-2 text-destructive"><TrendingDown className="w-5 h-5" /> Weaknesses</CardTitle></CardHeader>
              <CardContent>
                <p className="leading-relaxed">{analysis.weaknesses}</p>
                {negKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {negKeywords.map((k: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-destructive/20 text-destructive text-xs font-mono">{k}</span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {analysis.businessInsights && (
          <Card className="glass-panel">
            <CardHeader><CardTitle className="flex items-center gap-2"><Briefcase className="w-5 h-5 text-secondary" /> Business Insights</CardTitle></CardHeader>
            <CardContent><p className="leading-relaxed">{analysis.businessInsights}</p></CardContent>
          </Card>
        )}

        <div className="text-center pt-4 border-t border-border/50">
          <p className="text-sm text-muted-foreground mb-3">Want to analyze your own products?</p>
          <Link href="/signup" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors">
            Try ReviewSense for free
          </Link>
        </div>
      </div>
    </div>
  );
}
